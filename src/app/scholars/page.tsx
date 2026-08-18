import Link from "next/link"
import { Database } from "@/lib/supabase/types"

type ScholarWithQuotes = Database['public']['Tables']['scholars']['Row'] & {
  quotes: { count: number }[] | null
}
import { createClient } from "@/lib/supabase/server"
import { Users, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Scholars | Gems of the Salaf",
  description: "Browse quotes by Islamic scholars from the early generations.",
}

export default async function ScholarsPage() {
  const supabase = await createClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('scholars') as any)
    .select(`
      *,
      quotes(count)
    `)
    .order('english_name', { ascending: true })

  const scholars = data as ScholarWithQuotes[]

  if (error) {
    return <div className="p-12 text-center text-red-500">Failed to load scholars.</div>
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl flex flex-col gap-8">
      <div className="flex flex-col gap-4 text-center md:text-left">
        <h1 className="font-serif text-4xl font-bold flex items-center gap-3 justify-center md:justify-start">
          <Users className="h-8 w-8 text-primary" /> Scholars
        </h1>
        <p className="text-muted-foreground text-lg">Browse the archive by the scholars of the Salaf.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {scholars?.map((scholar) => (
          <Link key={scholar.id} href={`/scholars/${scholar.slug}`} className="group flex flex-col gap-3 rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-md">
            <div className="flex justify-between items-start">
              <span className="font-serif text-xl font-bold group-hover:text-primary transition-colors">{scholar.english_name}</span>
              {scholar.death_year && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">d. {scholar.death_year}</span>
              )}
            </div>
            {scholar.arabic_name && (
              <span className="font-arabic text-xl text-muted-foreground">{scholar.arabic_name}</span>
            )}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
              <span>{scholar.quotes?.[0]?.count || 0} Quotes</span>
              <span className="group-hover:text-primary transition-colors flex items-center gap-1">View <ArrowRight className="h-3 w-3" /></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
