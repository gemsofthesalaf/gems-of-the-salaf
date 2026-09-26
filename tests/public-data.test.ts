// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createPublicClient: vi.fn() }))

import { createPublicClient } from '@/lib/supabase/server'
import { getDirectory, getHomeData, getPublishedQuoteCount, getQuoteBySlug, getQuoteFilterOptions, getSitemapRecordCounts, getSitemapRecordsPage, searchQuotes } from '@/data/public'
import { GET as sitemapIndex } from '@/app/sitemap.xml/route'
import { GET as sitemapChunk } from '@/app/sitemaps/[id]/route'

type Row = Record<string, unknown>
const requests: Array<{ url: URL; init?: RequestInit }> = []
let tables: Record<string, Row[]>
let cap: number
let missingCount: boolean
let failOffset: number | undefined
let failDirectoryRpc = false
let searchRows: Row[]

function record(id: number): Row {
  return {
    id: String(id).padStart(6, '0'), slug: `record-${id}`, name: 'Same name', english_name: 'Same name', title: 'Same name',
    updated_at: '2026-01-01T00:00:00Z', quotes: [{ count: 1234 }], quote_categories: [{ count: 1234 }],
  }
}

function searchRow(id: number, total: number): Row {
  return { ...record(id), english_text: 'Public quote', scholar_id: 'scholar', scholar_name: 'Scholar', scholar_slug: 'scholar', total_count: total }
}

beforeEach(() => {
  requests.length = 0
  cap = 1000
  missingCount = false
  failOffset = undefined
  failDirectoryRpc = false
  searchRows = []
  tables = { quotes: [], scholars: [], categories: [], sources: [], translators: [], tags: [] }
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    requests.push({ url, init })
    if (url.pathname.includes('/rpc/')) {
      const args = JSON.parse(String(init?.body))
      if (args.p_kind) {
        if (failDirectoryRpc) return Response.json({ message: 'directory RPC failed' }, { status: 500 })
        const sourceRows = tables[args.p_kind] ?? []
        const rows = sourceRows.slice(args.p_offset, args.p_offset + args.p_limit).map(row => ({
          id: row.id, slug: row.slug, name: row.name ?? row.english_name ?? row.title,
          arabic_name: row.arabic_name ?? null, secondary: null, description: null,
          quote_count: 1234, updated_at: row.updated_at, total_count: sourceRows.length,
        }))
        return Response.json(args.p_offset === failOffset ? [] : rows)
      }
      const rows = args.p_offset === failOffset ? [] : searchRows.slice(args.p_offset, args.p_offset + Math.min(cap, args.p_limit))
      return Response.json(rows)
    }
    const rows = tables[url.pathname.split('/').at(-1)!] ?? []
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const limit = Number(url.searchParams.get('limit') ?? cap)
    const headers: Record<string, string> = missingCount ? {} : { 'content-range': `*/${rows.length}` }
    if (init?.method === 'HEAD') return new Response(null, { headers })
    if (offset > 0 && offset >= rows.length) {
      return Response.json({ code: 'PGRST103', message: 'Requested range not satisfiable' }, { status: 416, headers })
    }
    const result = offset === failOffset ? [] : rows.slice(offset, offset + Math.min(limit, cap))
    return Response.json(result, { headers })
  })
  vi.mocked(createPublicClient).mockReturnValue(createClient<Database>('https://public-test.invalid', 'test-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchMock },
  }))
})

