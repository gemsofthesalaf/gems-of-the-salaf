'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/authz'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  categoryInputSchema,
  scholarInputSchema,
  sourceInputSchema,
  tagInputSchema,
  taxonomyKindSchema,
  translatorInputSchema,
  uuidSchema,
} from '@/lib/validation'
import type { TaxonomyKind } from '@/data/admin'
import type { ActionResult } from '@/app/actions/quote-actions'

const schemas = {
  scholar: scholarInputSchema,
  source: sourceInputSchema,
  category: categoryInputSchema,
  translator: translatorInputSchema,
  tag: tagInputSchema,
}

export async function saveTaxonomyAction(kindInput: unknown, input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const kindResult = taxonomyKindSchema.safeParse(kindInput)
  if (!kindResult.success) return { ok: false, message: 'Invalid record type.' }
  const kind = kindResult.data
  const parsed = schemas[kind].safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Review the required fields.', fieldErrors: parsed.error.flatten().fieldErrors }
  const client = createAdminClient()
  const value = parsed.data
  const id = value.id ?? null
  let mutationError: { code?: string } | null = null
  let entityId = id

  if (id && value.is_archived && (kind === 'scholar' || kind === 'source' || kind === 'translator')) {
    const dependencies = kind === 'scholar'
      ? await client.from('quotes').select('*', { count: 'exact', head: true }).eq('scholar_id', id).eq('status', 'published')
      : kind === 'source'
        ? await client.from('quotes').select('*', { count: 'exact', head: true }).eq('source_id', id).eq('status', 'published')
        : await client.from('quotes').select('*', { count: 'exact', head: true }).eq('translator_id', id).eq('status', 'published')
    if (dependencies.error) return { ok: false, message: 'Published quote dependencies could not be checked, so archiving was refused.' }
    if ((dependencies.count ?? 0) > 0) {
      return {
        ok: false,
        message: `Archiving refused: ${dependencies.count} published ${dependencies.count === 1 ? 'quote still uses' : 'quotes still use'} this ${label(kind).toLowerCase()}. Unpublish or reassign those quotes first.`,
      }
    }
  }

  if (kind === 'scholar') {
    const payload = scholarInputSchema.parse(value)
    const row = { slug: payload.slug, english_name: payload.english_name, arabic_name: payload.arabic_name, death_year: payload.death_year, biography: payload.biography, image_url: payload.image_url, is_archived: payload.is_archived }
    const result = id
      ? await client.from('scholars').update(row).eq('id', id).select('id').single()
      : await client.from('scholars').insert(row).select('id').single()
    mutationError = result.error
    entityId = result.data?.id ?? id
  } else if (kind === 'source') {
    const payload = sourceInputSchema.parse(value)
    const row = { slug: payload.slug, title: payload.title, arabic_title: payload.arabic_title, author: payload.author, publisher: payload.publisher, edition: payload.edition, is_archived: payload.is_archived }
    const result = id ? await client.from('sources').update(row).eq('id', id).select('id').single() : await client.from('sources').insert(row).select('id').single()
    mutationError = result.error
    entityId = result.data?.id ?? id
  } else if (kind === 'category') {
    const payload = categoryInputSchema.parse(value)
    if (id && payload.parent_id === id) return { ok: false, message: 'A category cannot be its own parent.' }
    if (id && payload.parent_id) {
      const { data: hierarchy, error: hierarchyError } = await client.from('categories').select('id,parent_id')
      if (hierarchyError) return { ok: false, message: 'The category hierarchy could not be verified.' }
      const parentById = new Map((hierarchy ?? []).map((item) => [item.id, item.parent_id]))
      let parentId: string | null = payload.parent_id
      const visited = new Set<string>()
      while (parentId) {
        if (parentId === id) return { ok: false, message: 'That parent would create a category cycle.' }
        if (visited.has(parentId)) return { ok: false, message: 'The existing category hierarchy contains a cycle.' }
        visited.add(parentId)
        parentId = parentById.get(parentId) ?? null
      }
    }
    const row = { slug: payload.slug, name: payload.name, arabic_name: payload.arabic_name, description: payload.description, parent_id: payload.parent_id, sort_order: payload.sort_order, is_archived: payload.is_archived }
    const result = id ? await client.from('categories').update(row).eq('id', id).select('id').single() : await client.from('categories').insert(row).select('id').single()
    mutationError = result.error
    entityId = result.data?.id ?? id
  } else if (kind === 'translator') {
    const payload = translatorInputSchema.parse(value)
    const row = { slug: payload.slug, name: payload.name, bio: payload.bio, is_archived: payload.is_archived }
    const result = id ? await client.from('translators').update(row).eq('id', id).select('id').single() : await client.from('translators').insert(row).select('id').single()
    mutationError = result.error
    entityId = result.data?.id ?? id
  } else {
    const payload = tagInputSchema.parse(value)
    const row = { slug: payload.slug, name: payload.name, is_archived: payload.is_archived }
    const result = id ? await client.from('tags').update(row).eq('id', id).select('id').single() : await client.from('tags').insert(row).select('id').single()
    mutationError = result.error
    entityId = result.data?.id ?? id
  }

  if (mutationError) {
    if (mutationError.code === '23505') return { ok: false, message: 'That slug is already in use.' }
    if (mutationError.code === '23503') return { ok: false, message: 'A selected parent record does not exist.' }
    return { ok: false, message: 'The record could not be saved.' }
  }

  await client.from('audit_log').insert({ actor_admin_id: admin.id, action: id ? 'update' : 'create', entity_type: kind, entity_id: entityId })
  revalidateTaxonomy(kind)
  return { ok: true, message: `${label(kind)} ${id ? 'updated' : 'created'}.`, id: entityId ?? undefined }
}

