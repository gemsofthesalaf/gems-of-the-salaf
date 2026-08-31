import { redirect } from 'next/navigation'
import { QuoteCard } from '@/components/quotes/QuoteCard'
import { DataUnavailable, EmptyState } from '@/components/common/DataState'
import { Pagination } from '@/components/common/Pagination'
import { searchQuotes } from '@/data/public'
import type { QuoteSearchParams } from '@/lib/validation'

export async function EntityQuoteCollection({
  heading,
  pathname,
  filter,
  page,
}: {
  heading: string
  pathname: string
  filter: Pick<QuoteSearchParams, 'scholar' | 'category' | 'source' | 'translator'>
  page: number
}) {
  const params: QuoteSearchParams = { q: '', sort: 'latest', page, ...filter }
  const result = await searchQuotes(params, 12)

  if (result.ok && result.data.total > 0 && page > result.data.totalPages) {
    redirect(result.data.totalPages > 1 ? `${pathname}?page=${result.data.totalPages}` : pathname)
  }
  if (!result.ok) return <DataUnavailable message={result.message} />

  return (
    <section className="entity-quotes" aria-labelledby="entity-quotes-heading">
      <div className="results-heading-row">
        <div><span>{result.data.total.toLocaleString()} {result.data.total === 1 ? 'quote' : 'quotes'}</span><h2 id="entity-quotes-heading">{heading}</h2></div>
        {result.data.total > 0 ? <p>Page {page} of {result.data.totalPages}</p> : null}
      </div>
      {result.data.items.length ? (
        <div className="quote-list">{result.data.items.map((quote) => <QuoteCard key={quote.id} quote={quote} />)}</div>
      ) : <EmptyState title="No published quotes yet" description="There are no published quotations linked to this record." />}
      <Pagination pathname={pathname} params={{}} page={page} totalPages={result.data.totalPages} />
    </section>
  )
}
