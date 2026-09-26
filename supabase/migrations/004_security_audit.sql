-- Apply after 003. Existing archive content is preserved.
BEGIN;

-- RLS restricts rows, not columns. Editorial notes must not be readable via REST.
REVOKE ALL ON public.quotes FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, slug, arabic_text, english_text, scholar_id, source_id, translator_id,
  status, featured, book, volume, page, chapter, edition, external_reference,
  created_at, updated_at, published_at) ON public.quotes TO anon, authenticated;
REVOKE ALL ON public.admins, public.audit_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.quotes, public.admins, public.audit_log TO service_role;

UPDATE public.admins SET email = lower(trim(email));
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_email_normalized;
ALTER TABLE public.admins ADD CONSTRAINT admins_email_normalized CHECK (email = lower(trim(email)));

CREATE TABLE IF NOT EXISTS public.login_attempts (
  key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL
);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.login_attempts TO service_role;

-- Shared budgets persist across serverless instances. Failed database access fails closed.
CREATE OR REPLACE FUNCTION public.consume_login_attempt(p_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  DELETE FROM public.login_attempts WHERE window_started_at < now() - interval '1 day';
  INSERT INTO public.login_attempts AS a VALUES ('global', now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN a.window_started_at < now() - interval '15 minutes' THEN 1 ELSE least(a.attempts + 1, 301) END,
    window_started_at = CASE WHEN a.window_started_at < now() - interval '15 minutes' THEN now() ELSE a.window_started_at END
  RETURNING attempts INTO v_count;
  IF v_count > 300 THEN RETURN false; END IF;
  INSERT INTO public.login_attempts AS a VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN a.window_started_at < now() - interval '15 minutes' THEN 1 ELSE least(a.attempts + 1, 11) END,
    window_started_at = CASE WHEN a.window_started_at < now() - interval '15 minutes' THEN now() ELSE a.window_started_at END
  RETURNING attempts INTO v_count;
  RETURN v_count <= 10;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_login_attempt(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_login_attempt(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.escape_search_pattern(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public AS $$
  SELECT replace(replace(replace(value, chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_');
$$;

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
        OR q.english_text ILIKE '%' || public.escape_search_pattern(left(trim(p_search), 200)) || '%'
        OR coalesce(q.book, '') ILIKE '%' || public.escape_search_pattern(left(trim(p_search), 200)) || '%'
        OR public.normalize_arabic_search(q.arabic_text) LIKE '%' || public.escape_search_pattern(public.normalize_arabic_search(left(trim(p_search), 200))) || '%'
        OR s.english_name ILIKE '%' || public.escape_search_pattern(left(trim(p_search), 200)) || '%'
        OR public.normalize_arabic_search(s.arabic_name) LIKE '%' || public.escape_search_pattern(public.normalize_arabic_search(left(trim(p_search), 200))) || '%'
        OR coalesce(so.title, '') ILIKE '%' || public.escape_search_pattern(left(trim(p_search), 200)) || '%'
        OR public.normalize_arabic_search(so.arabic_title) LIKE '%' || public.escape_search_pattern(public.normalize_arabic_search(left(trim(p_search), 200))) || '%'
        OR coalesce(tr.name, '') ILIKE '%' || public.escape_search_pattern(left(trim(p_search), 200)) || '%'
        OR EXISTS (
          SELECT 1 FROM public.quote_categories qc
          JOIN public.categories c ON c.id = qc.category_id
          WHERE qc.quote_id = q.id AND c.is_archived = false AND c.name ILIKE '%' || public.escape_search_pattern(left(trim(p_search), 200)) || '%'
        )
        OR EXISTS (
          SELECT 1 FROM public.quote_tags qt
          JOIN public.tags t ON t.id = qt.tag_id
          WHERE qt.quote_id = q.id AND t.is_archived = false AND t.name ILIKE '%' || public.escape_search_pattern(left(trim(p_search), 200)) || '%'
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

-- Update only state fields, never a stale client-side snapshot of quote content.
CREATE OR REPLACE FUNCTION public.admin_set_quote_state(
  p_quote_id UUID, p_status TEXT, p_featured BOOLEAN, p_actor_admin_id UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE q public.quotes;
BEGIN
  PERFORM pg_advisory_xact_lock(784522);
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('draft','published','archived') THEN
    RAISE EXCEPTION 'Invalid quote status';
  END IF;
  IF p_status = 'published' AND (
    nullif(trim(q.arabic_text),'') IS NULL OR
    NOT EXISTS (SELECT 1 FROM scholars WHERE id = q.scholar_id AND NOT is_archived) OR
    (q.source_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sources WHERE id = q.source_id AND NOT is_archived)) OR
    (q.translator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM translators WHERE id = q.translator_id AND NOT is_archived)) OR
    EXISTS (SELECT 1 FROM quote_categories qc JOIN categories c ON c.id=qc.category_id WHERE qc.quote_id=q.id AND c.is_archived) OR
    EXISTS (SELECT 1 FROM quote_tags qt JOIN tags t ON t.id=qt.tag_id WHERE qt.quote_id=q.id AND t.is_archived)
  ) THEN RAISE EXCEPTION 'Publication requires Arabic and active archive records'; END IF;
  UPDATE public.quotes SET
    status = coalesce(p_status, q.status),
    featured = coalesce(p_featured, q.featured),
    published_at = CASE WHEN coalesce(p_status, q.status) <> 'published' THEN NULL
      ELSE coalesce(q.published_at, now()) END
  WHERE id = q.id;
  INSERT INTO audit_log(actor_admin_id,action,entity_type,entity_id,details)
    VALUES (p_actor_admin_id,'state','quote',q.id,jsonb_build_object('status',coalesce(p_status,q.status),'featured',coalesce(p_featured,q.featured)));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_quote_state(UUID,TEXT,BOOLEAN,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_quote_state(UUID,TEXT,BOOLEAN,UUID) TO service_role;

-- Serialise CMS graph mutations so dependency checks and deletes cannot race.
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
  PERFORM pg_advisory_xact_lock(784522);
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

CREATE OR REPLACE FUNCTION public.admin_delete_quote(p_quote_id UUID, p_actor_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(784522);
  SELECT slug INTO v_slug FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  DELETE FROM public.quotes WHERE id = p_quote_id;
  INSERT INTO public.audit_log(actor_admin_id, action, entity_type, entity_id, details)
  VALUES (p_actor_admin_id, 'delete', 'quote', p_quote_id, jsonb_build_object('slug', v_slug));
END;
$$;

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
  PERFORM pg_advisory_xact_lock(784522);
  IF p_source_tag_id = p_target_tag_id THEN RAISE EXCEPTION 'Choose two different tags'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tags WHERE id = p_source_tag_id)
     OR NOT EXISTS (SELECT 1 FROM public.tags WHERE id = p_target_tag_id AND is_archived = false) THEN
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

CREATE OR REPLACE FUNCTION public.admin_save_taxonomy(p_kind TEXT,p_id UUID,p_value JSONB,p_actor_admin_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id UUID := coalesce(p_id,gen_random_uuid()); v_parent UUID; v_blocked BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(784522);
  IF p_id IS NOT NULL AND coalesce((p_value->>'is_archived')::boolean,false) THEN
    SELECT EXISTS(SELECT 1 FROM quotes WHERE status='published' AND
      ((p_kind='scholar' AND scholar_id=p_id) OR (p_kind='source' AND source_id=p_id) OR (p_kind='translator' AND translator_id=p_id)))
      INTO v_blocked;
    IF v_blocked THEN RAISE EXCEPTION 'Published quotes still use this record'; END IF;
  END IF;
  IF p_kind='category' AND p_value->>'parent_id' IS NOT NULL THEN
    v_parent := (p_value->>'parent_id')::uuid;
    IF v_parent=v_id THEN RAISE EXCEPTION 'Category cycle'; END IF;
    WITH RECURSIVE ancestors AS (
      SELECT id,parent_id FROM categories WHERE id=v_parent
      UNION SELECT c.id,c.parent_id FROM categories c JOIN ancestors a ON c.id=a.parent_id
    ) SELECT EXISTS(SELECT 1 FROM ancestors WHERE id=v_id) INTO v_blocked;
    IF v_blocked THEN RAISE EXCEPTION 'Category cycle'; END IF;
  END IF;
  IF p_kind = 'scholar' THEN
    IF p_id IS NULL THEN
      INSERT INTO public.scholars (id,slug,english_name,arabic_name,death_year,biography,image_url,is_archived) VALUES(v_id,(p_value->>'slug')::text,(p_value->>'english_name')::text,(p_value->>'arabic_name')::text,(p_value->>'death_year')::text,(p_value->>'biography')::text,(p_value->>'image_url')::text,(p_value->>'is_archived')::boolean);
    ELSE
      UPDATE public.scholars SET slug=(p_value->>'slug')::text,english_name=(p_value->>'english_name')::text,arabic_name=(p_value->>'arabic_name')::text,death_year=(p_value->>'death_year')::text,biography=(p_value->>'biography')::text,image_url=(p_value->>'image_url')::text,is_archived=(p_value->>'is_archived')::boolean WHERE id=p_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
    END IF;
  ELSIF p_kind = 'source' THEN
    IF p_id IS NULL THEN
      INSERT INTO public.sources (id,slug,title,arabic_title,author,publisher,edition,is_archived) VALUES(v_id,(p_value->>'slug')::text,(p_value->>'title')::text,(p_value->>'arabic_title')::text,(p_value->>'author')::text,(p_value->>'publisher')::text,(p_value->>'edition')::text,(p_value->>'is_archived')::boolean);
    ELSE
      UPDATE public.sources SET slug=(p_value->>'slug')::text,title=(p_value->>'title')::text,arabic_title=(p_value->>'arabic_title')::text,author=(p_value->>'author')::text,publisher=(p_value->>'publisher')::text,edition=(p_value->>'edition')::text,is_archived=(p_value->>'is_archived')::boolean WHERE id=p_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
    END IF;
  ELSIF p_kind = 'category' THEN
    IF p_id IS NULL THEN
      INSERT INTO public.categories (id,slug,name,arabic_name,description,parent_id,sort_order,is_archived) VALUES(v_id,(p_value->>'slug')::text,(p_value->>'name')::text,(p_value->>'arabic_name')::text,(p_value->>'description')::text,(p_value->>'parent_id')::uuid,(p_value->>'sort_order')::integer,(p_value->>'is_archived')::boolean);
    ELSE
      UPDATE public.categories SET slug=(p_value->>'slug')::text,name=(p_value->>'name')::text,arabic_name=(p_value->>'arabic_name')::text,description=(p_value->>'description')::text,parent_id=(p_value->>'parent_id')::uuid,sort_order=(p_value->>'sort_order')::integer,is_archived=(p_value->>'is_archived')::boolean WHERE id=p_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
    END IF;
  ELSIF p_kind = 'translator' THEN
    IF p_id IS NULL THEN
      INSERT INTO public.translators (id,slug,name,bio,is_archived) VALUES(v_id,(p_value->>'slug')::text,(p_value->>'name')::text,(p_value->>'bio')::text,(p_value->>'is_archived')::boolean);
    ELSE
      UPDATE public.translators SET slug=(p_value->>'slug')::text,name=(p_value->>'name')::text,bio=(p_value->>'bio')::text,is_archived=(p_value->>'is_archived')::boolean WHERE id=p_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
    END IF;
  ELSIF p_kind = 'tag' THEN
    IF p_id IS NULL THEN
      INSERT INTO public.tags (id,slug,name,is_archived) VALUES(v_id,(p_value->>'slug')::text,(p_value->>'name')::text,(p_value->>'is_archived')::boolean);
    ELSE
      UPDATE public.tags SET slug=(p_value->>'slug')::text,name=(p_value->>'name')::text,is_archived=(p_value->>'is_archived')::boolean WHERE id=p_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
    END IF;
  ELSE RAISE EXCEPTION 'Invalid record type';
  END IF;
  INSERT INTO audit_log(actor_admin_id,action,entity_type,entity_id)
    VALUES(p_actor_admin_id,CASE WHEN p_id IS NULL THEN 'create' ELSE 'update' END,p_kind,v_id);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_taxonomy(TEXT,UUID,JSONB,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_taxonomy(TEXT,UUID,JSONB,UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_taxonomy(p_kind TEXT,p_id UUID,p_actor_admin_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_table TEXT; v_exists UUID; v_blocked BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(784522);
  v_table := CASE p_kind WHEN 'scholar' THEN 'scholars' WHEN 'source' THEN 'sources'
    WHEN 'translator' THEN 'translators' WHEN 'category' THEN 'categories' WHEN 'tag' THEN 'tags' END;
  IF v_table IS NULL THEN RAISE EXCEPTION 'Invalid record type'; END IF;
  EXECUTE format('SELECT id FROM public.%I WHERE id=$1 FOR UPDATE',v_table) INTO v_exists USING p_id;
  IF v_exists IS NULL THEN RAISE EXCEPTION 'Record not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM quotes WHERE
    (p_kind='scholar' AND scholar_id=p_id) OR (p_kind='source' AND source_id=p_id) OR (p_kind='translator' AND translator_id=p_id))
    OR EXISTS(SELECT 1 FROM quote_categories WHERE p_kind='category' AND category_id=p_id)
    OR EXISTS(SELECT 1 FROM quote_tags WHERE p_kind='tag' AND tag_id=p_id) INTO v_blocked;
  IF v_blocked THEN RAISE EXCEPTION 'Linked quotes exist'; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id=$1',v_table) USING p_id;
  INSERT INTO audit_log(actor_admin_id,action,entity_type,entity_id) VALUES(p_actor_admin_id,'delete',p_kind,p_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_taxonomy(TEXT,UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_taxonomy(TEXT,UUID,UUID) TO service_role;

COMMIT;
