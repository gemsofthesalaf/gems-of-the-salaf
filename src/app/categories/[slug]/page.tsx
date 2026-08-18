import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"
import { QuoteCard, QuoteData } from "@/components/quotes/QuoteCard"
import { ArrowLeft, Folder } from "lucide-react"
import type { Metadata, ResolvingMetadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('categories') as any)
    .select(`name, description`)
    .eq('slug', params.slug)
    .single()
    
  if (!data) return { title: "Category Not Found" }

  return {
    title: `Quotes on ${data.name}`,
    description: data.description || `Browse quotes related to ${data.name}.`,
  }
}

export default async function CategoryPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: category, error: categoryError } = await (supabase.from('categories') as any)
    .select('*')
    .eq('slug', params.slug)
    .single()
    
  if (categoryError) {
    return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">Failed to load category. Error: {categoryError.message}</div>
  }

  if (!category) {
    notFound()
  }

  // Fetch quotes linked to this category using the quote_categories junction table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quotesData } = await (supabase.from('quotes') as any)
    .select(`
      *,
      scholars!inner ( english_name, slug ),
      quote_categories!inner ( category_id )
    `)
    .eq('quote_categories.category_id', category.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    
  const quotes = quotesData as (Database['public']['Tables']['quotes']['Row'] & { scholars: { english_name: string, slug: string } })[]

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl flex flex-col gap-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/categories" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Categories
        </Link>
      </div>

      <div className="flex flex-col gap-6 items-center text-center">
        <div className="flex flex-col items-center justify-center p-8 bg-muted/20 border rounded-3xl w-full gap-4 shadow-sm">
          <Folder className="h-12 w-12 text-primary opacity-50 mb-2" />
          <h1 className="font-serif text-4xl md:text-5xl font-bold">{category.name}</h1>
          {category.arabic_name && (
            <span className="font-arabic text-3xl text-muted-foreground">{category.arabic_name}</span>
          )}
          {category.description && (
            <p className="max-w-2xl text-lg text-muted-foreground mt-4 leading-relaxed">
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="font-serif text-3xl font-semibold border-b pb-4">Quotes in this Topic ({quotes?.length || 0})</h2>
        
        {quotes && quotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotes.map((quote) => (
              <QuoteCard key={quote.id} quote={quote as unknown as QuoteData} />
            ))}
          </div>
        ) : (
          <div className="text-center p-12 text-muted-foreground bg-muted/10 rounded-xl border">
            No quotes available in this category yet.
          </div>
        )}
      </div>
    </div>
  )
}
