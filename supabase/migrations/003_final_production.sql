-- Final production hardening for Gems of the Salaf.
-- Safe to apply after 001 and 002; statements are idempotent where practical.

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DROP TABLE IF EXISTS public.imports CASCADE;

ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_id_fkey;
ALTER TABLE public.admins ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.scholars ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.translators ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotes_published_arabic_required'
      AND conrelid = 'public.quotes'::regclass
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_published_arabic_required
      CHECK (status <> 'published' OR nullif(trim(arabic_text), '') IS NOT NULL) NOT VALID;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Public can read published quotes" ON public.quotes;
CREATE POLICY "Public can read published quotes" ON public.quotes
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = quotes.scholar_id AND scholars.is_archived = false
    )
    AND (
      source_id IS NULL OR EXISTS (
        SELECT 1 FROM public.sources
        WHERE sources.id = quotes.source_id AND sources.is_archived = false
      )
    )
    AND (
      translator_id IS NULL OR EXISTS (
        SELECT 1 FROM public.translators
        WHERE translators.id = quotes.translator_id AND translators.is_archived = false
      )
    )
  );

DROP POLICY IF EXISTS "Public can read all scholars" ON public.scholars;
DROP POLICY IF EXISTS "Public can read all sources" ON public.sources;
DROP POLICY IF EXISTS "Public can read all translators" ON public.translators;
DROP POLICY IF EXISTS "Public can read all categories" ON public.categories;
DROP POLICY IF EXISTS "Public can read all tags" ON public.tags;
CREATE POLICY "Public can read all scholars" ON public.scholars FOR SELECT USING (is_archived = false);
CREATE POLICY "Public can read all sources" ON public.sources FOR SELECT USING (is_archived = false);
CREATE POLICY "Public can read all translators" ON public.translators FOR SELECT USING (is_archived = false);
CREATE POLICY "Public can read all categories" ON public.categories FOR SELECT USING (is_archived = false);
CREATE POLICY "Public can read all tags" ON public.tags FOR SELECT USING (is_archived = false);

DROP POLICY IF EXISTS "Public can read quote categories for published quotes" ON public.quote_categories;
CREATE POLICY "Public can read quote categories for published quotes" ON public.quote_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_categories.quote_id AND quotes.status = 'published')
    AND EXISTS (SELECT 1 FROM public.categories WHERE categories.id = quote_categories.category_id AND categories.is_archived = false)
  );
DROP POLICY IF EXISTS "Public can read quote tags for published quotes" ON public.quote_tags;
CREATE POLICY "Public can read quote tags for published quotes" ON public.quote_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_tags.quote_id AND quotes.status = 'published')
    AND EXISTS (SELECT 1 FROM public.tags WHERE tags.id = quote_tags.tag_id AND tags.is_archived = false)
  );

-- NextAuth administrators are not Supabase Auth users. Remove the legacy direct-
-- client write policies; all CMS access uses the server-only service role only
-- after requireAdmin() has revalidated the signed NextAuth identity.
DROP POLICY IF EXISTS "Admins have full access to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins have full access to scholars" ON public.scholars;
DROP POLICY IF EXISTS "Admins have full access to sources" ON public.sources;
DROP POLICY IF EXISTS "Admins have full access to translators" ON public.translators;
DROP POLICY IF EXISTS "Admins have full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Admins have full access to tags" ON public.tags;
DROP POLICY IF EXISTS "Admins have full access to quote_categories" ON public.quote_categories;
DROP POLICY IF EXISTS "Admins have full access to quote_tags" ON public.quote_tags;
DROP FUNCTION IF EXISTS public.is_admin();

