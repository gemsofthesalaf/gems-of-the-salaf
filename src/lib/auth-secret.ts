// Resolve server secrets at runtime instead of referencing process.env.KEY
// statically. Next.js/Turbopack can otherwise serialize build-time values into
// its cache, where Netlify's secret scanner correctly rejects the deploy.
export type ServerSecretName = 'NEXTAUTH_SECRET' | 'SUPABASE_SERVICE_ROLE_KEY'

export function getServerSecret(name: ServerSecretName): string | undefined {
  return process.env[name]
}
