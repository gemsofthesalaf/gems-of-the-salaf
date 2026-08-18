import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search } from "lucide-react"
import { AdminQuoteActions } from "./AdminQuoteActions"
import { Database } from "@/lib/supabase/types"

type AdminQuoteRow = Database['public']['Tables']['quotes']['Row'] & {
  scholars: { english_name: string } | { english_name: string }[] | null
}

export default async function AdminQuotesPage() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('quotes') as any)
    .select(`
      id, 
      slug, 
      english_text, 
      status, 
      published_at,
      scholars ( english_name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const quotes = data as AdminQuoteRow[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Manage Quotes</h1>
          <p className="text-muted-foreground">View, edit, and publish quotes in the archive.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/quotes/new">
            <Plus className="h-4 w-4" />
            New Quote
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search quotes..." 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3">Quote snippet</th>
                <th className="px-6 py-3">Scholar</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes?.map((quote) => {
                const scholarName = Array.isArray(quote.scholars) ? quote.scholars[0]?.english_name : quote.scholars?.english_name
                const snippet = quote.english_text.length > 60 ? quote.english_text.substring(0, 60) + '...' : quote.english_text
                
                return (
                  <tr key={quote.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{snippet}</td>
                    <td className="px-6 py-4">{scholarName || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={quote.status === 'published' ? 'default' : quote.status === 'draft' ? 'secondary' : 'outline'}>
                        {quote.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <AdminQuoteActions quoteId={quote.id} />
                    </td>
                  </tr>
                )
              })}
              {(!quotes || quotes.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No quotes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
