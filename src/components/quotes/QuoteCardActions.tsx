'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy failed')
}

export function QuoteCardActions({ text, url }: { text: string; url: string }) {
  const [status, setStatus] = useState('')

  async function copy() {
    try {
      await copyText(text)
      setStatus('English copied')
    } catch {
      setStatus('Could not copy')
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Gems of the Salaf', text, url })
        setStatus('Share opened')
      } else {
        await copyText(url)
        setStatus('Link copied')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setStatus('Could not share')
    }
  }

  return (
    <div className="quote-card-actions">
      <Button type="button" variant="ghost" size="icon" onClick={copy} aria-label="Copy English translation">
        {status === 'English copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={share} aria-label="Share quote">
        <Share2 aria-hidden="true" />
      </Button>
      <span className="sr-only" aria-live="polite">{status}</span>
    </div>
  )
}
