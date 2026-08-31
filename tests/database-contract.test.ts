// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/003_final_production.sql'), 'utf8')

describe('production database contract', () => {
  it('keeps public search database-backed and bounded', () => {
    expect(migration).toContain('search_published_quotes')
    expect(migration).toContain("WHERE q.status = 'published'")
    expect(migration).toContain('LIMIT least(greatest(coalesce(p_limit, 20), 1), 100)')
  })

  it('restricts administrative RPCs to the service role', () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.admin_save_quote[\s\S]+FROM PUBLIC, anon, authenticated;/)
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_save_quote[\s\S]+TO service_role;/)
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.admin_delete_quote')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.admin_merge_tags')
  })

  it('contains indexes for scaled filtering and multilingual search', () => {
    for (const index of ['quotes_status_published_idx', 'quotes_english_trgm_idx', 'quotes_arabic_normalized_trgm_idx', 'quote_categories_category_idx', 'quote_tags_tag_idx']) expect(migration).toContain(index)
  })

  it('keeps archived records and incomplete published quotes out of the public archive', () => {
    expect(migration).toContain('CREATE POLICY "Public can read all scholars" ON public.scholars FOR SELECT USING (is_archived = false)')
    expect(migration).toContain('DROP POLICY IF EXISTS "Admins have full access to quotes" ON public.quotes')
    expect(migration).toContain("p_status = 'published' AND nullif(trim(p_arabic_text), '') IS NULL")
    expect(migration).toContain('quotes_published_arabic_required')
    expect(migration).toContain('A quote may only use active archive records')
  })
})
