import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { DataUnavailable } from '@/components/common/DataState'
import { JsonLd } from '@/components/common/JsonLd'
import { EntityQuoteCollection } from '@/components/directory/EntityQuoteCollection'
import { getSourceBySlug } from '@/data/public'
import { absoluteUrl, truncateDescription } from '@/lib/site'
import { parsePageParam, slugSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) return { title: 'Source not found', robots: { index: false, follow: false } }
  const result = await getSourceBySlug(parsed.data)
  if (!result.ok || !result.data) return { title: 'Source not found', robots: { index: false, follow: false } }
  const source = result.data
  const description = truncateDescription(`Browse published quotations recorded from ${source.title}${source.author ? ` by ${source.author}` : ''}.`)
  const path = `/sources/${source.slug}`
  return { title: source.title, description, alternates: { canonical: path }, openGraph: { title: source.title, description, url: path, images: [] }, twitter: { card: 'summary', title: source.title, description, images: [] } }
}

export default async function SourcePage({ params, searchParams }: Props) {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) notFound()
  const result = await getSourceBySlug(parsed.data)
  if (!result.ok) return <div className="page-shell"><DataUnavailable message={result.message} headingLevel={1} /></div>
  if (!result.data) notFound()
  const source = result.data
  const page = parsePageParam((await searchParams).page)
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: source.title, url: absoluteUrl(`/sources/${source.slug}`) }
  return (
    <div className="page-shell entity-page">
      <JsonLd value={schema} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Sources', href: '/sources' }, { label: source.title }]} />
      <header className="entity-hero"><span>Source record</span><h1>{source.title}</h1>{source.arabic_title ? <p className="entity-arabic" lang="ar" dir="rtl">{source.arabic_title}</p> : null}{source.author ? <p className="entity-meta">Author: {source.author}</p> : null}</header>
      {(source.publisher || source.edition) ? <dl className="source-citation">{source.publisher ? <div><dt>Publisher</dt><dd>{source.publisher}</dd></div> : null}{source.edition ? <div><dt>Edition</dt><dd>{source.edition}</dd></div> : null}</dl> : null}
      <EntityQuoteCollection heading={`Quotes recorded from ${source.title}`} pathname={`/sources/${source.slug}`} filter={{ source: source.slug }} page={page} />
    </div>
  )
}
