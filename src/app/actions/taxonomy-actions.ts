'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const role = session?.user && 'role' in session.user ? (session.user as {role: string}).role : null
  if (!session || role !== 'admin') {
    throw new Error("Unauthorized")
  }
}

// ==================== SCHOLARS ====================

export async function createScholar(payload: {
  english_name: string
  arabic_name?: string
  slug: string
  death_year?: string
  biography?: string
}) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { data, error } = await (supabase.from('scholars') as any).insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateScholar(id: string, payload: {
  english_name?: string
  arabic_name?: string
  slug?: string
  death_year?: string
  biography?: string
}) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { data, error } = await (supabase.from('scholars') as any).update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteScholar(id: string) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { error } = await (supabase.from('scholars') as any).delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { success: true }
}

// ==================== SOURCES ====================

export async function createSource(payload: {
  title: string
  arabic_title?: string
  slug: string
  author?: string
  publisher?: string
}) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { data, error } = await (supabase.from('sources') as any).insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateSource(id: string, payload: {
  title?: string
  arabic_title?: string
  slug?: string
  author?: string
  publisher?: string
}) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { data, error } = await (supabase.from('sources') as any).update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteSource(id: string) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { error } = await (supabase.from('sources') as any).delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { success: true }
}

// ==================== CATEGORIES ====================

export async function createCategory(payload: {
  name: string
  arabic_name?: string
  slug: string
  description?: string
}) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { data, error } = await (supabase.from('categories') as any).insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateCategory(id: string, payload: {
  name?: string
  arabic_name?: string
  slug?: string
  description?: string
}) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { data, error } = await (supabase.from('categories') as any).update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCategory(id: string) {
  await verifyAuth()
  const supabase = getAdminClient()
  const { error } = await (supabase.from('categories') as any).delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { success: true }
}
