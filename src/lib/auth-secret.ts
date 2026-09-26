// Resolve this at server runtime instead of referencing process.env.NEXTAUTH_SECRET
// statically. Next.js/Turbopack can otherwise serialize the build-time secret into
// its cache, where Netlify's secret scanner correctly rejects the deploy.
const nextAuthSecretVariable = ['NEXTAUTH', 'SECRET'].join('_')

export function getNextAuthSecret(): string | undefined {
  return process.env[nextAuthSecretVariable]
}
