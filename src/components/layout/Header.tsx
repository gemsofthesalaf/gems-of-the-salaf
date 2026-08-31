'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { BookOpen, Menu, Search, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TELEGRAM_URL } from '@/lib/site'

const navigation = [
  { href: '/quotes', label: 'Quotes' },
  { href: '/scholars', label: 'Scholars' },
  { href: '/categories', label: 'Categories' },
  { href: '/sources', label: 'Sources' },
  { href: '/translators', label: 'Translators' },
  { href: '/about', label: 'About' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  if (pathname.startsWith('/admin')) return null

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-link" aria-label="Gems of the Salaf home">
          <span className="brand-mark" aria-hidden="true"><BookOpen /></span>
          <span className="brand-copy">
            <span className="brand-arabic" lang="ar" dir="rtl">جواهر السلف</span>
            <span className="brand-english">Gems of the Salaf</span>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>

        <div className="header-actions">
          <Button asChild variant="ghost" size="icon" className="desktop-search">
            <Link href="/quotes" aria-label="Search the archive"><Search /></Link>
          </Button>
          <Button asChild variant="outline" className="desktop-telegram">
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer"><Send /> Telegram</a>
          </Button>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button type="button" variant="ghost" size="icon" className="mobile-menu-trigger" aria-label="Open navigation menu">
                <Menu />
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="mobile-nav-overlay" />
              <Dialog.Content className="mobile-nav-content" aria-describedby={undefined}>
                <div className="mobile-nav-header">
                  <Dialog.Title>Navigation</Dialog.Title>
                  <Dialog.Close asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Close navigation menu"><X /></Button>
                  </Dialog.Close>
                </div>
                <nav aria-label="Mobile navigation" className="mobile-nav-links">
                  {navigation.map((item) => (
                    <Dialog.Close asChild key={item.href}>
                      <Link href={item.href}>{item.label}</Link>
                    </Dialog.Close>
                  ))}
                </nav>
                <div className="mobile-nav-footer">
                  <Dialog.Close asChild>
                    <a href={TELEGRAM_URL} target="_blank" rel="noreferrer"><Send /> Visit the Telegram channel</a>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  )
}
