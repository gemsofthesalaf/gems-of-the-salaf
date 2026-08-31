import { z } from 'zod'

const optionalFilter = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
  z.string().max(160).optional(),
)

export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Use at least two characters.')
  .max(160, 'Use no more than 160 characters.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens only.')

export const uuidSchema = z.uuid('Select a valid record.')

export const quoteSearchSchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 200) : ''),
    z.string().max(200),
  ),
  scholar: optionalFilter,
  category: optionalFilter,
  source: optionalFilter,
  translator: optionalFilter,
  tag: optionalFilter,
  sort: z.enum(['latest', 'oldest', 'scholar', 'source']).catch('latest'),
  page: z.coerce.number().int().positive().max(5000).catch(1),
})

export type QuoteSearchParams = z.infer<typeof quoteSearchSchema>

export function parseQuoteSearchParams(value: Record<string, string | string[] | undefined>): QuoteSearchParams {
  const first = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] : input
  return quoteSearchSchema.parse({
    q: first(value.q),
    scholar: first(value.scholar),
    category: first(value.category),
    source: first(value.source),
    translator: first(value.translator),
    tag: first(value.tag),
    sort: first(value.sort),
    page: first(value.page),
  })
}

const nullableText = (max: number) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() ? value.trim() : null,
  z.string().max(max).nullable(),
)

export const quoteEditorSchema = z.object({
  id: z.uuid().nullable().optional(),
  slug: slugSchema,
  arabic_text: z.string().trim().min(1, 'Arabic original is required.').max(20_000),
  english_text: z.string().trim().min(1, 'English translation is required.').max(20_000),
  scholar_id: uuidSchema,
  source_id: z.union([z.uuid(), z.null()]),
  translator_id: z.union([z.uuid(), z.null()]),
  status: z.enum(['draft', 'published', 'archived']),
  featured: z.boolean(),
  book: nullableText(300),
  volume: nullableText(80),
  page: nullableText(80),
  chapter: nullableText(300),
  edition: nullableText(500),
  external_reference: z.preprocess(
    (value) => typeof value === 'string' && value.trim() ? value.trim() : null,
    z.url('Enter a complete http(s) URL.').refine((value) => /^https?:\/\//i.test(value), 'Only http(s) URLs are allowed.').nullable(),
  ),
  admin_notes: nullableText(10_000),
  category_ids: z.array(z.uuid()).max(100),
  tag_ids: z.array(z.uuid()).max(100),
})

export type QuoteEditorInput = z.infer<typeof quoteEditorSchema>

export const adminQuoteListSchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 200) : ''),
    z.string(),
  ),
  status: z.enum(['all', 'draft', 'published', 'archived']).catch('all'),
  sort: z.enum(['newest', 'oldest', 'updated', 'scholar']).catch('newest'),
  page: z.coerce.number().int().positive().max(5000).catch(1),
})

export const taxonomyKindSchema = z.enum(['scholar', 'source', 'category', 'translator', 'tag'])

const baseTaxonomySchema = z.object({
  id: z.uuid().nullable().optional(),
  slug: slugSchema,
  is_archived: z.boolean().default(false),
})

export const scholarInputSchema = baseTaxonomySchema.extend({
  english_name: z.string().trim().min(1).max(200),
  arabic_name: nullableText(200),
  death_year: nullableText(80),
  biography: nullableText(10_000),
  image_url: z.union([z.url().refine((value) => /^https?:\/\//i.test(value)), z.null()]),
})

export const sourceInputSchema = baseTaxonomySchema.extend({
  title: z.string().trim().min(1).max(300),
  arabic_title: nullableText(300),
  author: nullableText(300),
  publisher: nullableText(300),
  edition: nullableText(500),
})

export const categoryInputSchema = baseTaxonomySchema.extend({
  name: z.string().trim().min(1).max(160),
  arabic_name: nullableText(160),
  description: nullableText(2_000),
  parent_id: z.union([z.uuid(), z.null()]),
  sort_order: z.coerce.number().int().min(-10_000).max(10_000),
})

export const translatorInputSchema = baseTaxonomySchema.extend({
  name: z.string().trim().min(1).max(200),
  bio: nullableText(10_000),
})

export const tagInputSchema = baseTaxonomySchema.extend({
  name: z.string().trim().min(1).max(160),
})

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120)
}

export function parsePageParam(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(first ?? '1', 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 5000) : 1
}
