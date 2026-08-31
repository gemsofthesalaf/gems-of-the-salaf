// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderSitemap, renderSitemapIndex, SITEMAP_PAGE_SIZE, sitemapChunkCount, staticSitemapEntries } from '@/lib/sitemap'

describe('scaled sitemap generation', () => {
  it('splits a 100,000-quote archive into bounded chunks', () => {
    expect(SITEMAP_PAGE_SIZE).toBeLessThan(50_000)
    expect(sitemapChunkCount(100_000)).toBe(3)
    expect(sitemapChunkCount(0)).toBe(1)
  })

  it('emits valid index and URL-set structures without admin URLs', () => {
    const index = renderSitemapIndex(['https://gemsofthesalaf.com/sitemaps/0'])
    const sitemap = renderSitemap(staticSitemapEntries('https://gemsofthesalaf.com'))
    expect(index).toContain('<sitemapindex')
    expect(index).toContain('/sitemaps/0</loc>')
    expect(sitemap).toContain('<urlset')
    expect(sitemap).toContain('/quotes</loc>')
    expect(sitemap).not.toContain('/admin')
  })

  it('escapes XML metacharacters', () => {
    const xml = renderSitemap([{ url: 'https://example.com/?a=1&b=2' }])
    expect(xml).toContain('a=1&amp;b=2')
  })
})
