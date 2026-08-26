import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gemsofthesalaf.com'

  // Fetch all dynamic routes (published quotes, scholars, sources, categories, etc.)
   
  const [{ data: quotes }, { data: scholars }, { data: categories }, { data: sources }] = await Promise.all([
    supabase.from('quotes').select('slug, updated_at').eq('status', 'published'),
    supabase.from('scholars').select('slug, updated_at'),
    supabase.from('categories').select('slug, updated_at'),
    supabase.from('sources').select('slug, updated_at')
  ])

  type RecordWithSlug = { slug: string; updated_at: string | null }

  const quoteEntries: MetadataRoute.Sitemap = ((quotes as unknown as RecordWithSlug[]) || []).map((quote) => ({
    url: `${baseUrl}/quotes/${quote.slug}`,
    lastModified: quote.updated_at ? new Date(quote.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const scholarEntries: MetadataRoute.Sitemap = ((scholars as unknown as RecordWithSlug[]) || []).map((scholar) => ({
    url: `${baseUrl}/scholars/${scholar.slug}`,
    lastModified: scholar.updated_at ? new Date(scholar.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const categoryEntries: MetadataRoute.Sitemap = ((categories as unknown as RecordWithSlug[]) || []).map((category) => ({
    url: `${baseUrl}/categories/${category.slug}`,
    lastModified: category.updated_at ? new Date(category.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const sourceEntries: MetadataRoute.Sitemap = ((sources as unknown as RecordWithSlug[]) || []).map((source) => ({
    url: `${baseUrl}/sources/${source.slug}`,
    lastModified: source.updated_at ? new Date(source.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/quotes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/scholars`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sources`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...quoteEntries,
    ...scholarEntries,
    ...categoryEntries,
    ...sourceEntries,
  ]
}
