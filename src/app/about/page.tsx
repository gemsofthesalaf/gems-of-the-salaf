import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, CheckCircle2, Search, Send } from 'lucide-react'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { TELEGRAM_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About the archive',
  description: 'Learn how Gems of the Salaf organizes quotations, source details, translations, scholars, and topics.',
  alternates: { canonical: '/about' },
  openGraph: { title: 'About Gems of the Salaf', description: 'How the scholarly quote archive is organized and navigated.', url: '/about' },
}

export default function AboutPage() {
  return (
    <div className="page-shell about-page">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
      <header className="page-header">
        <span className="page-kicker">About the project</span>
        <h1>A careful, navigable quotation archive.</h1>
        <p>Gems of the Salaf is designed to make reviewed beneficial sayings easier to find while keeping the Arabic text, English rendering, attribution, and recorded source information visibly connected.</p>
      </header>
      <section className="about-grid" aria-label="Archive principles">
        <article><BookOpen aria-hidden="true" /><h2>Purpose</h2><p>The project provides a structured public archive rather than a stream of disconnected images or posts. Each published entry has a stable page and links into the wider collection.</p></article>
        <article><CheckCircle2 aria-hidden="true" /><h2>Content integrity</h2><p>The site does not fill missing citations, biographies, page numbers, or translator details with guesses. Optional fields remain absent until editors record them.</p></article>
        <article><Search aria-hidden="true" /><h2>Navigation</h2><p>Search English and Arabic text, then narrow results by scholar, category, source, translator, or tag. Directory pages provide another way to move through the archive.</p></article>
      </section>
      <section className="about-philosophy">
        <div><span>Sources and translations</span><h2>What the record shows</h2></div>
        <div><p>A source citation reflects the information stored for that quotation. The English text is associated with a translator only when that relationship has been recorded. Where edition, volume, page, chapter, or an external reference is available, it is shown on the quote page; otherwise it is omitted.</p><p>The public site includes only published quotations. Draft and archived editorial records remain inside the protected administration area.</p></div>
      </section>
      <section className="about-cta">
        <div><h2>Explore the archive</h2><p>Begin with a search, browse a directory, or visit the project’s Telegram channel.</p></div>
        <div><Link href="/quotes">Search quotes <ArrowRight aria-hidden="true" /></Link><a href={TELEGRAM_URL} target="_blank" rel="noreferrer"><Send aria-hidden="true" /> Telegram channel</a></div>
      </section>
    </div>
  )
}
