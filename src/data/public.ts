import 'server-only'

import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublicClient } from '@/lib/supabase/server'
import type { Database, QuoteStatus } from '@/lib/supabase/types'
import type { QuoteSearchParams } from '@/lib/validation'
import { SITEMAP_SEGMENTS, type SitemapRecordCounts, type SitemapSegment } from '@/lib/sitemap'

export type DataResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

const unavailable = <T>(): DataResult<T> => ({
  ok: false,
  message: 'The archive database is temporarily unavailable. Please try again shortly.',
})

async function withPublicClient<T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>,
): Promise<DataResult<T>> {
  try {
    const client = createPublicClient()
    if (!client) return unavailable()
    return { ok: true, data: await operation(client) }
  } catch {
    return unavailable()
  }
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error('Database query failed')
}

function requireCount(count: number | null): number {
  if (count === null || !Number.isSafeInteger(count) || count < 0) throw new Error('Missing or invalid count')
  return count
}

function pageOffset(page: number, pageSize: number): number {
  const offset = (page - 1) * pageSize
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1
    || !Number.isSafeInteger(offset) || offset > 2_147_483_647) throw new Error('Invalid page')
  return offset
}

export type QuoteListItem = {
  id: string
  slug: string
  arabicText: string | null
  englishText: string
  book: string | null
  featured: boolean
  publishedAt: string | null
  scholar: { id: string; name: string; slug: string; deathYear: string | null }
  source: { id: string; title: string; slug: string } | null
  translator: { id: string; name: string; slug: string } | null
}

