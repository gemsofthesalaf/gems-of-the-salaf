-- Supabase Seed Data

-- 1. Scholars
INSERT INTO public.scholars (id, slug, english_name, arabic_name, death_year, biography) VALUES
('11111111-1111-1111-1111-111111111111', 'ibn-al-qayyim', 'Ibn al-Qayyim', 'ابن قيم الجوزية', '751 AH', 'A prominent scholar of Islam, student of Ibn Taymiyyah.'),
('22222222-2222-2222-2222-222222222222', 'ibn-taymiyyah', 'Ibn Taymiyyah', 'ابن تيمية', '728 AH', 'A major Islamic scholar and theologian.');

-- 2. Sources
INSERT INTO public.sources (id, slug, title, arabic_title, author) VALUES
('33333333-3333-3333-3333-333333333333', 'al-fawaid', 'Al-Fawa''id', 'الفوائد', 'Ibn al-Qayyim');

-- 3. Categories
INSERT INTO public.categories (id, slug, name, arabic_name) VALUES
('44444444-4444-4444-4444-444444444444', 'tawhid', 'Tawhid', 'التوحيد'),
('55555555-5555-5555-5555-555555555555', 'heart', 'Purification of the Heart', 'تزكية النفس'),
('66666666-6666-6666-6666-666666666666', 'knowledge', 'Knowledge', 'العلم');

-- 4. Quotes (Real verified quote)
INSERT INTO public.quotes (id, slug, arabic_text, english_text, scholar_id, source_id, status, featured, book) VALUES
('77777777-7777-7777-7777-777777777777', 'ibn-al-qayyim-heart-sickness', 
'خراب القلب من الأمن والغفلة، وعمارته من الخشية والذكر', 
'The ruin of the heart comes from feeling secure (from Allah''s punishment) and negligence. Its flourishing comes from fear and remembrance.', 
'11111111-1111-1111-1111-111111111111', 
'33333333-3333-3333-3333-333333333333', 
'published', 
true, 
'Al-Fawa''id');

-- Link Quote to Category
INSERT INTO public.quote_categories (quote_id, category_id) VALUES
('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555');
