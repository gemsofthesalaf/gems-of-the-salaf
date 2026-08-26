'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteQuoteAction } from '@/app/actions/quote-actions'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Loader2 } from 'lucide-react'

export function AdminQuoteActions({ quoteId }: { quoteId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this quote?')) return
    
    setIsDeleting(true)
    try {
      await deleteQuoteAction(quoteId)
      router.refresh()
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert('Error deleting quote: ' + error.message)
      } else {
        alert('An unknown error occurred')
      }
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/admin/quotes/${quoteId}/edit`}>
          <Edit className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Edit</span>
        </Link>
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  )
}
