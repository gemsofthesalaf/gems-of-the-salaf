import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"
import { ScholarManager, SourceManager, CategoryManager } from "./TaxonomyManagers"

export const dynamic = "force-dynamic"

type ScholarRow = Database['public']['Tables']['scholars']['Row']
type SourceRow = Database['public']['Tables']['sources']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']

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
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Taxonomy Management</h1>
        <p className="text-muted-foreground">Create, edit, and delete scholars, sources, and categories.</p>
      </div>

      <ScholarManager initialData={(scholars as ScholarRow[]) || []} />
      <SourceManager initialData={(sources as SourceRow[]) || []} />
      <CategoryManager initialData={(categories as CategoryRow[]) || []} />
    </div>
  )
}
