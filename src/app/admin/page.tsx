import Link from 'next/link'
import { BookOpen, FilePenLine, FolderTree, Languages, Library, Tags, Users } from 'lucide-react'
import { getAdminDashboard } from '@/data/admin'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const { counts, activity } = await getAdminDashboard()
  const stats = [
    ['Total quotes', counts.total, FilePenLine], ['Published', counts.published, BookOpen], ['Drafts', counts.drafts, FilePenLine], ['Archived', counts.archived, Library],
    ['Scholars', counts.scholars, Users], ['Sources', counts.sources, Library], ['Categories', counts.categories, FolderTree], ['Translators', counts.translators, Languages],
  ] as const
  return <div className="admin-page">
    <div className="admin-page-heading"><div><p className="eyebrow">Content operations</p><h1>Dashboard</h1><p>Live counts and recent administrative activity.</p></div><div className="button-row"><Link className="button button-primary" href="/admin/quotes/new">New quote</Link><Link className="button button-secondary" href="/admin/quotes?status=draft">Review drafts</Link></div></div>
    <section className="stat-grid" aria-label="Archive statistics">{stats.map(([label, value, Icon]) => <article className="stat-card" key={label}><Icon aria-hidden="true" /><span>{label}</span><strong>{value.toLocaleString()}</strong></article>)}</section>
    <div className="admin-grid-two"><section className="admin-card"><h2>Recent activity</h2>{activity.length ? <ol className="activity-list">{activity.map((item) => <li key={item.id}><span><strong>{item.action}</strong> {item.entity_type}</span><time dateTime={item.created_at}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</time></li>)}</ol> : <p className="empty-copy">No administrative activity has been recorded yet.</p>}</section><section className="admin-card"><h2>Quick actions</h2><div className="quick-links"><Link href="/admin/quotes/new"><FilePenLine aria-hidden="true" />Create quote</Link><Link href="/admin/scholars"><Users aria-hidden="true" />Manage scholars</Link><Link href="/admin/categories"><FolderTree aria-hidden="true" />Manage categories</Link><Link href="/admin/tags"><Tags aria-hidden="true" />Manage tags</Link></div></section></div>
  </div>
}
