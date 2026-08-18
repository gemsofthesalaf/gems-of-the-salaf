import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gemsofthesalaf.com'

  // Fetch all dynamic routes (published quotes, scholars, sources, categories, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: quotes }, { data: scholars }, { data: categories }, { data: sources }] = await Promise.all([
    (supabase.from('quotes') as any).select('slug, updated_at').eq('status', 'published'),
    (supabase.from('scholars') as any).select('slug, updated_at'),
    (supabase.from('categories') as any).select('slug, updated_at'),
    (supabase.from('sources') as any).select('slug, updated_at')
  ])

  const quoteEntries: MetadataRoute.Sitemap = (quotes || []).map((quote: any) => ({
    url: `${baseUrl}/quotes/${quote.slug}`,
    lastModified: new Date(quote.updated_at),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const scholarEntries: MetadataRoute.Sitemap = (scholars || []).map((scholar: any) => ({
    url: `${baseUrl}/scholars/${scholar.slug}`,
    lastModified: new Date(scholar.updated_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const categoryEntries: MetadataRoute.Sitemap = (categories || []).map((category: any) => ({
    url: `${baseUrl}/categories/${category.slug}`,
    lastModified: new Date(category.updated_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const sourceEntries: MetadataRoute.Sitemap = (sources || []).map((source: any) => ({
    url: `${baseUrl}/sources/${source.slug}`,
    lastModified: new Date(source.updated_at),
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
