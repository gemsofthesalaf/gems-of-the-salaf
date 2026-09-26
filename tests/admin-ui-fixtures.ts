import type { AdminQuoteListItem, QuoteEditorOptions } from '@/data/admin'
import type { ActionResult } from '@/app/actions/quote-actions'

export const options: QuoteEditorOptions = {
  scholars: [{ id: 'scholar-1', label: 'Scholar one', isArchived: false }],
  sources: [], translators: [],
  categories: [{ id: 'category-1', label: 'Knowledge', isArchived: false }],
  tags: [],
}
export const quote: AdminQuoteListItem = {
  id: 'quote-1', slug: 'verified-quote', englishText: 'Verified quote.',
  arabicText: 'العلم نور', status: 'draft', featured: false,
  updatedAt: '', publishedAt: null, scholarName: 'Scholar one',
}
export const rows = [
  { id: 'tag-1', name: 'Knowledge', slug: 'knowledge', is_archived: false },
  { id: 'tag-2', name: 'Patience', slug: 'patience', is_archived: false },
  { id: 'tag-3', name: 'Wisdom', slug: 'wisdom', is_archived: false },
]
export function deferred<T = ActionResult>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
