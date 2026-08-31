import 'server-only'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export class AuthorizationError extends Error {
  constructor() {
    super('You are not authorized to perform this action.')
    this.name = 'AuthorizationError'
  }
}

export type AdminIdentity = { id: string; email: string }

export async function requireAdmin(): Promise<AdminIdentity> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'admin') throw new AuthorizationError()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admins')
    .select('id,email,role')
    .eq('id', session.user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (error || !data) throw new AuthorizationError()
  return { id: data.id, email: data.email }
}

export async function requireAdminPage(): Promise<AdminIdentity> {
  try {
    return await requireAdmin()
  } catch (error) {
    if (error instanceof AuthorizationError) redirect('/admin/login')
    throw error
  }
}
