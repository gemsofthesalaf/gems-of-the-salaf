'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ExternalLink } from 'lucide-react'
import { TELEGRAM_URL } from '@/lib/site'

const libraryLinks = [
  ['Browse quotes', '/quotes'],
  ['Scholars', '/scholars'],
  ['Categories', '/categories'],
  ['Sources', '/sources'],
  ['Translators', '/translators'],
] as const

export function Footer() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="footer-brand">
          <BookOpen aria-hidden="true" />
          <div>
            <p className="font-arabic" dir="rtl" lang="ar">جواهر السلف</p>
            <p className="font-serif">Gems of the Salaf</p>
          </div>
          <p>A searchable archive presenting reviewed Arabic texts, English translations, and the source information recorded for each entry.</p>
        </div>
        <div>
          <h2>Archive</h2>
          <ul>{libraryLinks.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
        </div>
        <div>
          <h2>Project</h2>
          <ul>
            <li><Link href="/about">About the archive</Link></li>
            <li><a href={TELEGRAM_URL} target="_blank" rel="noreferrer">Telegram <ExternalLink aria-hidden="true" /></a></li>
            <li><Link href="/admin/login">Administrator sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="site-footer-bottom">
        <p>© {new Date().getFullYear()} Gems of the Salaf</p>
        <p>Source details are shown only when recorded by the archive.</p>
      </div>
    </footer>
  )
}
