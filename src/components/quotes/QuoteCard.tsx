'use client'

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, Share2, Quote } from "lucide-react"

export interface QuoteData {
  id: string
  slug: string
  arabic_text: string | null
  english_text: string
  book: string | null
  scholars: {
    english_name: string
    slug: string
  }
}

interface QuoteCardProps {
  quote: QuoteData
  className?: string
}

export function QuoteCard({ quote, className }: QuoteCardProps) {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could integrate toast notification here
  }

  return (
    <Card className={`group flex flex-col overflow-hidden transition-all hover:shadow-md ${className}`}>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="flex flex-col gap-1">
          <Link href={`/scholars/${quote.scholars.slug}`} className="font-serif font-bold text-lg hover:text-primary transition-colors">
            {quote.scholars.english_name}
          </Link>
          {quote.book && (
            <span className="text-sm text-muted-foreground italic">
              {quote.book}
            </span>
          )}
        </div>
        <Quote className="h-6 w-6 text-muted-foreground/30" />
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-6">
        {quote.arabic_text && (
          <p dir="rtl" className="font-arabic text-2xl leading-relaxed text-foreground">
            {quote.arabic_text}
          </p>
        )}
        <p className="font-serif text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {quote.english_text}
        </p>
      </CardContent>

      <CardFooter className="bg-muted/30 pt-4 flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Copy English" onClick={() => handleCopy(quote.english_text)}>
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copy English</span>
          </Button>
          <Button variant="ghost" size="icon" title="Share" onClick={() => handleCopy(`https://gemsofthesalaf.com/quotes/${quote.slug}`)}>
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Share</span>
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/quotes/${quote.slug}`}>
            Read More
            <ExternalLink className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
