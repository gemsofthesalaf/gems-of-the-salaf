'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveImportAction, rejectImportAction } from '@/app/actions/import-actions'
import { Button } from '@/components/ui/button'
import { XCircle, Loader2 } from 'lucide-react'

import { Database } from '@/lib/supabase/types'

type ImportQueueItem = Database['public']['Tables']['imports']['Row']

export function ImportItemActions({ item }: { item: ImportQueueItem }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleApprove = async () => {
    setLoading(true)
    
    // Auto generate a slug based on english text
    const finalSlug = item.parsed_english 
      ? item.parsed_english.substring(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
      : 'import-' + Date.now()
      
    const quotePayload: Database['public']['Tables']['quotes']['Insert'] = {
      arabic_text: item.parsed_arabic,
      english_text: item.parsed_english || '',
      scholar_id: 'default', 
      book: item.parsed_source,
      slug: finalSlug,
      status: 'draft', 
    }
    
    try {
      await approveImportAction(item.id, quotePayload)
      router.refresh()
    } catch (error: any) {
      alert('Error approving: ' + error.message)
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to discard this import?')) return
    setLoading(true)
    
    try {
      await rejectImportAction(item.id)
      router.refresh()
    } catch (error: any) {
      alert('Error rejecting: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" disabled={loading}>Edit</Button>
      <Button 
        variant="default" 
        size="sm" 
        className="bg-green-600 hover:bg-green-700" 
        onClick={handleApprove}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve (Draft)'}
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
        onClick={handleReject}
        disabled={loading}
      >
        <XCircle className="h-4 w-4" />
      </Button>
    </div>
  )
}
