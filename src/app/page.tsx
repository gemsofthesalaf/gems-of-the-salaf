import Link from 'next/link'
import { ArrowRight, BookOpen, Library, Search, Send, Users } from 'lucide-react'
import { QuoteCard } from '@/components/quotes/QuoteCard'
import { DataUnavailable, EmptyState } from '@/components/common/DataState'
import { getHomeData } from '@/data/public'
import { TELEGRAM_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const result = await getHomeData()

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-eyebrow"><Library aria-hidden="true" /> Searchable scholarly quote archive</div>
        <h1><span lang="ar" dir="rtl">جواهر السلف</span><span>Gems of the Salaf</span></h1>
        <p>Explore beneficial sayings through Arabic originals, English translations, scholars, topics, source works, and translators—with only the source details actually recorded for each entry.</p>
        <form action="/quotes" method="get" className="hero-search" role="search">
          <label htmlFor="home-search" className="sr-only">Search English, Arabic, scholars, sources, translators, categories, and tags</label>
          <Search aria-hidden="true" />
          <input id="home-search" name="q" type="search" maxLength={200} placeholder="Search English, Arabic, a scholar, or a source…" />
          <button type="submit">Search archive</button>
        </form>
        <div className="hero-actions">
          <Link href="/quotes">Browse quotes <ArrowRight aria-hidden="true" /></Link>
          <Link href="/scholars" className="secondary">Browse scholars <Users aria-hidden="true" /></Link>
          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="text-link"><Send aria-hidden="true" /> Telegram</a>
        </div>
      </section>

      {!result.ok ? (
        <section className="home-data-section"><DataUnavailable message={result.message} /></section>
      ) : (
        <>
          <section className="home-data-section featured-section" aria-labelledby="featured-heading">
            <div className="section-heading">
              <div><span>Selected from the archive</span><h2 id="featured-heading">Featured quote</h2></div>
              <Link href="/quotes?sort=latest">Browse the archive <ArrowRight aria-hidden="true" /></Link>
            </div>
            {result.data.featured ? <QuoteCard quote={result.data.featured} /> : (
              <EmptyState title="No featured quote yet" description="An editor has not selected a featured published quote." />
            )}
          </section>

          <section className="home-data-section" aria-labelledby="latest-heading">
            <div className="section-heading">
              <div><span>Recently published</span><h2 id="latest-heading">Latest quotes</h2></div>
              <Link href="/quotes">View all quotes <ArrowRight aria-hidden="true" /></Link>
            </div>
            {result.data.latest.length ? (
              <div className="quote-grid">{result.data.latest.slice(0, 4).map((quote) => <QuoteCard key={quote.id} quote={quote} compact />)}</div>
            ) : <EmptyState title="The archive is ready for reviewed entries" description="No published quotes are available yet." />}
          </section>

          <BrowseSection title="Browse scholars" eyebrow="People in the archive" icon={<Users />} href="/scholars" items={result.data.scholars.map((item) => ({ ...item, href: `/scholars/${item.slug}` }))} />
          <BrowseSection title="Browse categories" eyebrow="Topics and themes" icon={<Library />} href="/categories" items={result.data.categories.map((item) => ({ ...item, href: `/categories/${item.slug}` }))} />
          <BrowseSection title="Browse sources" eyebrow="Works and references" icon={<BookOpen />} href="/sources" items={result.data.sources.map((item) => ({ ...item, href: `/sources/${item.slug}` }))} />
          <BrowseSection title="Browse translators" eyebrow="English renderings" icon={<span aria-hidden="true">Aa</span>} href="/translators" items={result.data.translators.map((item) => ({ ...item, href: `/translators/${item.slug}` }))} />
        </>
      )}

      <section className="home-about" aria-labelledby="home-about-heading">
        <div>
          <span>About the project</span>
          <h2 id="home-about-heading">A navigable record, built around content integrity.</h2>
        </div>
        <div>
          <p>The archive connects every published quotation to its recorded scholar, source, categories, tags, and translator. Information that has not been established remains absent rather than being filled with assumptions.</p>
          <Link href="/about">How the archive works <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  )
}

function BrowseSection({
  title,
  eyebrow,
  icon,
  href,
  items,
}: {
  title: string
  eyebrow: string
  icon: React.ReactNode
  href: string
  items: Array<{ id: string; name: string; arabicName?: string | null; quoteCount: number; href: string }>
}) {
  return (
    <section className="home-data-section browse-section" aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>
      <div className="section-heading">
        <div><span>{eyebrow}</span><h2 id={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>{title}</h2></div>
        <Link href={href}>View directory <ArrowRight aria-hidden="true" /></Link>
      </div>
      {items.length ? (
        <div className="browse-grid">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="browse-tile">
              <span className="browse-icon" aria-hidden="true">{icon}</span>
              <span className="browse-name">{item.name}</span>
              {item.arabicName ? <span className="browse-arabic" lang="ar" dir="rtl">{item.arabicName}</span> : null}
              <span className="browse-count">{item.quoteCount.toLocaleString()} {item.quoteCount === 1 ? 'quote' : 'quotes'}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : <EmptyState title={`No ${title.toLowerCase()} yet`} description="Published archive records will appear here." />}
    </section>
  )
}
