import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"
import { QuoteCard, QuoteData } from "@/components/quotes/QuoteCard"
import { ArrowLeft, Book } from "lucide-react"
import type { Metadata, ResolvingMetadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('sources') as any)
    .select(`title, author`)
    .eq('slug', params.slug)
    .single()
    
  if (!data) return { title: "Source Not Found" }

  return {
    title: `Quotes from ${data.title}`,
    description: `Explore quotes from ${data.title} by ${data.author || 'Unknown'}.`,
  }
}

export default async function SourcePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: source, error: sourceError } = await (supabase.from('sources') as any)
    .select('*')
    .eq('slug', params.slug)
    .single()
    
  if (sourceError) {
    return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">Failed to load source. Error: {sourceError.message}</div>
  }

  if (!source) {
    notFound()
  }

  // Fetch quotes linked to this source
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quotesData } = await (supabase.from('quotes') as any)
    .select(`
      *,
      scholars!inner ( english_name, slug )
    `)
    .eq('source_id', source.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    
  const quotes = quotesData as (Database['public']['Tables']['quotes']['Row'] & { scholars: { english_name: string, slug: string } })[]

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl flex flex-col gap-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sources" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Sources
        </Link>
      </div>

      <div className="flex flex-col gap-6 items-center text-center">
        <div className="flex flex-col items-center justify-center p-8 bg-muted/20 border rounded-3xl w-full gap-4 shadow-sm">
          <Book className="h-12 w-12 text-primary opacity-50 mb-2" />
          <h1 className="font-serif text-4xl md:text-5xl font-bold">{source.title}</h1>
          {source.arabic_title && (
            <span className="font-arabic text-3xl text-muted-foreground">{source.arabic_title}</span>
          )}
          {source.author && (
            <p className="text-xl text-muted-foreground mt-2">
              By {source.author}
            </p>
          )}
          {source.publisher && (
            <p className="text-sm text-muted-foreground">
              Publisher: {source.publisher}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="font-serif text-3xl font-semibold border-b pb-4">Quotes from this Source ({quotes?.length || 0})</h2>
        
        {quotes && quotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotes.map((quote) => (
              <QuoteCard key={quote.id} quote={quote as unknown as QuoteData} />
            ))}
          </div>
        ) : (
          <div className="text-center p-12 text-muted-foreground bg-muted/10 rounded-xl border">
            No quotes available from this source yet.
          </div>
        )}
      </div>
    </div>
  )
}