describe('public search pagination', () => {
  it('fills pages under a low PostgREST cap without skipping rows', async () => {
    cap = 2
    searchRows = Array.from({ length: 11 }, (_, i) => searchRow(i, 11))
    const result = await searchQuotes({ q: 'علم', scholar: 'scholar', tag: 'tag', sort: 'oldest', page: 2 }, 5)
    expect(result).toMatchObject({ ok: true, data: { total: 11, page: 2, pageSize: 5, totalPages: 3 } })
    if (result.ok) expect(result.data.items.map(row => row.id)).toEqual(['000005', '000006', '000007', '000008', '000009'])
    expect(requests.map(({ init }) => JSON.parse(String(init?.body)).p_offset)).toEqual([5, 7, 9])
    for (const { init } of requests) expect(JSON.parse(String(init?.body))).toMatchObject({ p_search: 'علم', p_scholar_slug: 'scholar', p_tag_slug: 'tag', p_sort: 'oldest' })
  })

  it('recovers the total for an empty out-of-range search page', async () => {
    searchRows = Array.from({ length: 7 }, (_, i) => searchRow(i, 7))
    expect(await searchQuotes({ q: '', sort: 'latest', page: 5 }, 3)).toMatchObject({ ok: true, data: { items: [], total: 7, totalPages: 3 } })
  })

  it('returns a short final page with the full archive count', async () => {
    cap = 2
    searchRows = Array.from({ length: 7 }, (_, i) => searchRow(i, 7))
    const result = await searchQuotes({ q: '', sort: 'latest', page: 2 }, 5)
    expect(result).toMatchObject({ ok: true, data: { total: 7, totalPages: 2 } })
    if (result.ok) expect(result.data.items.map(row => row.id)).toEqual(['000005', '000006'])
    expect(requests).toHaveLength(1)
  })

  it('handles an empty search without a count-bearing row', async () => {
    expect(await searchQuotes({ q: '', sort: 'latest', page: 1 })).toMatchObject({ ok: true, data: { total: 0, items: [], totalPages: 1 } })
  })

  it('fails instead of serving an incomplete search page', async () => {
    cap = 2
    failOffset = 2
    searchRows = Array.from({ length: 7 }, (_, i) => searchRow(i, 7))
    expect(await searchQuotes({ q: '', sort: 'latest', page: 1 }, 5)).toMatchObject({ ok: false })
  })
})

describe('public directory pagination and counts', () => {
  it.each(['scholars', 'categories', 'sources', 'translators'] as const)('loads %s through the restricted directory RPC', async kind => {
    cap = 2
    tables[kind] = Array.from({ length: 11 }, (_, i) => record(i))
    const result = await getDirectory(kind, '50%_\\', 2, 5)
    expect(result).toMatchObject({ ok: true, data: { total: 11, totalPages: 3, page: 2 } })
    if (result.ok) {
      expect(result.data.items.map(row => row.id)).toEqual(['000005', '000006', '000007', '000008', '000009'])
      expect(result.data.items[0].quoteCount).toBe(1234)
    }
    for (const { url, init } of requests) {
      expect(url.pathname).toContain('/rpc/get_public_directory')
      expect(JSON.parse(String(init?.body))).toMatchObject({
        p_kind: kind, p_search: '50%_\\', p_offset: 5, p_limit: 5,
      })
    }
  })

  it('recovers the total on an out-of-range page so the UI can redirect', async () => {
    tables.scholars = [record(1), record(2)]
    expect(await getDirectory('scholars', '', 5)).toMatchObject({ ok: true, data: { items: [], total: 2, totalPages: 1 } })
    expect(requests).toHaveLength(2)
    expect(JSON.parse(String(requests[1].init?.body))).toMatchObject({ p_offset: 0, p_limit: 1 })
  })

  it('uses the RPC total even when the directory has no quote-count rows', async () => {
    tables.scholars = [record(1)]
    const result = await getDirectory('scholars', '', 1)
    expect(result).toMatchObject({ ok: true, data: { total: 1 } })
  })

  it('surfaces directory RPC failures instead of disguising them as empty results', async () => {
    failDirectoryRpc = true
    expect(await getDirectory('scholars', '', 1, 5)).toMatchObject({ ok: false })
  })
})

