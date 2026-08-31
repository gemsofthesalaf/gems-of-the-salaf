import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { DataUnavailable } from '@/components/common/DataState'
import { JsonLd } from '@/components/common/JsonLd'
import { EntityQuoteCollection } from '@/components/directory/EntityQuoteCollection'
import { getTranslatorBySlug } from '@/data/public'
import { absoluteUrl, truncateDescription } from '@/lib/site'
import { parsePageParam, slugSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) return { title: 'Translator not found', robots: { index: false, follow: false } }
  const result = await getTranslatorBySlug(parsed.data)
  if (!result.ok || !result.data) return { title: 'Translator not found', robots: { index: false, follow: false } }
  const translator = result.data
  const description = truncateDescription(translator.bio ?? `Browse published English renderings attributed to ${translator.name}.`)
  const path = `/translators/${translator.slug}`
  return { title: translator.name, description, alternates: { canonical: path }, openGraph: { title: translator.name, description, url: path, images: [] }, twitter: { card: 'summary', title: translator.name, description, images: [] } }
}

export default async function TranslatorPage({ params, searchParams }: Props) {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) notFound()
  const result = await getTranslatorBySlug(parsed.data)
  if (!result.ok) return <div className="page-shell"><DataUnavailable message={result.message} headingLevel={1} /></div>
  if (!result.data) notFound()
  const translator = result.data
  const page = parsePageParam((await searchParams).page)
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: translator.name, description: translator.bio ?? undefined, url: absoluteUrl(`/translators/${translator.slug}`) }
  return (
    <div className="page-shell entity-page">
      <JsonLd value={schema} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Translators', href: '/translators' }, { label: translator.name }]} />
      <header className="entity-hero"><span>Translator record</span><h1>{translator.name}</h1>{translator.bio ? <p className="entity-description">{translator.bio}</p> : null}</header>
      <EntityQuoteCollection heading={`Translations attributed to ${translator.name}`} pathname={`/translators/${translator.slug}`} filter={{ translator: translator.slug }} page={page} />
    </div>
  )
}
