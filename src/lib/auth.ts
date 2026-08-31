import 'server-only'

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
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
        if (!email || !password || email.length > 320 || password.length > 1_000) return null

        const supabase = createAdminClient()
        const { data: admin } = await supabase
          .from('admins')
          .select('id,email,role,password_hash')
          .ilike('email', email)
          .maybeSingle()

        const hash = admin?.password_hash ?? DUMMY_PASSWORD_HASH
        const validPassword = await bcrypt.compare(password, hash)
        if (!admin || admin.role !== 'admin' || !admin.password_hash || !validPassword) return null

        return { id: admin.id, email: admin.email, role: 'admin' }
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
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id ?? ''
      session.user.role = token.role === 'admin' ? 'admin' : null
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
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-gems.session-token' : 'gems.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