describe('public options and sitemap batches', () => {
  it('retrieves more than 1,000 options, including when the server cap is smaller', async () => {
    cap = 173
    for (const kind of ['scholars', 'categories', 'sources', 'translators', 'tags']) tables[kind] = Array.from({ length: 1205 }, (_, i) => record(i))
    const result = await getQuoteFilterOptions()
    expect(result.ok).toBe(true)
    if (result.ok) for (const options of Object.values(result.data)) {
      expect(options).toHaveLength(1205)
      expect(new Set(options.map(row => row.id)).size).toBe(1205)
    }
    for (const { url } of requests) expect(url.searchParams.get('order')).toMatch(/,id.asc$/)
  })

  it('fills sitemap slices across segment boundaries under the row cap', async () => {
    cap = 137
    tables.quotes = Array.from({ length: 1205 }, (_, i) => record(i))
    tables.scholars = Array.from({ length: 1205 }, (_, i) => record(i))
    const result = await getSitemapRecordsPage(1000, 1000, { quotes: 1205, scholars: 1205, categories: 0, sources: 0, translators: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.quotes).toHaveLength(205)
      expect(result.data.scholars).toHaveLength(795)
      expect(result.data.quotes[0].slug).toBe('record-1000')
      expect(result.data.scholars.at(-1)?.slug).toBe('record-794')
    }
    for (const { url } of requests) expect(url.searchParams.get('order')).toBe('id.asc')
  })

  it('renders every record exactly once across full sitemap chunks', async () => {
    cap = 733
    tables.quotes = Array.from({ length: 1205 }, (_, i) => record(i))
    tables.scholars = Array.from({ length: 35005 }, (_, i) => record(i))
    tables.categories = [record(1)]
    tables.sources = [record(1)]
    tables.translators = [record(1)]
    const index = await sitemapIndex()
    expect(index.status).toBe(200)
    expect((await index.text()).match(/<sitemap>/g)).toHaveLength(2)
    const locations: string[] = []
    for (const id of ['0', '1']) {
      const response = await sitemapChunk(new Request(`https://example.com/sitemaps/${id}`), { params: Promise.resolve({ id }) })
      expect(response.status).toBe(200)
      const urls = [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])
      expect(urls).toHaveLength(id === '0' ? 35007 : 1213)
      locations.push(...urls)
    }
    expect(new Set(locations).size).toBe(36220)
    expect(locations.some(url => url.endsWith('/scholars/record-35004'))).toBe(true)
    expect(locations.some(url => url.endsWith('/translators/record-1'))).toBe(true)
  })

  it('does not return truncated filter options or unknown sitemap counts', async () => {
    missingCount = true
    expect(await getQuoteFilterOptions()).toMatchObject({ ok: false })
    expect(await getSitemapRecordCounts()).toMatchObject({ ok: false })
  })

  it('fails a sitemap when its expected records disappear', async () => {
    expect(await getSitemapRecordsPage(0, 100, { quotes: 1, scholars: 0, categories: 0, sources: 0, translators: 0 })).toMatchObject({ ok: false })
  })

  it('counts all visible segments using explicit public columns', async () => {
    tables.quotes = [record(1), record(2)]
    tables.scholars = [record(1)]
    expect(await getSitemapRecordCounts()).toEqual({ ok: true, data: { quotes: 2, scholars: 1, categories: 0, sources: 0, translators: 0 } })
    for (const { url, init } of requests) {
      expect(init?.method).toBe('HEAD')
      expect(url.searchParams.get('select')).toBe('id')
      expect(url.searchParams.get(url.pathname.endsWith('/quotes') ? 'status' : 'is_archived')).toBe(url.pathname.endsWith('/quotes') ? 'eq.published' : 'eq.false')
    }
  })
})

describe('public quote boundary', () => {
  it('never requests private quote columns, including counts and featured quotes', async () => {
    await getQuoteBySlug('example')
    await getPublishedQuoteCount()
    await getHomeData()
    const quoteRequests = requests.filter(({ url }) => url.pathname.endsWith('/quotes'))
    expect(quoteRequests.length).toBeGreaterThanOrEqual(3)
    for (const { url } of quoteRequests) {
      expect(url.searchParams.get('select')).not.toMatch(/\*|admin_notes|search_vector|created_by|updated_by/)
      expect(url.searchParams.get('status')).toBe('eq.published')
    }
    expect(quoteRequests.find(({ url }) => url.searchParams.has('featured'))?.url.searchParams.get('order')).toBe('published_at.desc.nullslast,id.asc')
  })

  it('does not turn an unknown published count into zero', async () => {
    missingCount = true
    expect(await getPublishedQuoteCount()).toMatchObject({ ok: false })
  })

  it('returns a generic failure if client construction fails', async () => {
    vi.mocked(createPublicClient).mockImplementation(() => { throw new Error('private configuration detail') })
    expect(await getPublishedQuoteCount()).toEqual({ ok: false, message: 'The archive database is temporarily unavailable. Please try again shortly.' })
  })
})
