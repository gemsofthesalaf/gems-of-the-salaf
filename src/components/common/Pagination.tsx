import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function pageHref(pathname: string, params: Record<string, string | undefined>, page: number): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== 'page') query.set(key, value)
  }
  if (page > 1) query.set('page', String(page))
  const serialized = query.toString()
  return serialized ? `${pathname}?${serialized}` : pathname
}

function visiblePages(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const valid = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const result: Array<number | 'ellipsis'> = []
  valid.forEach((page, index) => {
    const previous = valid[index - 1]
    if (previous && page - previous > 1) result.push('ellipsis')
    result.push(page)
  })
  return result
}

export function Pagination({
  pathname,
  params,
  page,
  totalPages,
}: {
  pathname: string
  params: Record<string, string | undefined>
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null
  const safePage = Math.min(Math.max(page, 1), totalPages)

  return (
    <nav className="pagination" aria-label="Pagination">
      <Link
        href={pageHref(pathname, params, safePage - 1)}
        aria-disabled={safePage === 1}
        tabIndex={safePage === 1 ? -1 : undefined}
        className={cn('pagination-link pagination-direction', safePage === 1 && 'is-disabled')}
      >
        <ChevronLeft aria-hidden="true" />
        <span>Previous</span>
      </Link>
      <div className="pagination-pages">
        {visiblePages(safePage, totalPages).map((item, index) => item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="pagination-ellipsis" aria-hidden="true">…</span>
        ) : (
          <Link
            key={item}
            href={pageHref(pathname, params, item)}
            className={cn('pagination-link', item === safePage && 'is-current')}
            aria-current={item === safePage ? 'page' : undefined}
            aria-label={`Page ${item}`}
          >
            {item}
          </Link>
        ))}
      </div>
      <Link
        href={pageHref(pathname, params, safePage + 1)}
        aria-disabled={safePage === totalPages}
        tabIndex={safePage === totalPages ? -1 : undefined}
        className={cn('pagination-link pagination-direction', safePage === totalPages && 'is-disabled')}
      >
        <span>Next</span>
        <ChevronRight aria-hidden="true" />
      </Link>
    </nav>
  )
}