export type QuoteSearchResult = {
  items: QuoteListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type SearchQuoteRow = Database['public']['Functions']['search_published_quotes']['Returns'][number]

function mapSearchRow(row: SearchQuoteRow): QuoteListItem {
  return {
    id: row.id,
    slug: row.slug,
    arabicText: row.arabic_text,
    englishText: row.english_text,
    book: row.book,
    featured: row.featured,
    publishedAt: row.published_at,
    scholar: {
      id: row.scholar_id,
      name: row.scholar_name,
      slug: row.scholar_slug,
      deathYear: row.scholar_death_year,
    },
    source: row.source_id && row.source_title && row.source_slug
      ? { id: row.source_id, title: row.source_title, slug: row.source_slug }
      : null,
    translator: row.translator_id && row.translator_name && row.translator_slug
      ? { id: row.translator_id, name: row.translator_name, slug: row.translator_slug }
      : null,
  }
}

async function runQuoteSearch(
  client: SupabaseClient<Database>,
  params: QuoteSearchParams,
  pageSize: number,
): Promise<QuoteSearchResult> {
  const offset = pageOffset(params.page, pageSize)
  const args = {
    p_search: params.q || null,
    p_scholar_slug: params.scholar ?? null,
    p_category_slug: params.category ?? null,
    p_source_slug: params.source ?? null,
    p_translator_slug: params.translator ?? null,
    p_tag_slug: params.tag ?? null,
    p_sort: params.sort,
  }
  const rows: SearchQuoteRow[] = []
  let total: number | undefined
  do {
    const { data, error } = await client.rpc('search_published_quotes', {
      ...args, p_offset: offset + rows.length, p_limit: pageSize - rows.length,
    })
    assertNoError(error)
    if (!data?.length) {
      if (rows.length) throw new Error('Incomplete search page')
      // The RPC returns its window count on each row, so empty pages need a probe.
      if (offset > 0) {
        const first = await client.rpc('search_published_quotes', { ...args, p_offset: 0, p_limit: 1 })
        assertNoError(first.error)
        total = first.data?.length ? requireCount(Number(first.data[0].total_count)) : 0
        if (offset < total) throw new Error('Incomplete search page')
      } else total = 0
      break
    }
    const batchTotal = requireCount(Number(data[0].total_count))
    if (total !== undefined && batchTotal !== total) throw new Error('Search changed while paging')
    total = batchTotal
    rows.push(...data)
  } while (rows.length < Math.min(pageSize, Math.max(0, total - offset)))

  if (rows.length > Math.min(pageSize, Math.max(0, total - offset))) {
    throw new Error('Inconsistent search count')
  }

  return {
    items: rows.map(mapSearchRow),
    total,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export function searchQuotes(params: QuoteSearchParams, pageSize = 18): Promise<DataResult<QuoteSearchResult>> {
  const size = Number.isFinite(pageSize) ? Math.min(Math.max(Math.floor(pageSize), 1), 48) : 18
  return withPublicClient((client) => runQuoteSearch(client, params, size))
}

export type FilterOption = { id: string; slug: string; label: string }

// PostgREST applies its own row cap even when a larger range is requested.
const PUBLIC_BATCH_SIZE = 1_000

type CountedQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{
    data: T[] | null; error: { message: string; code?: string } | null; count: number | null
  }>
}

async function readCountedPage<T>(query: CountedQuery<T>, offset: number, limit: number): Promise<{ data: T[]; count: number }> {
  const items: T[] = []
  let total: number | undefined
  do {
    const from = offset + items.length
    const { data, error, count } = await query.range(from, from + Math.min(PUBLIC_BATCH_SIZE, limit - items.length) - 1)
    // PostgREST reports an out-of-range offset as 416 and the client discards its count.
    if (error?.code === 'PGRST103' && offset > 0 && items.length === 0) {
      const first = await query.range(0, 0)
      assertNoError(first.error)
      total = requireCount(first.count)
      if (offset < total) throw new Error('Unexpected range failure')
      return { data: [], count: total }
    }
    assertNoError(error)
    const batchTotal = requireCount(count)
    if (total !== undefined && total !== batchTotal) throw new Error('Records changed while paging')
    total = batchTotal
    if (!data?.length) {
      if (from < total) throw new Error('Incomplete page')
      break
    }
    items.push(...data)
  } while (items.length < Math.min(limit, Math.max(0, total - offset)))
  if (items.length > Math.min(limit, Math.max(0, total - offset))) throw new Error('Inconsistent page count')
  return { data: items, count: total }
}

async function readAllOptions<T>(query: CountedQuery<T>): Promise<T[]> {
  return (await readCountedPage(query, 0, Infinity)).data
}

export type QuoteFilterOptions = {
  scholars: FilterOption[]
  categories: FilterOption[]
  sources: FilterOption[]
  translators: FilterOption[]
  tags: FilterOption[]
}

export const getQuoteFilterOptions = cache(async (): Promise<DataResult<QuoteFilterOptions>> =>
  withPublicClient(async (client) => {
    const [scholars, categories, sources, translators, tags] = await Promise.all([
      readAllOptions(client.from('scholars').select('id,slug,english_name', { count: 'exact' }).eq('is_archived', false).order('english_name').order('id')),
      readAllOptions(client.from('categories').select('id,slug,name', { count: 'exact' }).eq('is_archived', false).order('sort_order').order('name').order('id')),
      readAllOptions(client.from('sources').select('id,slug,title', { count: 'exact' }).eq('is_archived', false).order('title').order('id')),
      readAllOptions(client.from('translators').select('id,slug,name', { count: 'exact' }).eq('is_archived', false).order('name').order('id')),
      readAllOptions(client.from('tags').select('id,slug,name', { count: 'exact' }).eq('is_archived', false).order('name').order('id')),
    ])

    return {
      scholars: scholars.map((item) => ({ id: item.id, slug: item.slug, label: item.english_name })),
      categories: categories.map((item) => ({ id: item.id, slug: item.slug, label: item.name })),
      sources: sources.map((item) => ({ id: item.id, slug: item.slug, label: item.title })),
      translators: translators.map((item) => ({ id: item.id, slug: item.slug, label: item.name })),
      tags: tags.map((item) => ({ id: item.id, slug: item.slug, label: item.name })),
    }
  }),
)

type QuoteDetailRow = Pick<Database['public']['Tables']['quotes']['Row'],
  'id' | 'slug' | 'arabic_text' | 'english_text' | 'status' | 'featured' | 'book' | 'volume' | 'page' | 'chapter'
  | 'edition' | 'external_reference' | 'published_at' | 'updated_at'> & {
  scholars: {
    id: string
    english_name: string
    arabic_name: string | null
    slug: string
    death_year: string | null
  } | null
  sources: {
    id: string
    title: string
    arabic_title: string | null
    author: string | null
    slug: string
    edition: string | null
  } | null
  translators: { id: string; name: string; slug: string } | null
  quote_categories: Array<{ categories: { id: string; name: string; slug: string } | null }>
  quote_tags: Array<{ tags: { id: string; name: string; slug: string } | null }>
}

export type QuoteDetail = {
  id: string
  slug: string
  arabicText: string | null
  englishText: string
  status: QuoteStatus
  featured: boolean
  book: string | null
  volume: string | null
  page: string | null
  chapter: string | null
  edition: string | null
  externalReference: string | null
  publishedAt: string | null
  updatedAt: string
  scholar: NonNullable<QuoteDetailRow['scholars']>
  source: QuoteDetailRow['sources']
  translator: QuoteDetailRow['translators']
  categories: Array<{ id: string; name: string; slug: string }>
  tags: Array<{ id: string; name: string; slug: string }>
}

function mapQuoteDetail(row: QuoteDetailRow): QuoteDetail | null {
  if (!row.scholars) return null
  return {
    id: row.id,
    slug: row.slug,
    arabicText: row.arabic_text,
    englishText: row.english_text,
    status: row.status,
    featured: row.featured,
    book: row.book,
    volume: row.volume,
    page: row.page,
    chapter: row.chapter,
    edition: row.edition,
    externalReference: row.external_reference,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    scholar: row.scholars,
    source: row.sources,
    translator: row.translators,
    categories: row.quote_categories.flatMap((item) => item.categories ? [item.categories] : []),
    tags: row.quote_tags.flatMap((item) => item.tags ? [item.tags] : []),
  }
}

export const getQuoteBySlug = cache(async (slug: string): Promise<DataResult<QuoteDetail | null>> =>
  withPublicClient(async (client) => {
    const { data, error } = await client
      .from('quotes')
      .select(`
        id,slug,arabic_text,english_text,status,featured,book,volume,page,chapter,
        edition,external_reference,published_at,updated_at,
        scholars!inner(id,english_name,arabic_name,slug,death_year),
        sources(id,title,arabic_title,author,slug,edition),
        translators(id,name,slug),
        quote_categories(categories(id,name,slug)),
        quote_tags(tags(id,name,slug))
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    assertNoError(error)
    return data ? mapQuoteDetail(data as unknown as QuoteDetailRow) : null
  }),
)

export async function getRelatedQuotes(quote: QuoteDetail, limit = 6): Promise<DataResult<QuoteListItem[]>> {
  return withPublicClient(async (client) => {
    const base: QuoteSearchParams = { q: '', sort: 'latest', page: 1 }
    const searches: QuoteSearchParams[] = [
      { ...base, scholar: quote.scholar.slug },
      ...(quote.categories[0] ? [{ ...base, category: quote.categories[0].slug }] : []),
      ...(quote.source ? [{ ...base, source: quote.source.slug }] : []),
      ...(quote.tags[0] ? [{ ...base, tag: quote.tags[0].slug }] : []),
    ]
    const results = await Promise.all(searches.map((params) => runQuoteSearch(client, params, limit + 1)))
    const seen = new Set<string>([quote.id])
    const related: QuoteListItem[] = []
    for (const result of results) {
      for (const item of result.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          related.push(item)
          if (related.length >= limit) return related
        }
      }
    }
    return related
  })
}

export type DirectoryItem = {
  id: string
  slug: string
  name: string
  arabicName?: string | null
  secondary?: string | null
  description?: string | null
  quoteCount: number
  updatedAt: string
}

export type DirectoryResult = {
  items: DirectoryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type DirectoryKind = 'scholars' | 'categories' | 'sources' | 'translators'

export async function getDirectory(
  kind: DirectoryKind,
  search: string,
  page: number,
  pageSize = 18,
): Promise<DataResult<DirectoryResult>> {
  return withPublicClient(async (client) => {
    const offset = pageOffset(page, pageSize)
    const normalizedSearch = search.trim().slice(0, 160)
    const args = { p_kind: kind, p_search: normalizedSearch || null, p_offset: offset, p_limit: pageSize }
    const { data, error } = await client.rpc('get_public_directory', args)
    assertNoError(error)
    const rows = data ?? []
    let total = rows[0]?.total_count ?? 0

    // An out-of-range page has no row from which to read the windowed total.
    // Fetch one row only in that case so the UI can recover to the last page.
    if (rows.length === 0 && offset > 0) {
      const { data: firstPage, error: firstPageError } = await client.rpc('get_public_directory', {
        ...args, p_offset: 0, p_limit: 1,
      })
      assertNoError(firstPageError)
      total = firstPage?.[0]?.total_count ?? 0
    }

    return directoryResult(rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      arabicName: row.arabic_name,
      secondary: row.secondary,
      description: row.description,
      quoteCount: row.quote_count,
      updatedAt: row.updated_at,
    })), total, page, pageSize)
  })
}

function directoryResult(items: DirectoryItem[], total: number, page: number, pageSize: number): DirectoryResult {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export type ScholarDetail = Database['public']['Tables']['scholars']['Row']
export type CategoryDetail = Database['public']['Tables']['categories']['Row']
export type SourceDetail = Database['public']['Tables']['sources']['Row']
export type TranslatorDetail = Database['public']['Tables']['translators']['Row']

export const getScholarBySlug = cache((slug: string): Promise<DataResult<ScholarDetail | null>> =>
  getEntityBySlug('scholars', slug),
)
export const getCategoryBySlug = cache((slug: string): Promise<DataResult<CategoryDetail | null>> =>
  getEntityBySlug('categories', slug),
)
export const getSourceBySlug = cache((slug: string): Promise<DataResult<SourceDetail | null>> =>
  getEntityBySlug('sources', slug),
)
export const getTranslatorBySlug = cache((slug: string): Promise<DataResult<TranslatorDetail | null>> =>
  getEntityBySlug('translators', slug),
)

function getEntityBySlug<Table extends 'scholars' | 'categories' | 'sources' | 'translators'>(
  table: Table,
  slug: string,
): Promise<DataResult<Database['public']['Tables'][Table]['Row'] | null>> {
  return withPublicClient(async (client) => {
    const query = table === 'scholars' ? client.from('scholars').select('*').eq('slug', slug).eq('is_archived', false).maybeSingle()
      : table === 'categories' ? client.from('categories').select('*').eq('slug', slug).eq('is_archived', false).maybeSingle()
        : table === 'sources' ? client.from('sources').select('*').eq('slug', slug).eq('is_archived', false).maybeSingle()
          : client.from('translators').select('*').eq('slug', slug).eq('is_archived', false).maybeSingle()
    const { data, error } = await query
    assertNoError(error)
    return data as Database['public']['Tables'][Table]['Row'] | null
  })
}

export type HomeData = {
  featured: QuoteListItem | null
  latest: QuoteListItem[]
  scholars: DirectoryItem[]
  categories: DirectoryItem[]
  sources: DirectoryItem[]
  translators: DirectoryItem[]
}

export async function getHomeData(): Promise<DataResult<HomeData>> {
  const [featured, latest, scholars, categories, sources, translators] = await Promise.all([
    getFeaturedQuote(),
    searchQuotes({ q: '', sort: 'latest', page: 1 }, 6),
    getDirectory('scholars', '', 1, 6),
    getDirectory('categories', '', 1, 6),
    getDirectory('sources', '', 1, 6),
    getDirectory('translators', '', 1, 6),
  ])
  if (!featured.ok || !latest.ok || !scholars.ok || !categories.ok || !sources.ok || !translators.ok) return unavailable()

  return {
    ok: true,
    data: {
      featured: featured.data ?? latest.data.items[0] ?? null,
      latest: latest.data.items,
      scholars: scholars.data.items,
      categories: categories.data.items,
      sources: sources.data.items,
      translators: translators.data.items,
    },
  }
}

type FeaturedQuoteRow = Pick<Database['public']['Tables']['quotes']['Row'], 'id' | 'slug' | 'arabic_text' | 'english_text' | 'book' | 'featured' | 'published_at'> & {
  scholars: { id: string; english_name: string; slug: string; death_year: string | null } | null
  sources: { id: string; title: string; slug: string } | null
  translators: { id: string; name: string; slug: string } | null
}

function getFeaturedQuote(): Promise<DataResult<QuoteListItem | null>> {
  return withPublicClient(async (client) => {
    const { data, error } = await client.from('quotes').select('id,slug,arabic_text,english_text,book,featured,published_at,scholars!inner(id,english_name,slug,death_year),sources(id,title,slug),translators(id,name,slug)').eq('status', 'published').eq('featured', true).order('published_at', { ascending: false, nullsFirst: false }).order('id').limit(1).maybeSingle()
    assertNoError(error)
    if (!data) return null
    const row = data as unknown as FeaturedQuoteRow
    if (!row.scholars) return null
    return {
      id: row.id, slug: row.slug, arabicText: row.arabic_text, englishText: row.english_text,
      book: row.book, featured: row.featured, publishedAt: row.published_at,
      scholar: { id: row.scholars.id, name: row.scholars.english_name, slug: row.scholars.slug, deathYear: row.scholars.death_year },
      source: row.sources, translator: row.translators,
    }
  })
}

export function getPublishedQuoteCount(): Promise<DataResult<number>> {
  return withPublicClient(async (client) => {
    const { count, error } = await client.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'published')
    assertNoError(error)
    return requireCount(count)
  })
}

export function getSitemapRecordCounts(): Promise<DataResult<SitemapRecordCounts>> {
  return withPublicClient(async (client) => {
    const counts = {} as SitemapRecordCounts
    await Promise.all(SITEMAP_SEGMENTS.map(async (segment) => {
      const { count, error } = await (segment === 'quotes'
        ? client.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'published')
        : client.from(segment).select('id', { count: 'exact', head: true }).eq('is_archived', false))
      assertNoError(error)
      counts[segment] = requireCount(count)
    }))
    return counts
  })
}

type SitemapRecords = Record<SitemapSegment, Array<{ slug: string; updated_at: string }>>

export function getSitemapRecordsPage(
  offset: number,
  limit: number,
  counts: SitemapRecordCounts,
): Promise<DataResult<SitemapRecords>> {
  return withPublicClient(async (client) => {
    const records: SitemapRecords = { quotes: [], scholars: [], categories: [], sources: [], translators: [] }
    let segmentStart = 0
    // Directories share the bounded sequence instead of overflowing chunk zero.
    for (const segment of SITEMAP_SEGMENTS) {
      const from = Math.max(0, offset - segmentStart)
      const to = Math.min(counts[segment], offset + limit - segmentStart)
      segmentStart += counts[segment]
      let cursor = from
      while (cursor < to) {
        const visible = segment === 'quotes'
          ? client.from('quotes').select('slug,updated_at').eq('status', 'published')
          : client.from(segment).select('slug,updated_at').eq('is_archived', false)
        const { data, error } = await visible.order('id').range(cursor, Math.min(cursor + PUBLIC_BATCH_SIZE, to) - 1)
        assertNoError(error)
        if (!data?.length) throw new Error('Incomplete sitemap page')
        records[segment].push(...data)
        cursor += data.length
      }
    }
    return records
  })
}
