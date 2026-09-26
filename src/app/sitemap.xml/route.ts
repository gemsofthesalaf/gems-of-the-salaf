import { getSitemapRecordCounts } from '@/data/public'
import { getSiteUrl } from '@/lib/site'
import { renderSitemapIndex, sitemapChunkCount, sitemapRecordTotal, sitemapUnavailable } from '@/lib/sitemap'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await getSitemapRecordCounts()
  if (!result.ok) return sitemapUnavailable()
  const count = sitemapChunkCount(sitemapRecordTotal(result.data))
  const baseUrl = getSiteUrl()
  const urls = Array.from({ length: count }, (_, id) => `${baseUrl}/sitemaps/${id}`)
  return new Response(renderSitemapIndex(urls), { headers: xmlHeaders() })
}

function xmlHeaders() {
  return { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' }
}
