import type { Metadata } from 'next'
import { AdminHeader } from '@/components/admin/AdminHeader'

export const metadata: Metadata = {
  title: { default: 'Administration', template: '%s | Gems Admin' },
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="admin-main">{children}</main>
    </div>
  )
}
