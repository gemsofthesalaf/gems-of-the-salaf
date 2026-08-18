-- 001_initial_schema.sql
-- Gems of the Salaf Database Schema

-- Enable pg_trgm and unaccent for advanced text search (optional but recommended if available on Supabase)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. Scholars
CREATE TABLE public.scholars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    english_name TEXT NOT NULL,
    arabic_name TEXT,
    death_year TEXT, -- e.g. "728 AH / 1328 CE"
    biography TEXT,
    image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sources (Books/Lectures)
CREATE TABLE public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    arabic_title TEXT,
    author TEXT,
    publisher TEXT,
    edition TEXT,
    cover_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Translators
CREATE TABLE public.translators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    arabic_name TEXT,
    description TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tags
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Quotes (The core content)
CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    arabic_text TEXT,
    english_text TEXT NOT NULL,
    scholar_id UUID REFERENCES public.scholars(id) ON DELETE RESTRICT NOT NULL,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    translator_id UUID REFERENCES public.translators(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT false,
    
    -- Citation specifics
    book TEXT,
    volume TEXT,
    page TEXT,
    chapter TEXT,
    edition TEXT,
    external_reference TEXT,
    
    -- Admin data
    admin_notes TEXT,
    
    -- Full text search vectors
    search_vector_en tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(english_text, '') || ' ' || coalesce(book, ''))) STORED,
    search_vector_ar tsvector GENERATED ALWAYS AS (to_tsvector('arabic', coalesce(arabic_text, ''))) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- 7. Quote Categories (Many-to-Many)
CREATE TABLE public.quote_categories (
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (quote_id, category_id)
);

-- 8. Quote Tags (Many-to-Many)
CREATE TABLE public.quote_tags (
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (quote_id, tag_id)
);

-- 9. Admins (Links to auth.users)
CREATE TABLE public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Telegram Imports Queue
CREATE TABLE public.imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_identifier TEXT, -- e.g., Telegram message ID
    raw_text TEXT NOT NULL,
    parsed_arabic TEXT,
    parsed_english TEXT,
    parsed_scholar TEXT,
    parsed_source TEXT,
    duplicate_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    error_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX quotes_status_idx ON public.quotes(status);
CREATE INDEX quotes_scholar_id_idx ON public.quotes(scholar_id);
CREATE INDEX quotes_source_id_idx ON public.quotes(source_id);
CREATE INDEX quotes_published_at_idx ON public.quotes(published_at DESC);
CREATE INDEX quotes_search_en_idx ON public.quotes USING GIN (search_vector_en);
CREATE INDEX quotes_search_ar_idx ON public.quotes USING GIN (search_vector_ar);

CREATE INDEX scholars_slug_idx ON public.scholars(slug);
CREATE INDEX categories_slug_idx ON public.categories(slug);

-- Function for auto-updating updated_at column
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER scholars_updated_at BEFORE UPDATE ON public.scholars FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER translators_updated_at BEFORE UPDATE ON public.translators FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.scholars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies
-- Public can only read published quotes
CREATE POLICY "Public can read published quotes" ON public.quotes
    FOR SELECT USING (status = 'published');

-- Public can read any taxonomies (to show filters, scholar pages, etc.)
CREATE POLICY "Public can read all scholars" ON public.scholars FOR SELECT USING (true);
CREATE POLICY "Public can read all sources" ON public.sources FOR SELECT USING (true);
CREATE POLICY "Public can read all translators" ON public.translators FOR SELECT USING (true);
CREATE POLICY "Public can read all categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public can read all tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Public can read quote categories for published quotes" ON public.quote_categories 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_categories.quote_id AND quotes.status = 'published')
    );
CREATE POLICY "Public can read quote tags for published quotes" ON public.quote_tags 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_tags.quote_id AND quotes.status = 'published')
    );

-- 2. Admin Write/Read Policies
-- For simplicity, since admin actions are executed server-side via Supabase Service Role Key, 
-- they bypass RLS. However, if clients authenticate with Supabase Auth, they need these:
-- Function to check if auth.uid() is an admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE admins.id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Add admin-bypass policies (if using client-side admin tools, though we'll primarily use Server Actions)
CREATE POLICY "Admins have full access to quotes" ON public.quotes TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access to scholars" ON public.scholars TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access to sources" ON public.sources TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access to translators" ON public.translators TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access to categories" ON public.categories TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access to tags" ON public.tags TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access to imports" ON public.imports TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access to quote_categories" ON public.quote_categories TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access to quote_tags" ON public.quote_tags TO authenticated USING (is_admin()) WITH CHECK (is_admin());
