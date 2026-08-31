import 'server-only'

import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublicClient } from '@/lib/supabase/server'
import type { Database, QuoteStatus } from '@/lib/supabase/types'
import type { QuoteSearchParams } from '@/lib/validation'

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
  const client = createPublicClient()
  if (!client) return unavailable()

  try {
    return { ok: true, data: await operation(client) }
  } catch {
    return unavailable()
  }
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error('Database query failed')
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
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
  const offset = (params.page - 1) * pageSize
  const { data, error } = await client.rpc('search_published_quotes', {
    p_search: params.q || null,
    p_scholar_slug: params.scholar ?? null,
    p_category_slug: params.category ?? null,
    p_source_slug: params.source ?? null,
    p_translator_slug: params.translator ?? null,
    p_tag_slug: params.tag ?? null,
    p_sort: params.sort,
    p_offset: offset,
    p_limit: pageSize,
  })
  assertNoError(error)

  let rows = data ?? []
  let total = Number(rows[0]?.total_count ?? 0)

  if (rows.length === 0 && params.page > 1) {
    const { data: firstPage, error: firstPageError } = await client.rpc('search_published_quotes', {
      p_search: params.q || null,
      p_scholar_slug: params.scholar ?? null,
      p_category_slug: params.category ?? null,
      p_source_slug: params.source ?? null,
      p_translator_slug: params.translator ?? null,
      p_tag_slug: params.tag ?? null,
      p_sort: params.sort,
      p_offset: 0,
      p_limit: 1,
    })
    assertNoError(firstPageError)
    total = Number(firstPage?.[0]?.total_count ?? 0)
    rows = []
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
  return withPublicClient((client) => runQuoteSearch(client, params, Math.min(Math.max(pageSize, 1), 48)))
}

export type FilterOption = { id: string; slug: string; label: string }
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
      client.from('scholars').select('id,slug,english_name').eq('is_archived', false).order('english_name'),
      client.from('categories').select('id,slug,name').eq('is_archived', false).order('sort_order').order('name'),
      client.from('sources').select('id,slug,title').eq('is_archived', false).order('title'),
      client.from('translators').select('id,slug,name').eq('is_archived', false).order('name'),
      client.from('tags').select('id,slug,name').eq('is_archived', false).order('name'),
    ])
    for (const result of [scholars, categories, sources, translators, tags]) assertNoError(result.error)

    return {
      scholars: (scholars.data ?? []).map((item) => ({ id: item.id, slug: item.slug, label: item.english_name })),
      categories: (categories.data ?? []).map((item) => ({ id: item.id, slug: item.slug, label: item.name })),
      sources: (sources.data ?? []).map((item) => ({ id: item.id, slug: item.slug, label: item.title })),
      translators: (translators.data ?? []).map((item) => ({ id: item.id, slug: item.slug, label: item.name })),
      tags: (tags.data ?? []).map((item) => ({ id: item.id, slug: item.slug, label: item.name })),
    }
  }),
)

