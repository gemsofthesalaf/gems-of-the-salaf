import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"
import { QuoteCard, QuoteData } from "@/components/quotes/QuoteCard"
import { ArrowLeft, BookOpen } from "lucide-react"
import type { Metadata, ResolvingMetadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('scholars') as any)
    .select(`english_name, biography`)
    .eq('slug', params.slug)
    .single()
    
  if (!data) return { title: "Scholar Not Found" }

  return {
    title: `${data.english_name} Quotes & Biography`,
    description: data.biography ? data.biography.substring(0, 150) + "..." : `Explore the quotes and sayings of ${data.english_name}.`,
  }
}

export default async function ScholarPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scholar, error: scholarError } = await (supabase.from('scholars') as any)
    .select('*')
    .eq('slug', params.slug)
    .single()
    
  if (scholarError) {
    return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">Failed to load scholar. Error: {scholarError.message}</div>
  }

  if (!scholar) {
    notFound()
  }

  // Fetch quotes by this scholar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quotesData } = await (supabase.from('quotes') as any)
    .select(`
      *,
      scholars!inner ( english_name, slug )
    `)
    .eq('scholar_id', scholar.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    
  const quotes = quotesData as (Database['public']['Tables']['quotes']['Row'] & { scholars: { english_name: string, slug: string } })[]

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl flex flex-col gap-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/scholars" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Scholars
        </Link>
      </div>

      <div className="flex flex-col gap-6 items-center text-center">
        <div className="flex flex-col items-center justify-center p-8 bg-muted/20 border rounded-3xl w-full gap-4 shadow-sm">
          <h1 className="font-serif text-4xl md:text-5xl font-bold">{scholar.english_name}</h1>
          {scholar.arabic_name && (
            <span className="font-arabic text-3xl text-muted-foreground">{scholar.arabic_name}</span>
          )}
          {scholar.death_year && (
            <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
              Died: {scholar.death_year}
            </span>
          )}
          {scholar.biography && (
            <p className="max-w-2xl text-lg text-muted-foreground mt-4 leading-relaxed">
              {scholar.biography}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-3xl font-semibold">Quotes ({quotes?.length || 0})</h2>
        </div>
        
        {quotes && quotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotes.map((quote) => (
              <QuoteCard key={quote.id} quote={quote as unknown as QuoteData} />
            ))}
          </div>
        ) : (
          <div className="text-center p-12 text-muted-foreground bg-muted/10 rounded-xl border">
            No quotes available for this scholar yet.
          </div>
        )}
      </div>
    </div>
  )
}
