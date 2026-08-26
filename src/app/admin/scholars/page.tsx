import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Book, Folder } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TaxonomyAdminPage() {
  const supabase = await createClient()

  const [
    { data: scholars },
    { data: sources },
    { data: categories }
  ] = await Promise.all([
    supabase.from('scholars').select('*').order('english_name'),
    supabase.from('sources').select('*').order('title'),
    supabase.from('categories').select('*').order('name')
  ])

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Taxonomy Management</h1>
        <p className="text-muted-foreground">View and manage scholars, sources, and categories in the database.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scholars */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Scholars
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(scholars as Database['public']['Tables']['scholars']['Row'][] | null)?.map((s) => (
              <div key={s.id} className="p-3 border rounded-md text-sm">
                <p className="font-semibold">{s.english_name}</p>
                <p className="text-muted-foreground text-xs">{s.slug}</p>
              </div>
            ))}
            {(!scholars || scholars.length === 0) && <p className="text-sm text-muted-foreground">No scholars found.</p>}
          </CardContent>
        </Card>

        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(sources as Database['public']['Tables']['sources']['Row'][] | null)?.map((s) => (
              <div key={s.id} className="p-3 border rounded-md text-sm">
                <p className="font-semibold">{s.title}</p>
                <p className="text-muted-foreground text-xs">{s.slug}</p>
              </div>
            ))}
            {(!sources || sources.length === 0) && <p className="text-sm text-muted-foreground">No sources found.</p>}
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(categories as Database['public']['Tables']['categories']['Row'][] | null)?.map((c) => (
              <div key={c.id} className="p-3 border rounded-md text-sm">
                <p className="font-semibold">{c.name}</p>
                <p className="text-muted-foreground text-xs">{c.slug}</p>
              </div>
            ))}
            {(!categories || categories.length === 0) && <p className="text-sm text-muted-foreground">No categories found.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
