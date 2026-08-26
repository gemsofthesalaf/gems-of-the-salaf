'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { createQuoteAction } from '@/app/actions/quote-actions'
import { Database } from '@/lib/supabase/types'

type QuoteInsert = Database['public']['Tables']['quotes']['Insert']

export default function NewQuotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [formData, setFormData] = useState({
    arabic_text: '',
    english_text: '',
    scholar_id: '',
    book: '',
    volume: '',
    page: '',
    chapter: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    slug: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    // Auto-generate slug if empty
    const finalSlug = formData.english_text.substring(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()

    const payload: QuoteInsert = {
      arabic_text: formData.arabic_text || undefined,
      english_text: formData.english_text,
      scholar_id: formData.scholar_id || undefined, // in production we want proper UUIDs
      book: formData.book || undefined,
      volume: formData.volume || undefined,
      page: formData.page || undefined,
      chapter: formData.chapter || undefined,
      status: formData.status as 'draft' | 'published' | 'archived',
      slug: finalSlug,
      // Default dates are handled by DB trigger/defaults
      published_at: formData.status === 'published' ? new Date().toISOString() : undefined
    }

    try {
      await createQuoteAction(payload)
      router.push('/admin/quotes')
      router.refresh()
    } catch (error: unknown) {
      console.error(error)
      if (error instanceof Error) {
        setErrorMsg(error.message)
      } else {
        setErrorMsg('An unknown error occurred')
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/quotes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Create Quote</h1>
          <p className="text-muted-foreground">Add a new quote to the archive.</p>
        </div>
      </div>
      
      {errorMsg && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md text-sm border border-red-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>The core Arabic and English text of the quote.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Arabic Text (Optional)</label>
                <textarea 
                  dir="rtl"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-arabic font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="أدخل النص العربي هنا..."
                  value={formData.arabic_text}
                  onChange={(e) => setFormData({...formData, arabic_text: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">English Translation <span className="text-red-500">*</span></label>
                <textarea 
                  className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-serif shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Enter the English translation here..."
                  required
                  value={formData.english_text}
                  onChange={(e) => setFormData({...formData, english_text: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attribution</CardTitle>
              <CardDescription>Identify the scholar and the exact source.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Scholar ID <span className="text-red-500">*</span></label>
                  <Input 
                    placeholder="UUID of scholar" 
                    required
                    value={formData.scholar_id}
                    onChange={(e) => setFormData({...formData, scholar_id: e.target.value})}
                  />
                  {/* In full version: replace with async select */}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">URL Slug <span className="text-red-500">*</span></label>
                  <Input 
                    placeholder="scholar-topic-keyword" 
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Book Title (String override)</label>
                <Input 
                  placeholder="e.g. Al-Fawa'id" 
                  value={formData.book}
                  onChange={(e) => setFormData({...formData, book: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Volume</label>
                  <Input placeholder="e.g. 1" value={formData.volume} onChange={(e) => setFormData({...formData, volume: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Page</label>
                  <Input placeholder="e.g. 45" value={formData.page} onChange={(e) => setFormData({...formData, page: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Chapter</label>
                  <Input placeholder="e.g. 3" value={formData.chapter} onChange={(e) => setFormData({...formData, chapter: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Status</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, status: e.target.value as 'draft' | 'published' | 'archived'})}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Quote
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
