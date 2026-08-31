import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'admin' | null
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    role: 'admin'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: 'admin'
  }
}
