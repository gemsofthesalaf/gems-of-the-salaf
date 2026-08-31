import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, ExternalLink, Languages, Tags, UserRound } from 'lucide-react'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { DataUnavailable } from '@/components/common/DataState'
import { JsonLd } from '@/components/common/JsonLd'
import { QuoteActions } from '@/components/quotes/QuoteActions'
import { QuoteCard } from '@/components/quotes/QuoteCard'
import { getQuoteBySlug, getRelatedQuotes } from '@/data/public'
import { absoluteUrl, truncateDescription } from '@/lib/site'
import { slugSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rawSlug = (await params).slug
  const parsed = slugSchema.safeParse(rawSlug)
  if (!parsed.success) return { title: 'Quote not found', robots: { index: false, follow: false } }
  const result = await getQuoteBySlug(parsed.data)
  if (!result.ok || !result.data) return { title: 'Quote not found', robots: { index: false, follow: false } }

  const quote = result.data
  const title = `Quote by ${quote.scholar.english_name}`
  const description = truncateDescription(quote.englishText)
  const path = `/quotes/${quote.slug}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: 'article', images: [] },
    twitter: { card: 'summary', title, description, images: [] },
  }
}

export default async function QuoteDetailPage({ params }: Props) {
  const parsed = slugSchema.safeParse((await params).slug)
  if (!parsed.success) notFound()
  const result = await getQuoteBySlug(parsed.data)
  if (!result.ok) return <div className="page-shell"><DataUnavailable message={result.message} headingLevel={1} /></div>
  if (!result.data) notFound()
  const quote = result.data
  const related = await getRelatedQuotes(quote)
  const canonicalUrl = absoluteUrl(`/quotes/${quote.slug}`)
  const externalReference = quote.externalReference && /^https?:\/\//i.test(quote.externalReference)
    ? quote.externalReference
    : null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Quote by ${quote.scholar.english_name}`,
    url: canonicalUrl,
    description: truncateDescription(quote.englishText),
    datePublished: quote.publishedAt ?? undefined,
    dateModified: quote.updatedAt,
    mainEntity: {
      '@type': 'Quotation',
      text: quote.englishText,
      spokenByCharacter: quote.scholar.english_name,
    },
  }

  return (
    <div className="page-shell quote-detail-page">
      <JsonLd value={schema} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Quotes', href: '/quotes' }, { label: quote.scholar.english_name }]} />

      <article className="quote-detail">
        <header className="quote-detail-heading">
          <span>Published quotation</span>
          <h1>Words attributed to <Link href={`/scholars/${quote.scholar.slug}`}>{quote.scholar.english_name}</Link></h1>
          {quote.scholar.arabic_name ? <p lang="ar" dir="rtl">{quote.scholar.arabic_name}</p> : null}
        </header>
        <div className="quote-detail-text">
          {quote.arabicText ? <blockquote lang="ar" dir="rtl" className="detail-arabic">{quote.arabicText}</blockquote> : null}
          <blockquote className="detail-english">{quote.englishText}</blockquote>
        </div>
        <QuoteActions arabicText={quote.arabicText} englishText={quote.englishText} canonicalUrl={canonicalUrl} />
      </article>

      <section className="metadata-panel" aria-labelledby="record-heading">
        <div className="section-heading compact"><div><span>Recorded information</span><h2 id="record-heading">Attribution and source</h2></div></div>
        <dl className="metadata-grid">
          <MetadataItem icon={<UserRound />} label="Scholar">
            <Link href={`/scholars/${quote.scholar.slug}`}>{quote.scholar.english_name}</Link>
            {quote.scholar.death_year ? <small>d. {quote.scholar.death_year}</small> : null}
          </MetadataItem>
          {quote.source ? (
            <MetadataItem icon={<BookOpen />} label="Source">
              <Link href={`/sources/${quote.source.slug}`}>{quote.source.title}</Link>
              {quote.source.arabic_title ? <small lang="ar" dir="rtl">{quote.source.arabic_title}</small> : null}
              {quote.source.author ? <small>{quote.source.author}</small> : null}
            </MetadataItem>
          ) : quote.book ? <MetadataItem icon={<BookOpen />} label="Book"><span>{quote.book}</span></MetadataItem> : null}
          {quote.translator ? (
            <MetadataItem icon={<Languages />} label="Translator"><Link href={`/translators/${quote.translator.slug}`}>{quote.translator.name}</Link></MetadataItem>
          ) : null}
          {quote.categories.length || quote.tags.length ? (
            <MetadataItem icon={<Tags />} label="Topics">
              <div className="chip-list">
                {quote.categories.map((category) => <Link key={category.id} href={`/categories/${category.slug}`}>{category.name}</Link>)}
                {quote.tags.map((tag) => <Link key={tag.id} href={`/quotes?tag=${encodeURIComponent(tag.slug)}`}>#{tag.name}</Link>)}
              </div>
            </MetadataItem>
          ) : null}
          {quote.volume ? <MetadataItem label="Volume"><span>{quote.volume}</span></MetadataItem> : null}
          {quote.page ? <MetadataItem label="Page"><span>{quote.page}</span></MetadataItem> : null}
          {quote.chapter ? <MetadataItem label="Chapter"><span>{quote.chapter}</span></MetadataItem> : null}
          {quote.edition || quote.source?.edition ? <MetadataItem label="Edition"><span>{quote.edition ?? quote.source?.edition}</span></MetadataItem> : null}
          {externalReference ? (
            <MetadataItem label="External reference"><a href={externalReference} target="_blank" rel="noreferrer">Open reference <ExternalLink aria-hidden="true" /></a></MetadataItem>
          ) : null}
        </dl>
      </section>

      <section aria-labelledby="related-heading">
        <div className="section-heading"><div><span>Continue exploring</span><h2 id="related-heading">Related quotes</h2></div></div>
        {!related.ok ? <DataUnavailable message={related.message} /> : related.data.length ? (
          <div className="quote-grid">{related.data.map((item) => <QuoteCard key={item.id} quote={item} compact />)}</div>
        ) : <p className="quiet-empty">No related published quotations are available yet.</p>}
      </section>
    </div>
  )
}

function MetadataItem({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{icon}<span>{label}</span></dt>
      <dd>{children}</dd>
    </div>
  )
}
