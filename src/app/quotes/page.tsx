import { Suspense } from "react"
import { Search, Filter, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { QuoteCard, type QuoteData } from "@/components/quotes/QuoteCard"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"

type PublicQuoteRow = Database['public']['Tables']['quotes']['Row'] & {
  scholars: { english_name: string, slug: string, death_year: string | null } | null
}

// Metadata for SEO
export const metadata = {
  title: "Search Quotes",
  description: "Search thousands of beneficial sayings from the Salaf.",
}

// Ensure the page is dynamic because of search parameters
export const dynamic = "force-dynamic"

export default async function QuotesPage(props: {
  searchParams?: Promise<{
    q?: string
    scholar?: string
    category?: string
    page?: string
  }>
}) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""
  const scholarSlug = searchParams?.scholar || ""
  const categorySlug = searchParams?.category || ""
  const page = Number(searchParams?.page) || 1
  
  const limit = 20
  const offset = (page - 1) * limit

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-4xl font-bold">Quote Archive</h1>
        <p className="text-muted-foreground">Search and filter through the collection.</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-muted/30 p-4 rounded-xl border">
        <form className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              name="q" 
              defaultValue={query}
              placeholder="Search in English or Arabic..." 
              className="pl-9 bg-background"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        <Button variant="outline" className="gap-2 shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Filters (Desktop) */}
        <div className="hidden md:flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm">Scholars</h3>
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-muted-foreground cursor-pointer hover:text-primary">Ibn al-Qayyim</span>
              <span className="text-muted-foreground cursor-pointer hover:text-primary">Ibn Taymiyyah</span>
              <span className="text-muted-foreground cursor-pointer hover:text-primary">Ahmad bin Hanbal</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm">Categories</h3>
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-muted-foreground cursor-pointer hover:text-primary">Tawhid</span>
              <span className="text-muted-foreground cursor-pointer hover:text-primary">Purification of the Heart</span>
              <span className="text-muted-foreground cursor-pointer hover:text-primary">Knowledge</span>
            </div>
          </div>
        </div>

        {/* Quotes Feed */}
        <div className="md:col-span-3 flex flex-col gap-6">
          <Suspense fallback={<div className="flex justify-center p-12">Loading quotes...</div>}>
            <QuotesFeed query={query} scholarSlug={scholarSlug} categorySlug={categorySlug} limit={limit} offset={offset} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

async function QuotesFeed({ 
  query, scholarSlug, categorySlug, limit, offset 
}: { 
  query: string, scholarSlug: string, categorySlug: string, limit: number, offset: number 
}) {
  const supabase = await createClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queryBuilder = (supabase.from('quotes') as any)
    .select(`
      *,
      scholars!inner ( english_name, slug, death_year )
    `, { count: 'exact' })
    .eq('status', 'published')
    
  if (query) {
    queryBuilder = queryBuilder.or(`english_text.ilike.%${query}%,arabic_text.ilike.%${query}%`)
  }
  if (scholarSlug) {
    queryBuilder = queryBuilder.eq('scholars.slug', scholarSlug)
  }
  
  const { data, count, error } = await queryBuilder
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("Error fetching quotes:", error)
    return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">Failed to load quotes. Please try again.</div>
  }

  const quotes = data as PublicQuoteRow[]

  if (!quotes || quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-muted/10 text-center gap-4">
        <Filter className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">No quotes found</h3>
        <p className="text-muted-foreground">No quotes found matching your criteria. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {quotes?.map((quote) => (
        <QuoteCard key={quote.id} quote={quote as QuoteData} />
      ))}
    </div>
  )
}
