'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Eye, Pencil, Star, Trash2 } from 'lucide-react'
import type { AdminQuoteListItem } from '@/data/admin'
import { deleteQuoteAction, setQuoteStateAction } from '@/app/actions/quote-actions'

export function AdminQuoteActions({ quote }: { quote: AdminQuoteListItem }) {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState(''); const [pending, startTransition] = useTransition(); const router = useRouter()
  function mutate(action: () => Promise<{ ok: boolean; message: string }>) { setMessage(''); startTransition(async () => { const result = await action(); setMessage(result.message); if (result.ok) { setOpen(false); router.refresh() } }) }
  return <div className="admin-actions"><button className="icon-button" type="button" aria-expanded={open} aria-label="Quote actions" onClick={() => setOpen((current) => !current)}>•••</button>{open && <div className="action-menu"><Link href={`/admin/quotes/${quote.id}/edit`}><Pencil aria-hidden="true" />Edit</Link>{quote.status === 'published' && <Link href={`/quotes/${quote.slug}`} target="_blank"><Eye aria-hidden="true" />Public preview</Link>}<button type="button" disabled={pending} onClick={() => mutate(() => setQuoteStateAction({ id: quote.id, status: quote.status === 'published' ? 'draft' : 'published' }))}><Eye aria-hidden="true" />{quote.status === 'published' ? 'Unpublish' : 'Publish'}</button><button type="button" disabled={pending} onClick={() => mutate(() => setQuoteStateAction({ id: quote.id, featured: !quote.featured }))}><Star aria-hidden="true" />{quote.featured ? 'Unfeature' : 'Feature'}</button><button type="button" disabled={pending} onClick={() => mutate(() => setQuoteStateAction({ id: quote.id, status: 'archived' }))}><Archive aria-hidden="true" />Archive</button><button type="button" className="danger-action" disabled={pending} onClick={() => { if (window.confirm('Permanently delete this quote? This cannot be undone.')) mutate(() => deleteQuoteAction(quote.id)) }}><Trash2 aria-hidden="true" />Delete</button></div>}{message && <span className="sr-only" role="status">{message}</span>}</div>
}
