// Disposable local database/API for browser verification. No .env file is read.
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { createServer, request } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import bcrypt from 'bcrypt'
import { auditSecret } from './audit-env.mjs'

const db = new PGlite({ extensions: { pg_trgm, unaccent } })
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;`)
for (const file of readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort())
  await db.exec(readFileSync(resolve('supabase/migrations',file),'utf8'))
await db.query("INSERT INTO admins(email,password_hash) VALUES($1,$2)", ['audit@example.test', await bcrypt.hash('LocalAudit-Password-Only!',12)])
await db.exec(`INSERT INTO scholars(slug,english_name,arabic_name) VALUES('audit-scholar','SYNTHETIC TEST Scholar','اسم اختباري');
  INSERT INTO sources(slug,title) VALUES('audit-source','SYNTHETIC TEST Source');
  INSERT INTO categories(slug,name) VALUES('audit-category','SYNTHETIC TEST Category');
  INSERT INTO translators(slug,name) VALUES('audit-translator','SYNTHETIC TEST Translator');
  INSERT INTO tags(slug,name) VALUES('audit-tag','SYNTHETIC TEST Tag');
  INSERT INTO quotes(slug,english_text,arabic_text,scholar_id,source_id,translator_id,status,published_at,admin_notes)
    SELECT 'audit-quote-'||n,'SYNTHETIC TEST CONTENT '||n,'نص اختباري فقط '||n,s.id,so.id,tr.id,'published',now(),'PRIVATE AUDIT NOTE'
    FROM generate_series(1,25) n CROSS JOIN scholars s CROSS JOIN sources so CROSS JOIN translators tr;
  INSERT INTO quote_categories SELECT q.id,c.id FROM quotes q CROSS JOIN categories c;
  INSERT INTO quote_tags SELECT q.id,t.id FROM quotes q CROSS JOIN tags t;`)

const wire = new PGLiteSocketServer({ db, host:'127.0.0.1',port:55432 })
await wire.start()
const api = spawn(resolve(process.env.AUDIT_POSTGREST_BIN || '.audit-tools/postgrest/postgrest.exe'), [], {
  windowsHide:true, stdio:'inherit',
  env:{...process.env,PGRST_DB_URI:'postgres://postgres@127.0.0.1:55432/postgres?sslmode=disable',
    PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_DB_POOL:'1',PGRST_DB_CHANNEL_ENABLED:'false',
    PGRST_DB_PREPARED_STATEMENTS:'false',PGRST_DB_MAX_ROWS:'1000',PGRST_SERVER_HOST:'127.0.0.1',
    PGRST_SERVER_PORT:'55433',PGRST_JWT_SECRET:auditSecret},
})
api.on('error', e => { console.error(e.message); process.exitCode=1 })
// Supabase clients prepend /rest/v1; forward to an actual PostgREST server.
const gateway = createServer((req,res) => {
  if (!req.url?.startsWith('/rest/v1/')) { res.writeHead(404).end(); return }
  const upstream = request({hostname:'127.0.0.1',port:55433,path:req.url.slice('/rest/v1'.length),
    method:req.method,headers:{...req.headers,host:'127.0.0.1:55433'}}, r => {
      res.writeHead(r.statusCode || 502,r.headers); r.pipe(res)
    })
  upstream.on('error',()=>res.writeHead(503).end('Audit API starting'))
  req.pipe(upstream)
})
gateway.listen(55434,'127.0.0.1')
async function close() { gateway.close(); api.kill(); await wire.stop(); await db.close(); process.exit() }
process.on('SIGINT',close); process.on('SIGTERM',close)
console.log('Isolated audit database/API started; all records are synthetic and in memory.')
