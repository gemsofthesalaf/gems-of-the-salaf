import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Search } from 'lucide-react'
import { DataUnavailable, EmptyState } from '@/components/common/DataState'
import { Pagination } from '@/components/common/Pagination'
import { getDirectory } from '@/data/public'

type DirectoryKind = 'scholars' | 'categories' | 'sources' | 'translators'

const singular: Record<DirectoryKind, string> = {
  scholars: 'scholar',
  categories: 'category',
  sources: 'source',
  translators: 'translator',
}

export async function DirectoryListing({
  kind,
  title,
  description,
  rawSearchParams,
}: {
  kind: DirectoryKind
  title: string
  description: string
  rawSearchParams: Record<string, string | string[] | undefined>
}) {
  const rawQuery = Array.isArray(rawSearchParams.q) ? rawSearchParams.q[0] : rawSearchParams.q
  const rawPage = Array.isArray(rawSearchParams.page) ? rawSearchParams.page[0] : rawSearchParams.page
  const query = (rawQuery ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
  const parsedPage = Number.parseInt(rawPage ?? '1', 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 5000) : 1
  const result = await getDirectory(kind, query, page)

  if (result.ok && result.data.total > 0 && page > result.data.totalPages) {
    const target = new URLSearchParams()
    if (query) target.set('q', query)
    if (result.data.totalPages > 1) target.set('page', String(result.data.totalPages))
    redirect(target.size ? `/${kind}?${target}` : `/${kind}`)
  }

  return (
    <div className="page-shell directory-page">
      <header className="page-header">
        <span className="page-kicker">Archive directory</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <form method="get" action={`/${kind}`} className="directory-search" role="search">
        <label htmlFor={`${kind}-search`} className="sr-only">Search {kind}</label>
        <Search aria-hidden="true" />
        <input id={`${kind}-search`} type="search" name="q" maxLength={160} defaultValue={query} placeholder={`Search ${kind}…`} />
        <button type="submit">Search</button>
        {query ? <Link href={`/${kind}`}>Clear</Link> : null}
      </form>

      {!result.ok ? <DataUnavailable message={result.message} /> : (
        <section aria-labelledby={`${kind}-results`}>
          <div className="results-heading-row">
            <div><span>{result.data.total.toLocaleString()} {result.data.total === 1 ? singular[kind] : kind}</span><h2 id={`${kind}-results`}>{query ? 'Search results' : `All ${kind}`}</h2></div>
            {result.data.total > 0 ? <p>Page {page} of {result.data.totalPages}</p> : null}
          </div>
          {result.data.items.length ? (
            <div className="directory-grid">
              {result.data.items.map((item) => (
                <Link key={item.id} href={`/${kind}/${item.slug}`} className="directory-card">
                  <div>
                    <h3>{item.name}</h3>
                    {item.arabicName ? <p lang="ar" dir="rtl" className="directory-arabic">{item.arabicName}</p> : null}
                    {item.secondary ? <p className="directory-secondary">{item.secondary}</p> : null}
                  </div>
                  {item.description ? <p className="directory-description">{item.description}</p> : null}
                  <footer><span>{item.quoteCount.toLocaleString()} {item.quoteCount === 1 ? 'quote' : 'quotes'}</span><span>Open {singular[kind]} <ArrowRight aria-hidden="true" /></span></footer>
                </Link>
              ))}
            </div>
          ) : <EmptyState title={`No ${kind} found`} description={query ? 'Try a shorter or different search.' : `No ${kind} have been added yet.`} clearHref={`/${kind}`} />}
          <Pagination pathname={`/${kind}`} params={{ q: query || undefined }} page={page} totalPages={result.data.totalPages} />
        </section>
      )}
    </div>
  )
}
