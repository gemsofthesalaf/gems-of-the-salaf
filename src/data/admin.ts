import 'server-only'

import { requireAdmin } from '@/lib/authz'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database, QuoteStatus } from '@/lib/supabase/types'

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error('The administrative database request failed.')
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function getAdminDashboard() {
  await requireAdmin()
  const client = createAdminClient()
  const [total, published, drafts, archived, scholars, sources, categories, translators, activity] = await Promise.all([
    client.from('quotes').select('*', { count: 'exact', head: true }),
    client.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    client.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    client.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'archived'),
    client.from('scholars').select('*', { count: 'exact', head: true }),
    client.from('sources').select('*', { count: 'exact', head: true }),
    client.from('categories').select('*', { count: 'exact', head: true }),
    client.from('translators').select('*', { count: 'exact', head: true }),
    client.from('audit_log').select('id,action,entity_type,entity_id,details,created_at').order('created_at', { ascending: false }).limit(8),
  ])
  for (const result of [total, published, drafts, archived, scholars, sources, categories, translators, activity]) {
    assertNoError(result.error)
  }
  return {
    counts: {
      total: total.count ?? 0, published: published.count ?? 0, drafts: drafts.count ?? 0,
      archived: archived.count ?? 0, scholars: scholars.count ?? 0, sources: sources.count ?? 0,
      categories: categories.count ?? 0, translators: translators.count ?? 0,
    },
    activity: activity.data ?? [],
  }
}

export type AdminQuoteListItem = {
  id: string
  slug: string
  englishText: string
  arabicText: string | null
  status: QuoteStatus
  featured: boolean
  updatedAt: string
  publishedAt: string | null
  scholarName: string
}

export async function getAdminQuotes({
  query,
  status,
  sort,
  page,
  pageSize = 25,
}: {
  query: string
  status: 'all' | QuoteStatus
  sort: 'newest' | 'oldest' | 'updated' | 'scholar'
  page: number
  pageSize?: number
}) {
  await requireAdmin()
  const client = createAdminClient()
  const offset = (page - 1) * pageSize
  let builder = client
    .from('quotes')
    .select('id,slug,english_text,arabic_text,status,featured,updated_at,published_at,scholars!inner(english_name)', { count: 'exact' })
    .range(offset, offset + pageSize - 1)

  if (status !== 'all') builder = builder.eq('status', status)
  if (query) builder = builder.ilike('english_text', `%${escapeLike(query.slice(0, 200))}%`)
  if (sort === 'oldest') builder = builder.order('created_at', { ascending: true }).order('id')
  else if (sort === 'updated') builder = builder.order('updated_at', { ascending: false }).order('id')
  else if (sort === 'scholar') builder = builder.order('english_name', { referencedTable: 'scholars' }).order('id')
  else builder = builder.order('created_at', { ascending: false }).order('id')

  const { data, error, count } = await builder
  assertNoError(error)
  const rows = (data ?? []) as unknown as Array<{
    id: string; slug: string; english_text: string; arabic_text: string | null; status: QuoteStatus
    featured: boolean; updated_at: string; published_at: string | null; scholars: { english_name: string }
  }>
  return {
    items: rows.map((row): AdminQuoteListItem => ({
      id: row.id, slug: row.slug, englishText: row.english_text, arabicText: row.arabic_text,
      status: row.status, featured: row.featured, updatedAt: row.updated_at,
      publishedAt: row.published_at, scholarName: row.scholars.english_name,
    })),
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  }
}

type AdminQuoteDetailRow = Database['public']['Tables']['quotes']['Row'] & {
  quote_categories: Array<{ category_id: string }>
  quote_tags: Array<{ tag_id: string }>
}

export async function getAdminQuote(id: string): Promise<(Database['public']['Tables']['quotes']['Row'] & {
  categoryIds: string[]
  tagIds: string[]
}) | null> {
  await requireAdmin()
  const client = createAdminClient()
  const { data, error } = await client
    .from('quotes')
    .select('*,quote_categories(category_id),quote_tags(tag_id)')
    .eq('id', id)
    .maybeSingle()
  assertNoError(error)
  if (!data) return null
  const row = data as unknown as AdminQuoteDetailRow
  return {
    ...row,
    categoryIds: row.quote_categories.map((item) => item.category_id),
    tagIds: row.quote_tags.map((item) => item.tag_id),
  }
}

export type EditorOption = { id: string; label: string; secondary?: string | null; isArchived: boolean }
export type QuoteEditorOptions = {
  scholars: EditorOption[]
  sources: EditorOption[]
  translators: EditorOption[]
  categories: EditorOption[]
  tags: EditorOption[]
}

export async function getQuoteEditorOptions(): Promise<QuoteEditorOptions> {
  await requireAdmin()
  const client = createAdminClient()
  const [scholars, sources, translators, categories, tags] = await Promise.all([
    client.from('scholars').select('id,english_name,arabic_name,is_archived').order('english_name'),
    client.from('sources').select('id,title,arabic_title,is_archived').order('title'),
    client.from('translators').select('id,name,is_archived').order('name'),
    client.from('categories').select('id,name,arabic_name,is_archived').order('sort_order').order('name'),
    client.from('tags').select('id,name,is_archived').order('name'),
  ])
  for (const result of [scholars, sources, translators, categories, tags]) assertNoError(result.error)
  return {
    scholars: (scholars.data ?? []).map((item) => ({ id: item.id, label: item.english_name, secondary: item.arabic_name, isArchived: item.is_archived })),
    sources: (sources.data ?? []).map((item) => ({ id: item.id, label: item.title, secondary: item.arabic_title, isArchived: item.is_archived })),
    translators: (translators.data ?? []).map((item) => ({ id: item.id, label: item.name, isArchived: item.is_archived })),
    categories: (categories.data ?? []).map((item) => ({ id: item.id, label: item.name, secondary: item.arabic_name, isArchived: item.is_archived })),
    tags: (tags.data ?? []).map((item) => ({ id: item.id, label: item.name, isArchived: item.is_archived })),
  }
}

export type TaxonomyKind = 'scholar' | 'source' | 'category' | 'translator' | 'tag'
type TableForKind = 'scholars' | 'sources' | 'categories' | 'translators' | 'tags'
const tableForKind: Record<TaxonomyKind, TableForKind> = {
  scholar: 'scholars', source: 'sources', category: 'categories', translator: 'translators', tag: 'tags',
}

export async function getTaxonomyRows(kind: TaxonomyKind) {
  await requireAdmin()
  const client = createAdminClient()
  const table = tableForKind[kind]
  let query = client.from(table).select('*')
  if (kind === 'category') query = query.order('sort_order').order('name')
  else query = query.order(kind === 'source' ? 'title' : kind === 'scholar' ? 'english_name' : 'name')
  const { data, error } = await query
  assertNoError(error)
  return data ?? []
}
