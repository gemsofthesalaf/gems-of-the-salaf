import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/supabase/types"
import { Folder } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Browse Categories",
  description: "Browse Islamic quotes by topic and category.",
}

export default async function CategoriesPage() {
  const supabase = await createClient()
  
  // Fetch all categories
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('categories') as any)
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return <div className="p-8 text-center text-red-500">Failed to load categories.</div>
  }

  const categories = data as Database['public']['Tables']['categories']['Row'][]

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-4xl font-bold">Categories</h1>
        <p className="text-muted-foreground">Browse quotes by topic.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories?.map((category) => (
          <Link 
            key={category.id} 
            href={`/categories/${category.slug}`}
            className="group flex flex-col p-6 border rounded-xl hover:shadow-md transition-all bg-card"
          >
            <div className="flex items-center gap-3 mb-2">
              <Folder className="h-5 w-5 text-primary" />
              <h3 className="font-serif text-xl font-semibold group-hover:text-primary transition-colors">
                {category.name}
              </h3>
            </div>
            {category.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {category.description}
              </p>
            )}
            {category.arabic_name && (
              <p className="font-arabic text-lg text-muted-foreground mt-4 text-right border-t pt-2">
                {category.arabic_name}
              </p>
            )}
          </Link>
        ))}
        {(!categories || categories.length === 0) && (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-xl border">
            No categories found.
          </div>
        )}
      </div>
    </div>
  )
}
