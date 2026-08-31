import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false, follow: false } }

export default function NotFound() {
  return (
    <div className="page-shell not-found-page">
      <SearchX aria-hidden="true" />
      <span>404</span>
      <h1>This page is not in the archive.</h1>
      <p>The address may have changed, or the record may not be published.</p>
      <div><Link href="/"><ArrowLeft aria-hidden="true" /> Return home</Link><Link href="/quotes">Search quotes</Link></div>
    </div>
  )
}