type QuoteDetailRow = Database['public']['Tables']['quotes']['Row'] & {
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
        *,
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
    const offset = (page - 1) * pageSize
    const pattern = `%${escapeLike(search.trim().slice(0, 160))}%`

    if (kind === 'scholars') {
      let query = client
        .from('scholars')
        .select('id,slug,english_name,arabic_name,death_year,biography,updated_at,quotes(count)', { count: 'exact' })
        .eq('is_archived', false)
        .order('english_name')
        .range(offset, offset + pageSize - 1)
      if (search) query = query.ilike('english_name', pattern)
      const { data, error, count } = await query
      assertNoError(error)
      const rows = (data ?? []) as unknown as Array<Database['public']['Tables']['scholars']['Row'] & { quotes: Array<{ count: number }> }>
      return directoryResult(rows.map((row) => ({
        id: row.id, slug: row.slug, name: row.english_name, arabicName: row.arabic_name,
        secondary: row.death_year, description: row.biography, quoteCount: row.quotes[0]?.count ?? 0,
        updatedAt: row.updated_at,
      })), count ?? 0, page, pageSize)
    }

    if (kind === 'categories') {
      let query = client
        .from('categories')
        .select('id,slug,name,arabic_name,description,updated_at,quote_categories(count)', { count: 'exact' })
        .eq('is_archived', false)
        .order('sort_order').order('name')
        .range(offset, offset + pageSize - 1)
      if (search) query = query.ilike('name', pattern)
      const { data, error, count } = await query
      assertNoError(error)
      const rows = (data ?? []) as unknown as Array<Database['public']['Tables']['categories']['Row'] & { quote_categories: Array<{ count: number }> }>
      return directoryResult(rows.map((row) => ({
        id: row.id, slug: row.slug, name: row.name, arabicName: row.arabic_name,
        description: row.description, quoteCount: row.quote_categories[0]?.count ?? 0,
        updatedAt: row.updated_at,
      })), count ?? 0, page, pageSize)
    }

    if (kind === 'sources') {
      let query = client
        .from('sources')
        .select('id,slug,title,arabic_title,author,edition,updated_at,quotes(count)', { count: 'exact' })
        .eq('is_archived', false)
        .order('title')
        .range(offset, offset + pageSize - 1)
      if (search) query = query.ilike('title', pattern)
      const { data, error, count } = await query
      assertNoError(error)
      const rows = (data ?? []) as unknown as Array<Database['public']['Tables']['sources']['Row'] & { quotes: Array<{ count: number }> }>
      return directoryResult(rows.map((row) => ({
        id: row.id, slug: row.slug, name: row.title, arabicName: row.arabic_title,
        secondary: row.author, description: row.edition, quoteCount: row.quotes[0]?.count ?? 0,
        updatedAt: row.updated_at,
      })), count ?? 0, page, pageSize)
    }

    let query = client
      .from('translators')
      .select('id,slug,name,bio,updated_at,quotes(count)', { count: 'exact' })
      .eq('is_archived', false)
      .order('name')
      .range(offset, offset + pageSize - 1)
    if (search) query = query.ilike('name', pattern)
    const { data, error, count } = await query
    assertNoError(error)
    const rows = (data ?? []) as unknown as Array<Database['public']['Tables']['translators']['Row'] & { quotes: Array<{ count: number }> }>
    return directoryResult(rows.map((row) => ({
      id: row.id, slug: row.slug, name: row.name, description: row.bio,
      quoteCount: row.quotes[0]?.count ?? 0, updatedAt: row.updated_at,
    })), count ?? 0, page, pageSize)
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
    const { data, error } = await client.from('quotes').select('id,slug,arabic_text,english_text,book,featured,published_at,scholars!inner(id,english_name,slug,death_year),sources(id,title,slug),translators(id,name,slug)').eq('status', 'published').eq('featured', true).order('published_at', { ascending: false }).limit(1).maybeSingle()
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
    const { count, error } = await client.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'published')
    assertNoError(error)
    return count ?? 0
  })
}

export async function getSitemapRecordsPage(offset: number, limit: number, includeDirectories: boolean): Promise<DataResult<{
  quotes: Array<{ slug: string; updated_at: string }>
  scholars: Array<{ slug: string; updated_at: string }>
  categories: Array<{ slug: string; updated_at: string }>
  sources: Array<{ slug: string; updated_at: string }>
  translators: Array<{ slug: string; updated_at: string }>
}>> {
  return withPublicClient(async (client) => {
    const empty = Promise.resolve({ data: [], error: null })
    const [quotes, scholars, categories, sources, translators] = await Promise.all([
      client.from('quotes').select('slug,updated_at').eq('status', 'published').order('id').range(offset, offset + limit - 1),
      includeDirectories ? client.from('scholars').select('slug,updated_at').eq('is_archived', false) : empty,
      includeDirectories ? client.from('categories').select('slug,updated_at').eq('is_archived', false) : empty,
      includeDirectories ? client.from('sources').select('slug,updated_at').eq('is_archived', false) : empty,
      includeDirectories ? client.from('translators').select('slug,updated_at').eq('is_archived', false) : empty,
    ])
    for (const result of [quotes, scholars, categories, sources, translators]) assertNoError(result.error)
    return {
      quotes: quotes.data ?? [], scholars: scholars.data ?? [], categories: categories.data ?? [],
      sources: sources.data ?? [], translators: translators.data ?? [],
    }
  })
}
