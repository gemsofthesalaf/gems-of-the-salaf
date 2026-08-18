import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, CheckCircle, AlertCircle } from "lucide-react"
import { ManualImporter } from "./ManualImporter"
import { ImportItemActions } from "./ImportItemActions"
import { Database } from "@/lib/supabase/types"

type ImportQueueItem = Database['public']['Tables']['imports']['Row']

export default async function AdminImportPage() {
  const supabase = await createClient()

  // Fetch pending imports
  const { data, error } = await supabase
    .from('imports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)

  const imports = data as ImportQueueItem[]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Telegram Importer</h1>
          <p className="text-muted-foreground">Process and normalize raw Telegram channel exports.</p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload JSON/CSV
        </Button>
      </div>

      <ManualImporter />

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold tracking-tight">Review Queue ({imports?.length || 0})</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3">Parsed Content</th>
                <th className="px-6 py-3">Scholar & Source</th>
                <th className="px-6 py-3">Duplicates</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {imports?.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 max-w-md">
                      {item.parsed_arabic && (
                        <p dir="rtl" className="font-arabic font-medium truncate">{item.parsed_arabic}</p>
                      )}
                      <p className="text-muted-foreground truncate">{item.parsed_english}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {item.parsed_scholar} <br />
                    <span className="text-muted-foreground text-xs">{item.parsed_source}</span>
                  </td>
                  <td className="px-6 py-4">
                    {item.duplicate_quote_id ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" /> Likely Match
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-green-600 bg-green-50 border-green-200">
                        <CheckCircle className="h-3 w-3" /> Clean
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ImportItemActions item={item} />
                  </td>
                </tr>
              ))}
              {(!imports || imports.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Queue is empty.
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
