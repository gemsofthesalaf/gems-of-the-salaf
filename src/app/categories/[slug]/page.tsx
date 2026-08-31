import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { DataUnavailable } from '@/components/common/DataState'
import { JsonLd } from '@/components/common/JsonLd'
import { EntityQuoteCollection } from '@/components/directory/EntityQuoteCollection'
import { getCategoryBySlug } from '@/data/public'
import { absoluteUrl, truncateDescription } from '@/lib/site'
import { parsePageParam, slugSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) return { title: 'Category not found', robots: { index: false, follow: false } }
  const result = await getCategoryBySlug(parsed.data)
  if (!result.ok || !result.data) return { title: 'Category not found', robots: { index: false, follow: false } }
  const category = result.data
  const description = truncateDescription(category.description ?? `Browse published quotations in the ${category.name} category.`)
  const path = `/categories/${category.slug}`
  return { title: category.name, description, alternates: { canonical: path }, openGraph: { title: category.name, description, url: path, images: [] }, twitter: { card: 'summary', title: category.name, description, images: [] } }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) notFound()
  const result = await getCategoryBySlug(parsed.data)
  if (!result.ok) return <div className="page-shell"><DataUnavailable message={result.message} headingLevel={1} /></div>
  if (!result.data) notFound()
  const category = result.data
  const page = parsePageParam((await searchParams).page)
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: category.name, description: category.description ?? undefined, url: absoluteUrl(`/categories/${category.slug}`) }
  return (
    <div className="page-shell entity-page">
      <JsonLd value={schema} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Categories', href: '/categories' }, { label: category.name }]} />
      <header className="entity-hero"><span>Category record</span><h1>{category.name}</h1>{category.arabic_name ? <p className="entity-arabic" lang="ar" dir="rtl">{category.arabic_name}</p> : null}{category.description ? <p className="entity-description">{category.description}</p> : null}</header>
      <EntityQuoteCollection heading={`Quotes in ${category.name}`} pathname={`/categories/${category.slug}`} filter={{ category: category.slug }} page={page} />
    </div>
  )
}
