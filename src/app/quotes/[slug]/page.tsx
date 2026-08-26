import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"

import { ArrowLeft, Book, User } from "lucide-react"
import { QuoteActions } from "@/components/quotes/QuoteActions"
import type { Metadata, ResolvingMetadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('quotes') as any)
    .select(`english_text, scholars(english_name)`)
    .eq('slug', params.slug)
    .single()
    
  const quote = data as { english_text: string, scholars: { english_name: string } | { english_name: string }[] | null } | null

  if (!quote) return { title: "Quote Not Found" }

  const scholarName = Array.isArray(quote.scholars) ? quote.scholars[0]?.english_name : quote.scholars?.english_name
  const shortText = quote.english_text.length > 100 ? quote.english_text.substring(0, 100) + '...' : quote.english_text

  return {
    title: `Quote by ${scholarName}`,
    description: shortText,
  }
}

export default async function QuotePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('quotes') as any)
    .select(`
      *,
      scholars ( english_name, arabic_name, slug, death_year ),
      sources ( title, author, slug )
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()
    
  const quote = data as Database['public']['Tables']['quotes']['Row'] & {
    scholars: { english_name: string, arabic_name: string | null, slug: string, death_year: string | null } | { english_name: string, arabic_name: string | null, slug: string, death_year: string | null }[] | null,
    sources: { title: string, author: string | null, slug: string } | { title: string, author: string | null, slug: string }[] | null
  } | null

  if (error || !quote) {
    notFound()
  }
  
  // Format the data for the component
  const scholar = Array.isArray(quote.scholars) ? quote.scholars[0] : quote.scholars
  const source = Array.isArray(quote.sources) ? quote.sources[0] : quote.sources
  
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl flex flex-col gap-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/quotes" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Archive
        </Link>
      </div>

      <div className="flex flex-col gap-10">
        {/* Quote Content */}
        <div className="flex flex-col gap-8 rounded-2xl border bg-card p-8 md:p-12 shadow-sm">
          {quote.arabic_text && (
            <p dir="rtl" className="font-arabic text-3xl md:text-4xl leading-relaxed text-foreground text-center">
              {quote.arabic_text}
            </p>
          )}
          
          <div className="h-px w-1/3 bg-border mx-auto opacity-50" />
          
          <p className="font-serif text-xl md:text-2xl leading-relaxed text-foreground/90 whitespace-pre-wrap text-center">
            {quote.english_text}
          </p>
          
          <QuoteActions quoteSlug={quote.slug} englishText={quote.english_text} />
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scholar && (
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Scholar</h3>
              </div>
              <Link href={`/scholars/${scholar.slug}`} className="font-serif text-xl font-bold hover:text-primary transition-colors">
                {scholar.english_name}
              </Link>
              {scholar.arabic_name && <span className="font-arabic text-lg">{scholar.arabic_name}</span>}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Book className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Source Citation</h3>
            </div>
            {source ? (
              <Link href={`/sources/${source.slug}`} className="font-serif text-xl font-bold hover:text-primary transition-colors">
                {source.title}
              </Link>
            ) : (
              <span className="font-serif text-xl font-bold">{quote.book || "Unknown Source"}</span>
            )}
            
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
              {quote.volume && <span>Volume: {quote.volume}</span>}
              {quote.page && <span>Page: {quote.page}</span>}
              {quote.chapter && <span>Chapter: {quote.chapter}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
