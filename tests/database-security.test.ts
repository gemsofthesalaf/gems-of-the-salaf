// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { testDatabase } from './helpers/database'

describe('actual PostgreSQL migrations and public permissions', () => {
  let db: PGlite
  beforeAll(async () => {
    db = await testDatabase()
    await db.exec(`INSERT INTO scholars(id,slug,english_name) VALUES ('00000000-0000-4000-8000-000000000001','test-scholar','SYNTHETIC TEST SCHOLAR');
      INSERT INTO quotes(slug,arabic_text,english_text,scholar_id,status,admin_notes) VALUES
      ('test-public','اختبار فقط','SYNTHETIC PUBLIC TEST','00000000-0000-4000-8000-000000000001','published','PRIVATE ADMIN NOTE'),
      ('test-draft','اختبار فقط','SYNTHETIC PRIVATE TEST','00000000-0000-4000-8000-000000000001','draft','PRIVATE DRAFT NOTE');`)
  }, 60000)
  afterAll(async () => { await db?.close() })

  it('never grants anonymous SELECT on admin_notes', async () => {
    const r = await db.query<{ allowed: boolean }>("SELECT has_column_privilege('anon','quotes','admin_notes','SELECT') AS allowed")
    expect(r.rows[0].allowed).toBe(false)
  })
  it('filters drafts even through direct public SELECT', async () => {
    await db.exec('SET ROLE anon')
    try {
      const r = await db.query('SELECT slug FROM quotes')
      expect(r.rows).toEqual([{ slug: 'test-public' }])
      const search = await db.query('SELECT slug FROM search_published_quotes()')
      expect(search.rows).toEqual([{ slug: 'test-public' }])
    } finally { await db.exec('RESET ROLE') }
  })
  it('denies direct access to administrator hashes and audit information', async () => {
    await db.exec('SET ROLE anon')
    try {
      await expect(db.query('SELECT password_hash FROM admins')).rejects.toThrow()
      await expect(db.query('SELECT * FROM audit_log')).rejects.toThrow()
    } finally { await db.exec('RESET ROLE') }
  })
  it('treats SQL wildcard characters in search as literal text', async () => {
    await db.exec('SET ROLE anon')
    try { expect((await db.query("SELECT slug FROM search_published_quotes(p_search => '%')")).rows).toEqual([]) }
    finally { await db.exec('RESET ROLE') }
  })
})
