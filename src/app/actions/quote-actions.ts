'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/authz'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database, QuoteStatus } from '@/lib/supabase/types'
import { quoteEditorSchema, uuidSchema } from '@/lib/validation'

export type ActionResult = {
  ok: boolean
  message: string
  id?: string
  fieldErrors?: Record<string, string[] | undefined>
}

export async function saveQuoteAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = quoteEditorSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Review the highlighted fields.', fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const value = parsed.data
  const client = createAdminClient()
  const [scholar, source, translator, categories, tags] = await Promise.all([
    client.from('scholars').select('id,is_archived').eq('id', value.scholar_id).maybeSingle(),
    value.source_id
      ? client.from('sources').select('id,is_archived').eq('id', value.source_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    value.translator_id
      ? client.from('translators').select('id,is_archived').eq('id', value.translator_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    value.category_ids.length
      ? client.from('categories').select('id,is_archived').in('id', value.category_ids)
      : Promise.resolve({ data: [], error: null }),
    value.tag_ids.length
      ? client.from('tags').select('id,is_archived').in('id', value.tag_ids)
      : Promise.resolve({ data: [], error: null }),
  ])

  if ([scholar, source, translator, categories, tags].some((result) => result.error)) {
    return { ok: false, message: 'The selected archive records could not be verified.' }
  }

  const referenceErrors: Record<string, string[]> = {}
  if (!scholar.data || scholar.data.is_archived) referenceErrors.scholar_id = ['Select an active scholar.']
  if (value.source_id && (!source.data || source.data.is_archived)) referenceErrors.source_id = ['Select an active source or leave it empty.']
  if (value.translator_id && (!translator.data || translator.data.is_archived)) referenceErrors.translator_id = ['Select an active translator or leave it empty.']
  if ((categories.data?.length ?? 0) !== new Set(value.category_ids).size || categories.data?.some((item) => item.is_archived)) {
    referenceErrors.category_ids = ['Remove archived or unavailable categories.']
  }
  if ((tags.data?.length ?? 0) !== new Set(value.tag_ids).size || tags.data?.some((item) => item.is_archived)) {
    referenceErrors.tag_ids = ['Remove archived or unavailable tags.']
  }
  if (Object.keys(referenceErrors).length) {
    return { ok: false, message: 'Review the selected archive records.', fieldErrors: referenceErrors }
  }

  const { data, error } = await client.rpc('admin_save_quote', {
    p_id: value.id ?? null,
    p_slug: value.slug,
    p_arabic_text: value.arabic_text,
    p_english_text: value.english_text,
    p_scholar_id: value.scholar_id,
    p_source_id: value.source_id,
    p_translator_id: value.translator_id,
    p_status: value.status,
    p_featured: value.featured,
    p_book: value.book,
    p_volume: value.volume,
    p_page: value.page,
    p_chapter: value.chapter,
    p_edition: value.edition,
    p_external_reference: value.external_reference,
    p_admin_notes: value.admin_notes,
    p_category_ids: value.category_ids,
    p_tag_ids: value.tag_ids,
    p_actor_admin_id: admin.id,
  })

  if (error) {
    if (error.code === '23505') return { ok: false, message: 'That slug is already in use.' }
    if (error.code === '23503') return { ok: false, message: 'A selected scholar, source, translator, category, or tag no longer exists.' }
    if (error.message.includes('Arabic original')) {
      return { ok: false, message: 'An Arabic original is required before publication.', fieldErrors: { arabic_text: ['Arabic original is required.'] } }
    }
    if (error.message.includes('active archive records')) {
      return { ok: false, message: 'A selected scholar, source, translator, category, or tag is archived.' }
    }
    return { ok: false, message: 'The quote could not be saved. No success was recorded.' }
  }

  revalidateQuotePaths(value.slug)
  return { ok: true, message: value.status === 'draft' ? 'Draft saved.' : value.status === 'published' ? 'Quote published.' : 'Quote archived.', id: data }
}

const stateSchema = z.object({
  id: uuidSchema,
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured: z.boolean().optional(),
})

type ExistingQuote = Database['public']['Tables']['quotes']['Row'] & {
  quote_categories: Array<{ category_id: string }>
  quote_tags: Array<{ tag_id: string }>
}

export async function setQuoteStateAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = stateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Invalid quote action.' }
  const client = createAdminClient()
  const { data, error } = await client
    .from('quotes')
    .select('*,quote_categories(category_id),quote_tags(tag_id)')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (error || !data) return { ok: false, message: 'The quote no longer exists.' }
  const quote = data as unknown as ExistingQuote
  const status: QuoteStatus = parsed.data.status ?? quote.status
  const featured = parsed.data.featured ?? quote.featured

  const { error: saveError } = await client.rpc('admin_save_quote', {
    p_id: quote.id,
    p_slug: quote.slug,
    p_arabic_text: quote.arabic_text,
    p_english_text: quote.english_text,
    p_scholar_id: quote.scholar_id,
    p_source_id: quote.source_id,
    p_translator_id: quote.translator_id,
    p_status: status,
    p_featured: featured,
    p_book: quote.book,
    p_volume: quote.volume,
    p_page: quote.page,
    p_chapter: quote.chapter,
    p_edition: quote.edition,
    p_external_reference: quote.external_reference,
    p_admin_notes: quote.admin_notes,
    p_category_ids: quote.quote_categories.map((item) => item.category_id),
    p_tag_ids: quote.quote_tags.map((item) => item.tag_id),
    p_actor_admin_id: admin.id,
  })
  if (saveError) return { ok: false, message: 'The quote state could not be changed.' }
  revalidateQuotePaths(quote.slug)
  return { ok: true, message: parsed.data.featured !== undefined ? (featured ? 'Quote featured.' : 'Quote removed from featured items.') : `Quote moved to ${status}.` }
}

export async function deleteQuoteAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, message: 'Invalid quote identifier.' }
  const client = createAdminClient()
  const { error } = await client.rpc('admin_delete_quote', { p_quote_id: parsed.data, p_actor_admin_id: admin.id })
  if (error) return { ok: false, message: 'The quote could not be deleted.' }
  revalidateQuotePaths()
  return { ok: true, message: 'Quote deleted permanently.' }
}

function revalidateQuotePaths(slug?: string) {
  for (const path of ['/', '/quotes', '/scholars', '/categories', '/sources', '/translators', '/admin', '/admin/quotes', '/sitemap.xml', '/sitemaps']) revalidatePath(path)
  if (slug) revalidatePath(`/quotes/${slug}`)
}
