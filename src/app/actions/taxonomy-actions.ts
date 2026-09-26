'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/authz'
import { createAdminClient } from '@/lib/supabase/admin'
import { categoryInputSchema, scholarInputSchema, sourceInputSchema, tagInputSchema, taxonomyKindSchema, translatorInputSchema, uuidSchema } from '@/lib/validation'
import type { TaxonomyKind } from '@/data/admin'
import type { Json } from '@/lib/supabase/types'
import type { ActionResult } from '@/app/actions/quote-actions'

const schemas = { scholar: scholarInputSchema, source: sourceInputSchema, category: categoryInputSchema, translator: translatorInputSchema, tag: tagInputSchema }

function failure(error: { code?: string; message: string }): ActionResult {
  if (error.code === '23505') return { ok: false, message: 'That slug is already in use.' }
  if (error.code === '23503') return { ok: false, message: 'A selected record no longer exists.' }
  if (error.message.includes('Category cycle')) return { ok: false, message: 'That parent would create a category cycle.' }
  if (error.message.includes('Published quotes')) return { ok: false, message: 'Unpublish or reassign the published quotes before archiving this record.' }
  if (error.message.includes('Linked quotes')) return { ok: false, message: 'Deletion refused: linked quotes exist. Archive or reassign the record instead.' }
  if (error.message.includes('Record not found')) return { ok: false, message: 'The record no longer exists.' }
  return { ok: false, message: 'The operation could not be completed. No changes were saved.' }
}

export async function saveTaxonomyAction(kindInput: unknown, input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const kindResult = taxonomyKindSchema.safeParse(kindInput)
  if (!kindResult.success) return { ok: false, message: 'Invalid record type.' }
  const kind = kindResult.data
  const parsed = schemas[kind].safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Review the required fields.', fieldErrors: parsed.error.flatten().fieldErrors }
  const { data, error } = await createAdminClient().rpc('admin_save_taxonomy', {
    p_kind: kind, p_id: parsed.data.id ?? null, p_value: parsed.data as Json, p_actor_admin_id: admin.id,
  })
  if (error) return failure(error)
  revalidateTaxonomy(kind)
  return { ok: true, message: `${label(kind)} ${parsed.data.id ? 'updated' : 'created'}.`, id: data }
}

export async function deleteTaxonomyAction(kindInput: unknown, idInput: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = z.object({ kind: taxonomyKindSchema, id: uuidSchema }).safeParse({ kind: kindInput, id: idInput })
  if (!parsed.success) return { ok: false, message: 'Invalid delete request.' }
  const { kind, id } = parsed.data
  const { error } = await createAdminClient().rpc('admin_delete_taxonomy', { p_kind: kind, p_id: id, p_actor_admin_id: admin.id })
  if (error) return failure(error)
  revalidateTaxonomy(kind)
  return { ok: true, message: `${label(kind)} deleted.` }
}

export async function mergeTagsAction(sourceIdInput: unknown, targetIdInput: unknown): Promise<ActionResult> {
  const admin = await requireAdmin()
  const parsed = z.object({ sourceId: uuidSchema, targetId: uuidSchema }).safeParse({ sourceId: sourceIdInput, targetId: targetIdInput })
  if (!parsed.success || parsed.data.sourceId === parsed.data.targetId) return { ok: false, message: 'Choose two different valid tags.' }
  const { error } = await createAdminClient().rpc('admin_merge_tags', { p_source_tag_id: parsed.data.sourceId, p_target_tag_id: parsed.data.targetId, p_actor_admin_id: admin.id })
  if (error) return { ok: false, message: 'The tags could not be merged. Select an active destination tag.' }
  revalidateTaxonomy('tag')
  return { ok: true, message: 'Tags merged. Quote relationships were preserved.' }
}

function label(kind: TaxonomyKind) { return kind[0].toUpperCase() + kind.slice(1) }
function revalidateTaxonomy(kind: TaxonomyKind) {
  const segment = kind === 'category' ? 'categories' : `${kind}s`
  revalidatePath('/', 'layout')
  for (const path of ['/', '/quotes', `/${segment}`, `/admin/${segment}`, '/sitemap.xml', '/sitemaps']) revalidatePath(path)
}
