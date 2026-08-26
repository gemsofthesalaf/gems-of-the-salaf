'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"
import { Database } from "@/lib/supabase/types"

const getAdminClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const verifyAuth = async () => {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    throw new Error("Unauthorized")
  }
}

export async function createImportAction(payload: any) {
  await verifyAuth()
  const supabase = getAdminClient()
  
  const { data, error } = await (supabase.from('imports') as any).insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function approveImportAction(importId: string, quotePayload: any) {
  await verifyAuth()
  const supabase = getAdminClient()
  
  // Create quote
  const { data: quote, error: insertError } = await (supabase.from('quotes') as any).insert(quotePayload).select().single()
  if (insertError) throw new Error(insertError.message)
    
  // Update import status
  const updatePayload = {
    status: 'approved' as const,
    processed_at: new Date().toISOString()
  }
  
  const { error: updateError } = await (supabase.from('imports') as any).update(updatePayload).eq('id', importId)
  if (updateError) throw new Error(updateError.message)
  
  return quote
}

export async function rejectImportAction(importId: string) {
  await verifyAuth()
  const supabase = getAdminClient()
  
  const updatePayload = {
    status: 'rejected' as const,
    processed_at: new Date().toISOString()
  }
  
  const { error } = await (supabase.from('imports') as any).update(updatePayload).eq('id', importId)
  if (error) throw new Error(error.message)
  return { success: true }
}
