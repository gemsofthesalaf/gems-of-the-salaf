import type { MetadataRoute } from 'next'

export const SITEMAP_PAGE_SIZE = 35_000

export function sitemapChunkCount(publishedQuotes: number): number {
  return Math.max(1, Math.ceil(Math.max(0, publishedQuotes) / SITEMAP_PAGE_SIZE))
}

export function staticSitemapEntries(baseUrl: string): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; frequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/', frequency: 'weekly', priority: 1 }, { path: '/quotes', frequency: 'daily', priority: 0.9 },
    { path: '/scholars', frequency: 'weekly', priority: 0.8 }, { path: '/categories', frequency: 'weekly', priority: 0.8 },
    { path: '/sources', frequency: 'weekly', priority: 0.8 }, { path: '/translators', frequency: 'weekly', priority: 0.7 },
    { path: '/about', frequency: 'monthly', priority: 0.6 },
  ]
  return routes.map((route) => ({ url: `${baseUrl}${route.path === '/' ? '' : route.path}`, changeFrequency: route.frequency, priority: route.priority }))
}

export function renderSitemap(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map((entry) => {
    const lastModified = entry.lastModified ? `<lastmod>${escapeXml(new Date(entry.lastModified).toISOString())}</lastmod>` : ''
    const frequency = entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : ''
    const priority = entry.priority === undefined ? '' : `<priority>${entry.priority}</priority>`
    return `<url><loc>${escapeXml(entry.url)}</loc>${lastModified}${frequency}${priority}</url>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}

export function renderSitemapIndex(urls: string[]): string {
  const now = new Date().toISOString()
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<sitemap><loc>${escapeXml(url)}</loc><lastmod>${now}</lastmod></sitemap>`).join('')}</sitemapindex>`
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}
