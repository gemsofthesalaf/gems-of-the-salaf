import 'server-only'

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { sessionCookie } from '@/lib/auth-cookie'
import { createAdminClient } from '@/lib/supabase/admin'

const DUMMY_PASSWORD_HASH = '$2b$12$84cShtbxGbEC81wG5TRl0eNGROGgO.lM927PfK0fbpjJmDgQrLf5q'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Admin credentials',
      credentials: {
        email: { label: 'Email', type: 'email', autocomplete: 'username' },
        password: { label: 'Password', type: 'password', autocomplete: 'current-password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        if (!email || !z.email().safeParse(email).success || !password || Buffer.byteLength(password, 'utf8') > 72) return null

        const supabase = createAdminClient()
        const { data: allowed, error: budgetError } = await supabase.rpc('consume_login_attempt', {
          p_key: createHash('sha256').update(email).digest('hex'),
        })
        if (budgetError || !allowed) return null
        const { data: admin } = await supabase
          .from('admins')
          .select('id,email,role,password_hash')
          .eq('email', email)
          .maybeSingle()

        const hash = admin?.password_hash ?? DUMMY_PASSWORD_HASH
        const validPassword = await bcrypt.compare(password, hash)
        if (!admin || admin.role !== 'admin' || !admin.password_hash || !validPassword) return null

        return { id: admin.id, email: admin.email, role: 'admin', credentialVersion: createHash('sha256').update(admin.password_hash).digest('hex') }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.credentialVersion = user.credentialVersion
        token.loginAt = Math.floor(Date.now() / 1000)
      }
      if (!token.loginAt || Date.now() / 1000 - token.loginAt >= 8 * 60 * 60) return { ...token, role: null }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id ?? ''
      session.user.role = token.role === 'admin' ? 'admin' : null
      session.user.credentialVersion = token.credentialVersion
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      try {
        const candidate = new URL(url)
        if (candidate.origin === baseUrl) return url
      } catch {
        // Ignore malformed redirect targets.
      }
      return `${baseUrl}/admin`
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  cookies: {
    sessionToken: sessionCookie(),
  },
}
