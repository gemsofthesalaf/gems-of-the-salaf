// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SITEMAP_PAGE_SIZE } from '@/lib/sitemap'

vi.mock('@/data/public', () => ({ getSitemapRecordCounts: vi.fn(), getSitemapRecordsPage: vi.fn() }))
vi.mock('@/lib/site', () => ({ getSiteUrl: () => 'https://example.com' }))
import { getSitemapRecordCounts, getSitemapRecordsPage } from '@/data/public'
import { GET as index } from '@/app/sitemap.xml/route'
import { GET as chunk } from '@/app/sitemaps/[id]/route'

const counts = { quotes: 0, scholars: 0, categories: 0, sources: 0, translators: 0 }
const records = { quotes: [], scholars: [], categories: [], sources: [], translators: [] }
const requestChunk = (id: string) => chunk(new Request(`https://example.com/sitemaps/${id}`), { params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.mocked(getSitemapRecordCounts).mockReset().mockResolvedValue({ ok: true, data: { ...counts } })
  vi.mocked(getSitemapRecordsPage).mockReset().mockResolvedValue({ ok: true, data: { ...records } })
})

describe('public sitemap HTTP routes', () => {
  it('includes large directories in chunk counts even without quotes', async () => {
    vi.mocked(getSitemapRecordCounts).mockResolvedValue({ ok: true, data: { ...counts, scholars: SITEMAP_PAGE_SIZE + 1 } })
    const response = await index()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/xml')
    const xml = await response.text()
    expect(xml.match(/<sitemap>/g)).toHaveLength(2)
    expect(xml).toContain('/sitemaps/1</loc>')
    expect((await requestChunk('1')).status).toBe(200)
    expect(getSitemapRecordsPage).toHaveBeenCalledWith(SITEMAP_PAGE_SIZE, SITEMAP_PAGE_SIZE, { ...counts, scholars: SITEMAP_PAGE_SIZE + 1 })
  })

  it('includes static pages only in the first chunk', async () => {
    vi.mocked(getSitemapRecordCounts).mockResolvedValue({ ok: true, data: { ...counts, quotes: SITEMAP_PAGE_SIZE + 1 } })
    const first = await (await requestChunk('0')).text()
    const second = await (await requestChunk('1')).text()
    expect(first.match(/<url>/g)).toHaveLength(7)
    expect(first).toContain('/about</loc>')
    expect(second).not.toContain('/about</loc>')
    expect(first).not.toContain('/admin')
  })

  it.each(['-1', '1abc', '01', '1.5', '1e2', '9007199254740992'])('rejects invalid chunk ID %s without querying', async id => {
    expect((await requestChunk(id)).status).toBe(404)
    expect(getSitemapRecordCounts).not.toHaveBeenCalled()
  })

  it('returns 404 for a valid integer beyond the last chunk', async () => {
    expect((await requestChunk('1')).status).toBe(404)
    expect(getSitemapRecordsPage).not.toHaveBeenCalled()
  })

  it('keeps a static sitemap available when the archive is empty', async () => {
    expect((await index()).status).toBe(200)
    const response = await requestChunk('0')
    expect(response.status).toBe(200)
    expect((await response.text()).match(/<url>/g)).toHaveLength(7)
  })

  it('serves uncached 503 responses when counts are unavailable', async () => {
    vi.mocked(getSitemapRecordCounts).mockResolvedValue({ ok: false, message: 'private database error' })
    for (const response of [await index(), await requestChunk('0')]) {
      expect(response.status).toBe(503)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('retry-after')).toBe('60')
      expect(await response.text()).not.toContain('private')
    }
    expect(getSitemapRecordsPage).not.toHaveBeenCalled()
  })

  it('does not cache a partial sitemap after a record query fails', async () => {
    vi.mocked(getSitemapRecordsPage).mockResolvedValue({ ok: false, message: 'private database error' })
    const response = await requestChunk('0')
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).not.toContain('<urlset')
  })

  it('encodes legacy slugs as one path segment and renders every directory type', async () => {
    const record = { slug: 'legacy?x=1&y=2/#<', updated_at: '2026-01-01T00:00:00Z' }
    vi.mocked(getSitemapRecordsPage).mockResolvedValue({ ok: true, data: {
      quotes: [record], scholars: [record], categories: [record], sources: [record], translators: [record],
    } })
    const response = await requestChunk('0')
    const xml = await response.text()
    for (const segment of Object.keys(counts)) expect(xml).toContain(`/${segment}/${encodeURIComponent(record.slug)}</loc>`)
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>')
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600')
  })
})
