import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { DataUnavailable } from '@/components/common/DataState'
import { JsonLd } from '@/components/common/JsonLd'
import { EntityQuoteCollection } from '@/components/directory/EntityQuoteCollection'
import { getScholarBySlug } from '@/data/public'
import { absoluteUrl, truncateDescription } from '@/lib/site'
import { parsePageParam, slugSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) return { title: 'Scholar not found', robots: { index: false, follow: false } }
  const result = await getScholarBySlug(parsed.data)
  if (!result.ok || !result.data) return { title: 'Scholar not found', robots: { index: false, follow: false } }
  const scholar = result.data
  const description = truncateDescription(scholar.biography ?? `Browse published quotations attributed to ${scholar.english_name}.`)
  const path = `/scholars/${scholar.slug}`
  return { title: scholar.english_name, description, alternates: { canonical: path }, openGraph: { title: scholar.english_name, description, url: path, images: [] }, twitter: { card: 'summary', title: scholar.english_name, description, images: [] } }
}

export default async function ScholarPage({ params, searchParams }: Props) {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) notFound()
  const result = await getScholarBySlug(parsed.data)
  if (!result.ok) return <div className="page-shell"><DataUnavailable message={result.message} headingLevel={1} /></div>
  if (!result.data) notFound()
  const scholar = result.data
  const page = parsePageParam((await searchParams).page)
  const schema = {
    '@context': 'https://schema.org', '@type': 'Person', name: scholar.english_name,
    alternateName: scholar.arabic_name ?? undefined, description: scholar.biography ?? undefined,
    url: absoluteUrl(`/scholars/${scholar.slug}`),
  }
  return (
    <div className="page-shell entity-page">
      <JsonLd value={schema} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Scholars', href: '/scholars' }, { label: scholar.english_name }]} />
      <header className="entity-hero">
        <span>Scholar record</span><h1>{scholar.english_name}</h1>
        {scholar.arabic_name ? <p className="entity-arabic" lang="ar" dir="rtl">{scholar.arabic_name}</p> : null}
        {scholar.death_year ? <p className="entity-meta">Recorded death year: {scholar.death_year}</p> : null}
        {scholar.biography ? <p className="entity-description">{scholar.biography}</p> : null}
      </header>
      <EntityQuoteCollection heading={`Quotes attributed to ${scholar.english_name}`} pathname={`/scholars/${scholar.slug}`} filter={{ scholar: scholar.slug }} page={page} />
    </div>
  )
}
