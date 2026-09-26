import type { MetadataRoute } from 'next'
import { getSitemapRecordCounts, getSitemapRecordsPage } from '@/data/public'
import { getSiteUrl } from '@/lib/site'
import { renderSitemap, SITEMAP_PAGE_SIZE, sitemapChunkCount, sitemapRecordTotal, sitemapUnavailable, staticSitemapEntries } from '@/lib/sitemap'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rawId = (await params).id
  if (!/^(0|[1-9]\d*)$/.test(rawId)) return new Response('Not found', { status: 404 })
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id < 0) return new Response('Not found', { status: 404 })
  const countResult = await getSitemapRecordCounts()
  if (!countResult.ok) return sitemapUnavailable()
  const count = sitemapChunkCount(sitemapRecordTotal(countResult.data))
  if (id >= count) return new Response('Not found', { status: 404 })

  const baseUrl = getSiteUrl()
  const entries: MetadataRoute.Sitemap = id === 0 ? staticSitemapEntries(baseUrl) : []
  const result = await getSitemapRecordsPage(id * SITEMAP_PAGE_SIZE, SITEMAP_PAGE_SIZE, countResult.data)
  if (!result.ok) return sitemapUnavailable()
  const add = (records: Array<{ slug: string; updated_at: string }>, segment: string, priority: number) => {
    for (const record of records) entries.push({ url: `${baseUrl}/${segment}/${encodeURIComponent(record.slug)}`, lastModified: new Date(record.updated_at), changeFrequency: 'monthly', priority })
  }
  add(result.data.quotes, 'quotes', 0.8)
  add(result.data.scholars, 'scholars', 0.7)
  add(result.data.categories, 'categories', 0.7)
  add(result.data.sources, 'sources', 0.7)
  add(result.data.translators, 'translators', 0.6)
  return new Response(renderSitemap(entries), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } })
}