export async function deleteTaxonomyAction(kindInput: unknown, idInput: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = z.object({ kind: taxonomyKindSchema, id: uuidSchema }).safeParse({ kind: kindInput, id: idInput })
  if (!parsed.success) return { ok: false, message: 'Invalid delete request.' }
  const { kind, id } = parsed.data
  const client = createAdminClient()
  let count: number | null = 0
  let countError: { message: string } | null = null
  if (kind === 'scholar') ({ count, error: countError } = await client.from('quotes').select('*', { count: 'exact', head: true }).eq('scholar_id', id))
  else if (kind === 'source') ({ count, error: countError } = await client.from('quotes').select('*', { count: 'exact', head: true }).eq('source_id', id))
  else if (kind === 'translator') ({ count, error: countError } = await client.from('quotes').select('*', { count: 'exact', head: true }).eq('translator_id', id))
  else if (kind === 'category') ({ count, error: countError } = await client.from('quote_categories').select('*', { count: 'exact', head: true }).eq('category_id', id))
  else ({ count, error: countError } = await client.from('quote_tags').select('*', { count: 'exact', head: true }).eq('tag_id', id))
  if (countError) return { ok: false, message: 'Dependencies could not be checked, so deletion was refused.' }
  if ((count ?? 0) > 0) return { ok: false, message: `Deletion refused: ${count} linked ${count === 1 ? 'quote exists' : 'quotes exist'}. Archive or reassign the record instead.` }

  let deleteError: { message: string } | null = null
  if (kind === 'scholar') ({ error: deleteError } = await client.from('scholars').delete().eq('id', id))
  else if (kind === 'source') ({ error: deleteError } = await client.from('sources').delete().eq('id', id))
  else if (kind === 'category') ({ error: deleteError } = await client.from('categories').delete().eq('id', id))
  else if (kind === 'translator') ({ error: deleteError } = await client.from('translators').delete().eq('id', id))
  else ({ error: deleteError } = await client.from('tags').delete().eq('id', id))
  if (deleteError) return { ok: false, message: 'The record could not be deleted.' }
  await client.from('audit_log').insert({ actor_admin_id: admin.id, action: 'delete', entity_type: kind, entity_id: id })
  revalidateTaxonomy(kind)
  return { ok: true, message: `${label(kind)} deleted.` }
}

export async function mergeTagsAction(sourceIdInput: unknown, targetIdInput: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = z.object({ sourceId: uuidSchema, targetId: uuidSchema }).safeParse({ sourceId: sourceIdInput, targetId: targetIdInput })
  if (!parsed.success || parsed.data.sourceId === parsed.data.targetId) return { ok: false, message: 'Choose two different valid tags.' }
  const client = createAdminClient()
  const { error } = await client.rpc('admin_merge_tags', { p_source_tag_id: parsed.data.sourceId, p_target_tag_id: parsed.data.targetId, p_actor_admin_id: admin.id })
  if (error) return { ok: false, message: 'The tags could not be merged.' }
  revalidateTaxonomy('tag')
  return { ok: true, message: 'Tags merged. Quote relationships were preserved.' }
}

function label(kind: TaxonomyKind): string {
  return kind[0].toUpperCase() + kind.slice(1)
}

function revalidateTaxonomy(kind: TaxonomyKind) {
  const segment = kind === 'category' ? 'categories' : `${kind}s`
  for (const path of ['/', '/quotes', `/${segment}`, `/admin/${segment}`, '/sitemap.xml', '/sitemaps']) revalidatePath(path)
}
