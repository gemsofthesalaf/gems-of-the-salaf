'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateQuoteAction, getQuoteAction } from '@/app/actions/quote-actions'
import { Database } from '@/lib/supabase/types'
import { use } from 'react'

type QuoteRow = Database['public']['Tables']['quotes']['Row']
type QuoteUpdate = Database['public']['Tables']['quotes']['Update']

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    arabic_text: '',
    english_text: '',
    scholar_id: '',
    source_id: '',
    book: '',
    volume: '',
    page: '',
    chapter: '',
    status: 'draft',
    slug: ''
  })

  useEffect(() => {
    async function loadQuote() {
      try {
        const data = await getQuoteAction(unwrappedParams.id)
        if (data) {
          const d = data as QuoteRow
          setFormData({
            arabic_text: d.arabic_text || '',
            english_text: d.english_text || '',
            scholar_id: d.scholar_id || '',
            source_id: d.source_id || '',
            book: d.book || '',
            volume: d.volume || '',
            page: d.page || '',
            chapter: d.chapter || '',
            status: d.status || 'draft',
            slug: d.slug || ''
          })
        }
      } catch (error: any) {
        setErrorMsg('Could not load quote: ' + error.message)
      }
      setFetching(false)
    }
    loadQuote()
  }, [unwrappedParams.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    
    let finalSlug = formData.slug
    if (!finalSlug) {
      finalSlug = formData.english_text.substring(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    }

    const payload: QuoteUpdate = {
      arabic_text: formData.arabic_text || undefined,
      english_text: formData.english_text,
      scholar_id: formData.scholar_id || undefined,
      book: formData.book || undefined,
      volume: formData.volume || undefined,
      page: formData.page || undefined,
      chapter: formData.chapter || undefined,
      status: formData.status as 'draft' | 'published' | 'archived',
      slug: finalSlug,
      published_at: formData.status === 'published' ? new Date().toISOString() : undefined
    }

    try {
      await updateQuoteAction(unwrappedParams.id, payload)
      router.push('/admin/quotes')
      router.refresh()
    } catch (error: any) {
      setErrorMsg(error.message)
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/quotes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Edit Quote</h1>
          <p className="text-muted-foreground">Update the archive entry.</p>
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
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Arabic Text</label>
                <textarea 
                  dir="rtl"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-arabic font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.arabic_text}
                  onChange={(e) => setFormData({...formData, arabic_text: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">English Translation *</label>
                <textarea 
                  className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-serif shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Scholar ID *</label>
                  <Input 
                    required
                    value={formData.scholar_id}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, scholar_id: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">URL Slug *</label>
                  <Input 
                    required
                    value={formData.slug}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, slug: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Book Title</label>
                <Input value={formData.book} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, book: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Volume</label>
                  <Input value={formData.volume} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, volume: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Page</label>
                  <Input value={formData.page} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, page: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Chapter</label>
                  <Input value={formData.chapter} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, chapter: e.target.value})} />
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
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
