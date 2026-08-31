import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuoteEditor } from '@/components/admin/QuoteEditor'
import { getAdminQuote, getQuoteEditorOptions } from '@/data/admin'
import { uuidSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!uuidSchema.safeParse(id).success) notFound(); const [quote, options] = await Promise.all([getAdminQuote(id), getQuoteEditorOptions()]); if (!quote) notFound(); return <div className="admin-page"><div className="admin-page-heading"><div><Link className="back-link" href="/admin/quotes"><ArrowLeft aria-hidden="true" />Quotes</Link><h1>Edit quote</h1><p>Last updated {new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(quote.updated_at))}</p></div></div><QuoteEditor options={options} initial={{ ...quote, arabic_text: quote.arabic_text ?? '', category_ids: quote.categoryIds, tag_ids: quote.tagIds }} /></div> }
