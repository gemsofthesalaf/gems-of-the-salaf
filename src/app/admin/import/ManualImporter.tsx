'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseTelegramPost } from '@/lib/telegram-parser'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Database } from '@/lib/supabase/types'

type ImportInsert = Database['public']['Tables']['imports']['Insert']

export function ManualImporter() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setErrorMsg(null)
    
    try {
      const parsed = parseTelegramPost(text)
      
      const payload: ImportInsert = {
        raw_text: text,
        parsed_arabic: parsed.arabic_text,
        parsed_english: parsed.english_text,
        parsed_scholar: parsed.scholar,
        parsed_source: parsed.source,
        status: 'pending'
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('imports') as any).insert(payload)

      if (error) throw error

      setText('')
      router.refresh()
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErrorMsg(e.message)
      } else {
        setErrorMsg('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Paste & Parse</CardTitle>
        <CardDescription>Paste raw text from a Telegram post to automatically parse it.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {errorMsg && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{errorMsg}</div>}
          <textarea 
            className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Paste raw Telegram post here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="button" className="w-fit" onClick={handleParse} disabled={loading || !text.trim()}>
            {loading ? 'Parsing...' : 'Parse Text'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
