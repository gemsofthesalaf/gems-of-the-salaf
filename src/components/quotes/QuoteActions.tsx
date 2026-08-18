'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link as LinkIcon, Share2, Check } from 'lucide-react'

export function QuoteActions({ quoteSlug, englishText }: { quoteSlug: string, englishText: string }) {
  const [copiedLink, setCopiedLink] = useState(false)


  const handleCopyLink = () => {
    const url = `${window.location.origin}/quotes/${quoteSlug}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Quote from Gems of the Salaf',
        text: englishText.substring(0, 50) + '...',
        url: `${window.location.origin}/quotes/${quoteSlug}`
      }).catch(console.error)
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
      <Button variant="outline" className="gap-2" onClick={handleCopyLink}>
        {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <LinkIcon className="h-4 w-4" />}
        {copiedLink ? 'Link Copied!' : 'Copy Link'}
      </Button>
      <Button variant="outline" className="gap-2" onClick={handleShare}>
        <Share2 className="h-4 w-4" /> Share
      </Button>
    </div>
  )
}
