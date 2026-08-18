const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  let queryBuilder = supabase.from('quotes')
    .select(`
      *,
      scholars!inner ( english_name, slug, death_year )
    `, { count: 'exact' })
    .eq('status', 'published');

  const { data, error, count } = await queryBuilder
    .order('published_at', { ascending: false })
    .range(0, 19);

  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS:', data?.length, count);
  }
}

test();
