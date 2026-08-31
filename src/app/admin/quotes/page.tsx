import Link from 'next/link'
import { Search } from 'lucide-react'
import { getAdminQuotes } from '@/data/admin'
import { adminQuoteListSchema } from '@/lib/validation'
import { Pagination } from '@/components/common/Pagination'
import { AdminQuoteActions } from './AdminQuoteActions'

export const dynamic = 'force-dynamic'

export default async function AdminQuotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value
  const filters = adminQuoteListSchema.parse({ q: first(raw.q), status: first(raw.status), sort: first(raw.sort), page: first(raw.page) })
  const result = await getAdminQuotes({ query: filters.q, status: filters.status, sort: filters.sort, page: filters.page })
  return <div className="admin-page">
    <div className="admin-page-heading"><div><p className="eyebrow">Editorial archive</p><h1>Quotes</h1><p>{result.total.toLocaleString()} matching {result.total === 1 ? 'record' : 'records'}.</p></div><Link className="button button-primary" href="/admin/quotes/new">New quote</Link></div>
    <form className="admin-filter-bar" action="/admin/quotes"><label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search quotes</span><input name="q" defaultValue={filters.q} placeholder="Search English translation" maxLength={200} /></label><label><span className="sr-only">Status</span><select name="status" defaultValue={filters.status} className="field-control"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label><span className="sr-only">Sort</span><select name="sort" defaultValue={filters.sort} className="field-control"><option value="newest">Newest created</option><option value="updated">Recently updated</option><option value="oldest">Oldest created</option><option value="scholar">Scholar</option></select></label><button className="button button-secondary" type="submit">Apply</button>{(filters.q || filters.status !== 'all' || filters.sort !== 'newest') && <Link className="text-link" href="/admin/quotes">Clear</Link>}</form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Quotation</th><th scope="col">Scholar</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{result.items.map((quote) => <tr key={quote.id}><td><strong>{quote.englishText.slice(0, 100)}{quote.englishText.length > 100 ? '…' : ''}</strong>{quote.arabicText && <span className="table-arabic" lang="ar" dir="rtl">{quote.arabicText.slice(0, 90)}{quote.arabicText.length > 90 ? '…' : ''}</span>}</td><td>{quote.scholarName}</td><td><span className={`status-badge status-${quote.status}`}>{quote.status}</span>{quote.featured && <span className="status-badge">featured</span>}</td><td><time dateTime={quote.updatedAt}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(quote.updatedAt))}</time></td><td><AdminQuoteActions quote={quote} /></td></tr>)}{!result.items.length && <tr><td colSpan={5} className="empty-cell">No quotes match these filters.</td></tr>}</tbody></table></div>
    <Pagination pathname="/admin/quotes" params={{ q: filters.q || undefined, status: filters.status === 'all' ? undefined : filters.status, sort: filters.sort === 'newest' ? undefined : filters.sort }} page={result.page} totalPages={result.totalPages} />
  </div>
}
