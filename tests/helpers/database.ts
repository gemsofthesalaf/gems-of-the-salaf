import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export async function testDatabase(through = '999') {
  const db = new PGlite({ extensions: { pg_trgm, unaccent } })
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;`)
  for (const file of readdirSync(resolve('supabase/migrations')).filter(f => f.endsWith('.sql') && f.slice(0,3) <= through).sort()) {
    await db.exec(readFileSync(resolve('supabase/migrations', file), 'utf8'))
  }
  return db
}