CREATE UNIQUE INDEX IF NOT EXISTS admins_email_lower_idx ON public.admins(lower(email));
CREATE INDEX IF NOT EXISTS quotes_status_published_idx ON public.quotes(status, published_at DESC, id);
CREATE INDEX IF NOT EXISTS quotes_source_id_idx ON public.quotes(source_id);
CREATE INDEX IF NOT EXISTS quotes_translator_id_idx ON public.quotes(translator_id);
CREATE INDEX IF NOT EXISTS quotes_featured_published_idx ON public.quotes(featured, published_at DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS quote_categories_category_idx ON public.quote_categories(category_id, quote_id);
CREATE INDEX IF NOT EXISTS quote_tags_tag_idx ON public.quote_tags(tag_id, quote_id);
CREATE INDEX IF NOT EXISTS categories_parent_sort_idx ON public.categories(parent_id, sort_order, name);

CREATE INDEX IF NOT EXISTS quotes_english_trgm_idx
  ON public.quotes USING GIN (lower(english_text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS scholars_name_trgm_idx
  ON public.scholars USING GIN (lower(english_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS sources_title_trgm_idx
  ON public.sources USING GIN (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS translators_name_trgm_idx
  ON public.translators USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS categories_name_trgm_idx
  ON public.categories USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tags_name_trgm_idx
  ON public.tags USING GIN (lower(name) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.normalize_arabic_search(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT trim(
    regexp_replace(
      translate(
        regexp_replace(coalesce(input_text, ''), '[ًٌٍَُِّْـٰ]', '', 'g'),
        'أإآٱىؤئة',
        'اااايءيه'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

CREATE INDEX IF NOT EXISTS quotes_arabic_normalized_trgm_idx
  ON public.quotes USING GIN (public.normalize_arabic_search(arabic_text) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log(entity_type, entity_id, created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.search_published_quotes(
  p_search TEXT DEFAULT NULL,
  p_scholar_slug TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_source_slug TEXT DEFAULT NULL,
  p_translator_slug TEXT DEFAULT NULL,
  p_tag_slug TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'latest',
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  arabic_text TEXT,
  english_text TEXT,
  book TEXT,
  volume TEXT,
  page TEXT,
  chapter TEXT,
  edition TEXT,
  external_reference TEXT,
  featured BOOLEAN,
  published_at TIMESTAMPTZ,
  scholar_id UUID,
  scholar_name TEXT,
  scholar_slug TEXT,
  scholar_death_year TEXT,
  source_id UUID,
  source_title TEXT,
  source_slug TEXT,
  translator_id UUID,
  translator_name TEXT,
  translator_slug TEXT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      q.id, q.slug, q.arabic_text, q.english_text, q.book, q.volume, q.page,
      q.chapter, q.edition, q.external_reference, q.featured, q.published_at,
      s.id AS scholar_id, s.english_name AS scholar_name, s.slug AS scholar_slug,
      s.death_year AS scholar_death_year,
      so.id AS source_id, so.title AS source_title, so.slug AS source_slug,
      tr.id AS translator_id, tr.name AS translator_name, tr.slug AS translator_slug,
      count(*) OVER () AS total_count
    FROM public.quotes q
    JOIN public.scholars s ON s.id = q.scholar_id
    LEFT JOIN public.sources so ON so.id = q.source_id
    LEFT JOIN public.translators tr ON tr.id = q.translator_id
    WHERE q.status = 'published'
      AND s.is_archived = false
      AND (q.source_id IS NULL OR so.is_archived = false)
      AND (q.translator_id IS NULL OR tr.is_archived = false)
      AND (nullif(trim(p_scholar_slug), '') IS NULL OR s.slug = p_scholar_slug)
      AND (nullif(trim(p_source_slug), '') IS NULL OR so.slug = p_source_slug)
      AND (nullif(trim(p_translator_slug), '') IS NULL OR tr.slug = p_translator_slug)
      AND (
        nullif(trim(p_category_slug), '') IS NULL OR EXISTS (
          SELECT 1 FROM public.quote_categories qc
          JOIN public.categories c ON c.id = qc.category_id
          WHERE qc.quote_id = q.id AND c.slug = p_category_slug AND c.is_archived = false
        )
      )
      AND (
        nullif(trim(p_tag_slug), '') IS NULL OR EXISTS (
          SELECT 1 FROM public.quote_tags qt
          JOIN public.tags t ON t.id = qt.tag_id
          WHERE qt.quote_id = q.id AND t.slug = p_tag_slug AND t.is_archived = false
        )
      )
      AND (
        nullif(trim(p_search), '') IS NULL
        OR q.english_text ILIKE '%' || trim(p_search) || '%'
        OR coalesce(q.book, '') ILIKE '%' || trim(p_search) || '%'
        OR public.normalize_arabic_search(q.arabic_text) LIKE '%' || public.normalize_arabic_search(trim(p_search)) || '%'
        OR s.english_name ILIKE '%' || trim(p_search) || '%'
        OR public.normalize_arabic_search(s.arabic_name) LIKE '%' || public.normalize_arabic_search(trim(p_search)) || '%'
        OR coalesce(so.title, '') ILIKE '%' || trim(p_search) || '%'
        OR public.normalize_arabic_search(so.arabic_title) LIKE '%' || public.normalize_arabic_search(trim(p_search)) || '%'
        OR coalesce(tr.name, '') ILIKE '%' || trim(p_search) || '%'
        OR EXISTS (
          SELECT 1 FROM public.quote_categories qc
          JOIN public.categories c ON c.id = qc.category_id
          WHERE qc.quote_id = q.id AND c.is_archived = false AND c.name ILIKE '%' || trim(p_search) || '%'
        )
        OR EXISTS (
          SELECT 1 FROM public.quote_tags qt
          JOIN public.tags t ON t.id = qt.tag_id
          WHERE qt.quote_id = q.id AND t.is_archived = false AND t.name ILIKE '%' || trim(p_search) || '%'
        )
      )
  )
  SELECT * FROM filtered
  ORDER BY
    CASE WHEN p_sort = 'oldest' THEN published_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'scholar' THEN scholar_name END ASC,
    CASE WHEN p_sort = 'source' THEN source_title END ASC NULLS LAST,
    CASE WHEN p_sort NOT IN ('oldest', 'scholar', 'source') THEN published_at END DESC NULLS LAST,
    id ASC
  OFFSET greatest(coalesce(p_offset, 0), 0)
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.search_published_quotes(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_published_quotes(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_save_quote(
  p_id UUID,
  p_slug TEXT,
  p_arabic_text TEXT,
  p_english_text TEXT,
  p_scholar_id UUID,
  p_source_id UUID,
  p_translator_id UUID,
  p_status TEXT,
  p_featured BOOLEAN,
  p_book TEXT,
  p_volume TEXT,
  p_page TEXT,
  p_chapter TEXT,
  p_edition TEXT,
  p_external_reference TEXT,
  p_admin_notes TEXT,
  p_category_ids UUID[],
  p_tag_ids UUID[],
  p_actor_admin_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id UUID := coalesce(p_id, gen_random_uuid());
  v_existing_published_at TIMESTAMPTZ;
BEGIN
  IF p_status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid quote status';
  END IF;
  IF p_status = 'published' AND nullif(trim(p_arabic_text), '') IS NULL THEN
    RAISE EXCEPTION 'A published quote requires its Arabic original';
  END IF;
  IF nullif(trim(p_slug), '') IS NULL OR nullif(trim(p_english_text), '') IS NULL OR p_scholar_id IS NULL THEN
    RAISE EXCEPTION 'Slug, English translation, and scholar are required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.scholars WHERE id = p_scholar_id AND is_archived = false
  ) OR (
    p_source_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.sources WHERE id = p_source_id AND is_archived = false
    )
  ) OR (
    p_translator_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.translators WHERE id = p_translator_id AND is_archived = false
    )
  ) OR EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_category_ids, ARRAY[]::UUID[])) AS selected(id)
    LEFT JOIN public.categories ON categories.id = selected.id
    WHERE categories.id IS NULL OR categories.is_archived = true
  ) OR EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_tag_ids, ARRAY[]::UUID[])) AS selected(id)
    LEFT JOIN public.tags ON tags.id = selected.id
    WHERE tags.id IS NULL OR tags.is_archived = true
  ) THEN
    RAISE EXCEPTION 'A quote may only use active archive records';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.quotes (
      id, slug, arabic_text, english_text, scholar_id, source_id, translator_id,
      status, featured, book, volume, page, chapter, edition,
      external_reference, admin_notes, published_at
    ) VALUES (
      v_id, trim(p_slug), nullif(trim(p_arabic_text), ''), trim(p_english_text),
      p_scholar_id, p_source_id, p_translator_id, p_status, coalesce(p_featured, false),
      nullif(trim(p_book), ''), nullif(trim(p_volume), ''), nullif(trim(p_page), ''),
      nullif(trim(p_chapter), ''), nullif(trim(p_edition), ''),
      nullif(trim(p_external_reference), ''), nullif(trim(p_admin_notes), ''),
      CASE WHEN p_status = 'published' THEN NOW() ELSE NULL END
    );
  ELSE
    SELECT published_at INTO v_existing_published_at FROM public.quotes WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
    UPDATE public.quotes SET
      slug = trim(p_slug), arabic_text = nullif(trim(p_arabic_text), ''),
      english_text = trim(p_english_text), scholar_id = p_scholar_id,
      source_id = p_source_id, translator_id = p_translator_id, status = p_status,
      featured = coalesce(p_featured, false), book = nullif(trim(p_book), ''),
      volume = nullif(trim(p_volume), ''), page = nullif(trim(p_page), ''),
      chapter = nullif(trim(p_chapter), ''), edition = nullif(trim(p_edition), ''),
      external_reference = nullif(trim(p_external_reference), ''),
      admin_notes = nullif(trim(p_admin_notes), ''),
      published_at = CASE
        WHEN p_status <> 'published' THEN NULL
        WHEN v_existing_published_at IS NULL THEN NOW()
        ELSE v_existing_published_at
      END
    WHERE id = p_id;
  END IF;

  DELETE FROM public.quote_categories WHERE quote_id = v_id;
  INSERT INTO public.quote_categories (quote_id, category_id)
    SELECT v_id, category_id FROM unnest(coalesce(p_category_ids, ARRAY[]::UUID[])) AS category_id
    ON CONFLICT DO NOTHING;
  DELETE FROM public.quote_tags WHERE quote_id = v_id;
  INSERT INTO public.quote_tags (quote_id, tag_id)
    SELECT v_id, tag_id FROM unnest(coalesce(p_tag_ids, ARRAY[]::UUID[])) AS tag_id
    ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_log(actor_admin_id, action, entity_type, entity_id, details)
  VALUES (
    p_actor_admin_id, CASE WHEN p_id IS NULL THEN 'create' ELSE 'update' END,
    'quote', v_id, jsonb_build_object('status', p_status, 'featured', coalesce(p_featured, false))
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_quote(UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], UUID[], UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_quote(UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], UUID[], UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_quote(p_quote_id UUID, p_actor_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  SELECT slug INTO v_slug FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  DELETE FROM public.quotes WHERE id = p_quote_id;
  INSERT INTO public.audit_log(actor_admin_id, action, entity_type, entity_id, details)
  VALUES (p_actor_admin_id, 'delete', 'quote', p_quote_id, jsonb_build_object('slug', v_slug));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_quote(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_quote(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_merge_tags(
  p_source_tag_id UUID,
  p_target_tag_id UUID,
  p_actor_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_source_tag_id = p_target_tag_id THEN RAISE EXCEPTION 'Choose two different tags'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tags WHERE id = p_source_tag_id)
     OR NOT EXISTS (SELECT 1 FROM public.tags WHERE id = p_target_tag_id) THEN
    RAISE EXCEPTION 'Tag not found';
  END IF;
  INSERT INTO public.quote_tags(quote_id, tag_id)
    SELECT quote_id, p_target_tag_id FROM public.quote_tags WHERE tag_id = p_source_tag_id
    ON CONFLICT DO NOTHING;
  DELETE FROM public.quote_tags WHERE tag_id = p_source_tag_id;
  DELETE FROM public.tags WHERE id = p_source_tag_id;
  INSERT INTO public.audit_log(actor_admin_id, action, entity_type, entity_id, details)
  VALUES (p_actor_admin_id, 'merge', 'tag', p_target_tag_id, jsonb_build_object('source_tag_id', p_source_tag_id));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_merge_tags(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_merge_tags(UUID, UUID, UUID) TO service_role;
