'use client'

import { useState } from 'react'
import { Check, Copy, Languages, Link as LinkIcon, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

async function writeClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Some browsers expose the Clipboard API but deny writes in this context.
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  try {
    textarea.select()
    if (!document.execCommand('copy')) throw new Error('Copy failed')
  } finally {
    textarea.remove()
  }
}

type CopyKind = 'arabic' | 'english' | 'both' | 'link' | null

export function QuoteActions({
  arabicText,
  englishText,
  canonicalUrl,
}: {
  arabicText: string | null
  englishText: string
  canonicalUrl: string
}) {
  const [copied, setCopied] = useState<CopyKind>(null)
  const [message, setMessage] = useState('')

  async function copy(kind: Exclude<CopyKind, null>, value: string) {
    try {
      await writeClipboard(value)
      setCopied(kind)
      setMessage(`${kind === 'both' ? 'Arabic and English' : kind[0].toUpperCase() + kind.slice(1)} copied`)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setMessage('Copy failed. Select the text and copy it manually.')
    }
  }

  async function share() {
    const nativeShare = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share
    if (nativeShare) {
      try {
        await nativeShare.call(navigator, { title: 'Gems of the Salaf', text: englishText, url: canonicalUrl })
        setMessage('Share sheet opened')
        return
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
          setMessage('Sharing cancelled')
          return
        }
      }
    }

    try {
      await writeClipboard(canonicalUrl)
      setCopied('link')
      setMessage(nativeShare ? 'Sharing failed; link copied instead' : 'Link copied')
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setMessage('Sharing is unavailable and the link could not be copied. Copy the page address manually.')
    }
  }

  const both = arabicText ? `${arabicText}\n\n${englishText}` : englishText

  return (
    <div className="quote-actions" aria-label="Quote actions">
      {arabicText ? (
        <Button type="button" variant="outline" onClick={() => copy('arabic', arabicText)}>
          {copied === 'arabic' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          Copy Arabic
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={() => copy('english', englishText)}>
        {copied === 'english' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        Copy English
      </Button>
      <Button type="button" variant="outline" onClick={() => copy('both', both)}>
        {copied === 'both' ? <Check aria-hidden="true" /> : <Languages aria-hidden="true" />}
        Copy both
      </Button>
      <Button type="button" variant="outline" onClick={() => copy('link', canonicalUrl)}>
        {copied === 'link' ? <Check aria-hidden="true" /> : <LinkIcon aria-hidden="true" />}
        Copy link
      </Button>
      <Button type="button" onClick={share}>
        <Share2 aria-hidden="true" /> Share
      </Button>
      <p className="quote-action-status" role="status" aria-live="polite">{message}</p>
    </div>
  )
}
