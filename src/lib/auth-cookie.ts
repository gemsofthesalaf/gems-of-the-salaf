// Shared by NextAuth and the proxy.
export function sessionCookie() {
  const secure = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).protocol === 'https:'
    : process.env.NODE_ENV === 'production'
  return {
    name: secure ? '__Secure-gems.session-token' : 'gems.session-token',
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure },
  }
}
