import 'server-only'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

function hasValidPublicConfiguration(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || key.length < 20) return false

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost'
  } catch {
    return false
  }
}

export function createPublicClient(): SupabaseClient<Database> | null {
  if (!hasValidPublicConfiguration()) return null

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
