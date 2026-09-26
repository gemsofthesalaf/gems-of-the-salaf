import { createHmac } from 'node:crypto'
// Explicitly local-only test credentials; never use these values in a deployment.
export const auditSecret = 'LOCAL-AUDIT-ONLY-DO-NOT-USE-IN-PRODUCTION-32'
function key(role) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ role, exp: Math.floor(Date.now()/1000) + 86400 })).toString('base64url')
  const data = header + '.' + payload
  return data + '.' + createHmac('sha256', auditSecret).update(data).digest('base64url')
}
export const auditEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:55434',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: key('anon'),
  SUPABASE_SERVICE_ROLE_KEY: key('service_role'),
  NEXTAUTH_SECRET: auditSecret,
  NEXTAUTH_URL: 'http://localhost:3100',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3100',
  NEXT_PUBLIC_ENABLE_ANALYTICS: 'false',
  NEXT_TELEMETRY_DISABLED: '1',
}
