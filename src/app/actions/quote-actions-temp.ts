// Append to quote-actions.ts
export async function getQuoteAction(id: string) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}
