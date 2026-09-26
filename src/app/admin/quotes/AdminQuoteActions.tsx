'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Eye, Pencil, Star, Trash2 } from 'lucide-react'
import type { AdminQuoteListItem } from '@/data/admin'
import { deleteQuoteAction, setQuoteStateAction, type ActionResult } from '@/app/actions/quote-actions'

export function AdminQuoteActions({ quote }: { quote: AdminQuoteListItem }) {
  return <QuoteActions key={quote.id} quote={quote} />
}

function QuoteActions({ quote }: { quote: AdminQuoteListItem }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()
  const inFlight = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  function mutate(action: () => Promise<ActionResult>) {
    if (inFlight.current) return
    inFlight.current = true
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await action()
        setMessage(result)
        if (result.ok) {
          setOpen(false)
          trigger.current?.focus()
          router.refresh()
        }
      } catch {
        setMessage({ ok: false, message: 'The change could not be confirmed. Check the quote before retrying; if your session expired, sign in again.' })
      } finally {
        inFlight.current = false
      }
    })
  }

  return <div ref={container} className="admin-actions" aria-busy={pending} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
  }} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button ref={trigger} className="icon-button" type="button" aria-expanded={open} aria-controls={panelId} aria-label="Quote actions" onClick={() => setOpen((current) => !current)}>•••</button>
    {open && <div id={panelId} className="action-menu">
      <Link href={`/admin/quotes/${quote.id}/edit`}><Pencil aria-hidden="true" />Edit</Link>
      {quote.status === 'published' && <Link href={`/quotes/${quote.slug}`} target="_blank"><Eye aria-hidden="true" />Public preview</Link>}
      <button type="button" disabled={pending} onClick={() => mutate(() => setQuoteStateAction({ id: quote.id, status: quote.status === 'published' ? 'draft' : 'published' }))}><Eye aria-hidden="true" />{quote.status === 'published' ? 'Unpublish' : 'Publish'}</button>
      <button type="button" disabled={pending} onClick={() => mutate(() => setQuoteStateAction({ id: quote.id, featured: !quote.featured }))}><Star aria-hidden="true" />{quote.featured ? 'Unfeature' : 'Feature'}</button>
      <button type="button" disabled={pending} onClick={() => mutate(() => setQuoteStateAction({ id: quote.id, status: 'archived' }))}><Archive aria-hidden="true" />Archive</button>
      <button type="button" className="danger-action" disabled={pending} onClick={() => { if (window.confirm('Permanently delete this quote? This cannot be undone.')) mutate(() => deleteQuoteAction(quote.id)) }}><Trash2 aria-hidden="true" />Delete</button>
    </div>}
    {pending && <span role="status">Updating quote…</span>}
    {message && <div className={`form-alert form-alert-${message.ok ? 'success' : 'error'}`} role={message.ok ? 'status' : 'alert'}>{message.message}</div>}
  </div>
}
