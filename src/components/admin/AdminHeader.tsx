'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton'

const links = [
  ['/admin', 'Overview'], ['/admin/quotes', 'Quotes'], ['/admin/scholars', 'Scholars'],
  ['/admin/sources', 'Sources'], ['/admin/categories', 'Categories'],
  ['/admin/translators', 'Translators'], ['/admin/tags', 'Tags'],
] as const

export function AdminHeader() {
  const pathname = usePathname()
  const login = pathname === '/admin/login'
  return <header className="admin-header">
    <Link href={login ? '/' : '/admin'} className="admin-brand"><ShieldCheck aria-hidden="true" /><span>Gems Admin</span></Link>
    {!login && <nav className="admin-nav" aria-label="Administration">{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}</nav>}
    <div className="admin-header-actions"><Link href="/" className="text-link">View site</Link>{!login && <AdminLogoutButton />}</div>
  </header>
}
