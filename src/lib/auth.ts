import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcrypt"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password")
        }

        // Use service role key to bypass RLS and read the admin table
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: admin, error } = await supabase
          .from("admins")
          .select("*")
          .eq("email", credentials.email)
          .single()

        if (error || !admin) {
          throw new Error("Invalid credentials")
        }

        if (!admin.password_hash) {
          throw new Error("Account is not configured with a password")
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, admin.password_hash)

        if (!isPasswordValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
        } as any
      }
      return session
    }
  },
  pages: {
    signIn: "/admin/login",
  },
}
