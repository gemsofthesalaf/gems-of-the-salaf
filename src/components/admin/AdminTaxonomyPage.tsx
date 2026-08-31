import { TaxonomyManager } from '@/components/admin/TaxonomyManager'
import { getTaxonomyRows, type TaxonomyKind } from '@/data/admin'

export async function AdminTaxonomyPage({ kind }: { kind: TaxonomyKind }) {
  const [rows, categories] = await Promise.all([getTaxonomyRows(kind), kind === 'category' ? getTaxonomyRows('category') : Promise.resolve([])])
  const normalized = rows as unknown as Array<Record<string, unknown>>
  const categoryOptions = (categories as unknown as Array<{ id: string; name: string }>).map((item) => ({ id: item.id, name: item.name }))
  return <TaxonomyManager kind={kind} rows={normalized} categoryOptions={categoryOptions} />
}
