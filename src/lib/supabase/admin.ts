import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { Database } from './types'
import { getServerSecret } from '@/lib/auth-secret'

// Note: This should ONLY be used in server environments (API routes, Server Actions)
// and ONLY when administrative privileges are explicitly required and authorized.
export function createAdminClient() {
  const serviceRoleKey = getServerSecret('SUPABASE_SERVICE_ROLE_KEY')
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !serviceRoleKey ||
    serviceRoleKey.length < 20
  ) {
    throw new Error('Missing Supabase Service Role configuration')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
