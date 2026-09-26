-- Public directory queries need published-quote counts, but anonymous roles
-- intentionally have column-level (not table-level) access to quotes.
-- Keep that boundary: expose only directory fields and published counts here.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_directory(
  p_kind TEXT,
  p_search TEXT DEFAULT NULL,
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 18
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  arabic_name TEXT,
  secondary TEXT,
  description TEXT,
  quote_count BIGINT,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_pattern TEXT := '%' || public.escape_search_pattern(left(trim(coalesce(p_search, '')), 160)) || '%';
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('scholars', 'categories', 'sources', 'translators') THEN
    RAISE EXCEPTION 'Invalid directory kind';
  END IF;
  IF coalesce(p_offset, -1) < 0 OR coalesce(p_limit, 0) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid directory page';
  END IF;

  IF p_kind = 'scholars' THEN
    RETURN QUERY
      SELECT s.id, s.slug, s.english_name::TEXT, s.arabic_name::TEXT,
        s.death_year::TEXT, s.biography::TEXT, count(q.id)::BIGINT, s.updated_at,
        count(*) OVER ()::BIGINT
      FROM public.scholars s
      LEFT JOIN public.quotes q ON q.scholar_id = s.id AND q.status = 'published'
        AND EXISTS (SELECT 1 FROM public.scholars qs WHERE qs.id = q.scholar_id AND NOT qs.is_archived)
        AND (q.source_id IS NULL OR EXISTS (SELECT 1 FROM public.sources qso WHERE qso.id = q.source_id AND NOT qso.is_archived))
        AND (q.translator_id IS NULL OR EXISTS (SELECT 1 FROM public.translators qtr WHERE qtr.id = q.translator_id AND NOT qtr.is_archived))
      WHERE NOT s.is_archived
        AND (nullif(trim(coalesce(p_search, '')), '') IS NULL OR s.english_name ILIKE v_pattern)
      GROUP BY s.id
      ORDER BY s.english_name, s.id
      OFFSET p_offset LIMIT p_limit;
  ELSIF p_kind = 'categories' THEN
    RETURN QUERY
      SELECT c.id, c.slug, c.name::TEXT, c.arabic_name::TEXT,
        NULL::TEXT, c.description::TEXT, count(q.id)::BIGINT, c.updated_at,
        count(*) OVER ()::BIGINT
      FROM public.categories c
      LEFT JOIN public.quote_categories qc ON qc.category_id = c.id
      LEFT JOIN public.quotes q ON q.id = qc.quote_id AND q.status = 'published'
        AND EXISTS (SELECT 1 FROM public.scholars qs WHERE qs.id = q.scholar_id AND NOT qs.is_archived)
        AND (q.source_id IS NULL OR EXISTS (SELECT 1 FROM public.sources qso WHERE qso.id = q.source_id AND NOT qso.is_archived))
        AND (q.translator_id IS NULL OR EXISTS (SELECT 1 FROM public.translators qtr WHERE qtr.id = q.translator_id AND NOT qtr.is_archived))
      WHERE NOT c.is_archived
        AND (nullif(trim(coalesce(p_search, '')), '') IS NULL OR c.name ILIKE v_pattern)
      GROUP BY c.id
      ORDER BY c.sort_order, c.name, c.id
      OFFSET p_offset LIMIT p_limit;
  ELSIF p_kind = 'sources' THEN
    RETURN QUERY
      SELECT s.id, s.slug, s.title::TEXT, s.arabic_title::TEXT,
        s.author::TEXT, s.edition::TEXT, count(q.id)::BIGINT, s.updated_at,
        count(*) OVER ()::BIGINT
      FROM public.sources s
      LEFT JOIN public.quotes q ON q.source_id = s.id AND q.status = 'published'
        AND EXISTS (SELECT 1 FROM public.scholars qs WHERE qs.id = q.scholar_id AND NOT qs.is_archived)
        AND EXISTS (SELECT 1 FROM public.sources qso WHERE qso.id = q.source_id AND NOT qso.is_archived)
        AND (q.translator_id IS NULL OR EXISTS (SELECT 1 FROM public.translators qtr WHERE qtr.id = q.translator_id AND NOT qtr.is_archived))
      WHERE NOT s.is_archived
        AND (nullif(trim(coalesce(p_search, '')), '') IS NULL OR s.title ILIKE v_pattern)
      GROUP BY s.id
      ORDER BY s.title, s.id
      OFFSET p_offset LIMIT p_limit;
  ELSE
    RETURN QUERY
      SELECT t.id, t.slug, t.name::TEXT, NULL::TEXT,
        NULL::TEXT, t.bio::TEXT, count(q.id)::BIGINT, t.updated_at,
        count(*) OVER ()::BIGINT
      FROM public.translators t
      LEFT JOIN public.quotes q ON q.translator_id = t.id AND q.status = 'published'
        AND EXISTS (SELECT 1 FROM public.scholars qs WHERE qs.id = q.scholar_id AND NOT qs.is_archived)
        AND (q.source_id IS NULL OR EXISTS (SELECT 1 FROM public.sources qso WHERE qso.id = q.source_id AND NOT qso.is_archived))
        AND EXISTS (SELECT 1 FROM public.translators qtr WHERE qtr.id = q.translator_id AND NOT qtr.is_archived)
      WHERE NOT t.is_archived
        AND (nullif(trim(coalesce(p_search, '')), '') IS NULL OR t.name ILIKE v_pattern)
      GROUP BY t.id
      ORDER BY t.name, t.id
      OFFSET p_offset LIMIT p_limit;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_directory(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_directory(TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

COMMIT;
