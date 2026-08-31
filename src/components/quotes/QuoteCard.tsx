import Link from 'next/link'
import { ArrowUpRight, BookOpen, Sparkles } from 'lucide-react'
import { QuoteCardActions } from '@/components/quotes/QuoteCardActions'
import type { QuoteListItem } from '@/data/public'
import { absoluteUrl } from '@/lib/site'

export function QuoteCard({ quote, compact = false }: { quote: QuoteListItem; compact?: boolean }) {
  return (
    <article className="quote-card">
      <header className="quote-card-header">
        <div>
          <Link href={`/scholars/${quote.scholar.slug}`} className="quote-scholar">
            {quote.scholar.name}
          </Link>
          {quote.scholar.deathYear ? <span className="quote-death-year">d. {quote.scholar.deathYear}</span> : null}
        </div>
        {quote.featured ? <span className="featured-label"><Sparkles aria-hidden="true" /> Featured</span> : null}
      </header>

      {quote.arabicText ? (
        <p dir="rtl" lang="ar" className={compact ? 'quote-arabic is-compact' : 'quote-arabic'}>
          {quote.arabicText}
        </p>
      ) : null}
      <p className={compact ? 'quote-english is-compact' : 'quote-english'}>{quote.englishText}</p>

      <footer className="quote-card-footer">
        <div className="quote-source-line">
          <BookOpen aria-hidden="true" />
          {quote.source ? (
            <Link href={`/sources/${quote.source.slug}`}>{quote.source.title}</Link>
          ) : quote.book ? (
            <span>{quote.book}</span>
          ) : (
            <span>Source details not recorded</span>
          )}
        </div>
        <div className="quote-card-controls">
          <QuoteCardActions text={quote.englishText} url={absoluteUrl(`/quotes/${quote.slug}`)} />
          <Link href={`/quotes/${quote.slug}`} className="read-quote-link">
            Read quote <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </article>
  )
}
