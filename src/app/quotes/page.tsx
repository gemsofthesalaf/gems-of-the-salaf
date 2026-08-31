import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Filter, Search } from 'lucide-react'
import { QuoteCard } from '@/components/quotes/QuoteCard'
import { DataUnavailable, EmptyState } from '@/components/common/DataState'
import { Pagination } from '@/components/common/Pagination'
import { getQuoteFilterOptions, searchQuotes } from '@/data/public'
import { parseQuoteSearchParams, type QuoteSearchParams } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Quote archive',
  description: 'Search published Arabic and English quotations by scholar, category, source, translator, and tag.',
  alternates: { canonical: '/quotes' },
  openGraph: {
    title: 'Quote archive',
    description: 'Search published Arabic and English quotations by scholar, category, source, translator, and tag.',
    url: '/quotes',
  },
}

type RawSearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function QuotesPage({ searchParams }: { searchParams: RawSearchParams }) {
  const rawParams = await searchParams
  const params = parseQuoteSearchParams(rawParams)
  if (hasNonCanonicalSearchParams(rawParams, params)) redirect(buildQuoteUrl(params))
  const [quotes, filters] = await Promise.all([searchQuotes(params), getQuoteFilterOptions()])

  if (quotes.ok && quotes.data.total > 0 && params.page > quotes.data.totalPages) {
    redirect(buildQuoteUrl({ ...params, page: quotes.data.totalPages }))
  }

  const hasFilters = Boolean(
    params.q || params.scholar || params.category || params.source || params.translator || params.tag,
  )

  return (
    <div className="page-shell archive-page">
      <header className="page-header">
        <span className="page-kicker">Published collection</span>
        <h1>Quote archive</h1>
        <p>Search the database without loading the collection into your browser. Every result is published and returned from the archive query.</p>
      </header>

      <form className="archive-filters" method="get" action="/quotes" role="search">
        <div className="archive-search-row">
          <label htmlFor="archive-search" className="sr-only">Search the quote archive</label>
          <div className="search-input-wrap">
            <Search aria-hidden="true" />
            <input id="archive-search" name="q" type="search" maxLength={200} defaultValue={params.q} placeholder="Search English, Arabic, scholars, sources, categories, or tags" />
          </div>
          <button type="submit">Search</button>
          {hasFilters ? <Link href="/quotes" className="clear-link">Clear</Link> : null}
        </div>
        <div className="filter-grid" aria-label="Archive filters">
          <FilterSelect name="scholar" label="Scholar" value={params.scholar} options={filters.ok ? filters.data.scholars : []} />
          <FilterSelect name="category" label="Category" value={params.category} options={filters.ok ? filters.data.categories : []} />
          <FilterSelect name="source" label="Source" value={params.source} options={filters.ok ? filters.data.sources : []} />
          <FilterSelect name="translator" label="Translator" value={params.translator} options={filters.ok ? filters.data.translators : []} />
          <FilterSelect name="tag" label="Tag" value={params.tag} options={filters.ok ? filters.data.tags : []} />
          <label className="filter-field">
            <span>Sort</span>
            <select name="sort" defaultValue={params.sort}>
              <option value="latest">Latest published</option>
              <option value="oldest">Oldest published</option>
              <option value="scholar">Scholar A–Z</option>
              <option value="source">Source A–Z</option>
            </select>
          </label>
          <button type="submit" className="apply-filters"><Filter aria-hidden="true" /> Apply filters</button>
        </div>
      </form>

      {!quotes.ok ? <DataUnavailable message={quotes.message} /> : (
        <section className="archive-results" aria-labelledby="results-heading">
          <div className="results-heading-row">
            <div>
              <span>{quotes.data.total.toLocaleString()} {quotes.data.total === 1 ? 'result' : 'results'}</span>
              <h2 id="results-heading">{hasFilters ? 'Matching quotes' : 'All published quotes'}</h2>
            </div>
            {quotes.data.total > 0 ? <p>Page {params.page} of {quotes.data.totalPages}</p> : null}
          </div>
          {quotes.data.items.length ? (
            <div className="quote-list">{quotes.data.items.map((quote) => <QuoteCard key={quote.id} quote={quote} />)}</div>
          ) : (
            <EmptyState title="No quotes match this search" description="Try a shorter phrase, remove a filter, or check the spelling." clearHref="/quotes" />
          )}
          <Pagination pathname="/quotes" params={searchRecord(params)} page={params.page} totalPages={quotes.data.totalPages} />
        </section>
      )}
    </div>
  )
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string
  label: string
  value?: string
  options: Array<{ id: string; slug: string; label: string }>
}) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select name={name} defaultValue={value ?? ''}>
        <option value="">All {label === 'Category' ? 'categories' : `${label.toLowerCase()}s`}</option>
        {options.map((option) => <option key={option.id} value={option.slug}>{option.label}</option>)}
      </select>
    </label>
  )
}

function searchRecord(params: QuoteSearchParams): Record<string, string | undefined> {
  return {
    q: params.q || undefined,
    scholar: params.scholar,
    category: params.category,
    source: params.source,
    translator: params.translator,
    tag: params.tag,
    sort: params.sort === 'latest' ? undefined : params.sort,
  }
}

function buildQuoteUrl(params: QuoteSearchParams): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...searchRecord(params), page: params.page > 1 ? String(params.page) : undefined })) {
    if (value) query.set(key, value)
  }
  return query.size ? `/quotes?${query}` : '/quotes'
}

function hasNonCanonicalSearchParams(raw: Record<string, string | string[] | undefined>, params: QuoteSearchParams): boolean {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value
  return Object.values(raw).some((value) => first(value) === '')
    || first(raw.sort) === 'latest'
    || (typeof first(raw.q) === 'string' && first(raw.q) !== params.q)
}
