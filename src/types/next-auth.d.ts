import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'admin' | null
      credentialVersion?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    role: 'admin'
    credentialVersion?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: 'admin' | null
    credentialVersion?: string
    loginAt?: number
  }
}
