import { describe, expect, it } from 'vitest'
import { parseQuoteSearchParams, quoteEditorSchema, slugSchema, slugify } from '@/lib/validation'

const validQuote = {
  slug: 'a-stable-quote-slug', arabic_text: '  نص عربي  ', english_text: '  Verified translation  ',
  scholar_id: 'd9428888-122b-11e1-b85c-61cd3cbb3210', source_id: null, translator_id: null,
  status: 'draft', featured: false, book: '', volume: '', page: '', chapter: '', edition: '',
  external_reference: '', admin_notes: '', category_ids: [], tag_ids: [],
}

describe('public search validation', () => {
  it('normalizes whitespace, mixed language, and invalid pagination safely', () => {
    const parsed = parseQuoteSearchParams({ q: '  Knowledge   العلم  ', page: '-5', sort: 'unknown' })
    expect(parsed).toMatchObject({ q: 'Knowledge العلم', page: 1, sort: 'latest' })
  })

  it('bounds unusually long search strings', () => {
    const parsed = parseQuoteSearchParams({ q: 'x'.repeat(400) })
    expect(parsed.q).toHaveLength(200)
  })
})

describe('editor validation', () => {
  it('trims content and converts optional blanks to null', () => {
    const parsed = quoteEditorSchema.parse(validQuote)
    expect(parsed.english_text).toBe('Verified translation')
    expect(parsed.arabic_text).toBe('نص عربي')
    expect(parsed.book).toBeNull()
  })

  it('rejects unsafe external reference protocols', () => {
    expect(quoteEditorSchema.safeParse({ ...validQuote, external_reference: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('requires the Arabic original', () => {
    expect(quoteEditorSchema.safeParse({ ...validQuote, arabic_text: '   ' }).success).toBe(false)
  })

  it('enforces stable readable slugs', () => {
    expect(slugSchema.safeParse('Bad Slug').success).toBe(false)
    expect(slugify('  A Useful Heading!  ')).toBe('a-useful-heading')
  })
})
