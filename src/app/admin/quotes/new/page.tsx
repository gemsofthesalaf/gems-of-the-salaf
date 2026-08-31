import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuoteEditor } from '@/components/admin/QuoteEditor'
import { getQuoteEditorOptions } from '@/data/admin'

export const dynamic = 'force-dynamic'
export default async function NewQuotePage() { const options = await getQuoteEditorOptions(); return <div className="admin-page"><div className="admin-page-heading"><div><Link className="back-link" href="/admin/quotes"><ArrowLeft aria-hidden="true" />Quotes</Link><h1>Create quote</h1><p>New records remain private until explicitly published.</p></div></div><QuoteEditor options={options} /></div> }
