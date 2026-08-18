import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"
import { Book } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Browse Sources",
  description: "Browse Islamic quotes by their original book or source.",
}

export default async function SourcesPage() {
  const supabase = await createClient()
  
  // Fetch all sources
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('sources') as any)
    .select('*')
    .order('title', { ascending: true })

  if (error) {
    return <div className="p-8 text-center text-red-500">Failed to load sources.</div>
  }

  const sources = data as Database['public']['Tables']['sources']['Row'][]

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-4xl font-bold">Sources & Books</h1>
        <p className="text-muted-foreground">Browse quotes by their origin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources?.map((source) => (
          <Link 
            key={source.id} 
            href={`/sources/${source.slug}`}
            className="group flex flex-col p-6 border rounded-xl hover:shadow-md transition-all bg-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary shrink-0" />
                  <h3 className="font-serif text-xl font-semibold group-hover:text-primary transition-colors">
                    {source.title}
                  </h3>
                </div>
                {source.author && (
                  <p className="text-sm text-muted-foreground">
                    By {source.author}
                  </p>
                )}
              </div>
              {source.arabic_title && (
                <span className="font-arabic text-xl text-muted-foreground shrink-0">{source.arabic_title}</span>
              )}
            </div>
          </Link>
        ))}
        {(!sources || sources.length === 0) && (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border">
            No sources found.
          </div>
        )}
      </div>
    </div>
  )
}
