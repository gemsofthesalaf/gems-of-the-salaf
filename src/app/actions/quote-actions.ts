'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"
import { Database } from "@/lib/supabase/types"

// Helper to get service role client
const getAdminClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Helper to verify auth
const verifyAuth = async () => {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    throw new Error("Unauthorized")
  }
}

export async function createQuoteAction(payload: any) {
  await verifyAuth()
  const supabase = getAdminClient()
  
  const { data, error } = await (supabase.from('quotes') as any).insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateQuoteAction(id: string, payload: any) {
  await verifyAuth()
  const supabase = getAdminClient()
  
  const { data, error } = await (supabase.from('quotes') as any).update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteQuoteAction(id: string) {
  await verifyAuth()
  const supabase = getAdminClient()
  
  const { error } = await (supabase.from('quotes') as any).delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getQuoteAction(id: string) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { data, error } = await (supabase.from('quotes') as any).select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}
