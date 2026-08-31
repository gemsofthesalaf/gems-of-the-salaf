# Gems of the Salaf · جواهر السلف

Production-oriented, searchable archive of attributed sayings with Arabic originals, English translations, source metadata, scholars, categories, tags, and translators. Religious content is never seeded or synthesized by this repository.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript, Server Components by default
- Tailwind CSS 4 with a small shared editorial design system
- PostgreSQL on Supabase with normalized relations, constraints, RLS, indexes, and database-backed search/pagination
- NextAuth v4 Credentials provider with JWT sessions
- Zod validation and server actions for the CMS
- Vitest and Testing Library regression tests

## Configuration

Copy `.env.example` to `.env.local` and provide:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SERVICE_ROLE_KEY
NEXTAUTH_SECRET=LONG_RANDOM_SECRET
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For production, set both URL variables to `https://gemsofthesalaf.com`. The service-role key and NextAuth secret are server-only secrets and must be configured in the deployment secret store. Never prefix them with `NEXT_PUBLIC_` or commit `.env.local`.

## Database setup

Apply the SQL files in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_nextauth_migration.sql`
3. `supabase/migrations/003_final_production.sql`

The final migration adds normalized Arabic search, trigram indexes, stable database pagination, audit records, transactional quote saves/deletes, and safe tag merging. `supabase/seed.sql` is intentionally empty.

Create an initial administrator by generating a bcrypt hash (cost 12 or greater) and inserting the email and hash directly through the secured Supabase SQL editor:

```sql
INSERT INTO public.admins (email, password_hash, role)
VALUES ('admin@example.com', '$2b$12$REPLACE_WITH_A_REAL_BCRYPT_HASH', 'admin');
```

Rotate that bootstrap password after first login. Do not expose an administrator-creation endpoint publicly.

## Authentication and authorization

NextAuth verifies credentials against `public.admins` using a server-only Supabase service-role client and bcrypt. Sessions use signed, HTTP-only, same-site JWT cookies with an eight-hour maximum age. The proxy provides an early redirect for unauthenticated admin requests.

The proxy is not the security boundary. Every protected page and every mutation calls `requireAdmin()`, validates the signed NextAuth session, then re-checks the administrator row in PostgreSQL before accessing the service-role client. Draft and archived quotations are excluded from public RLS policies and public data access.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Public routes

`/`, `/quotes`, `/quotes/[slug]`, `/scholars`, `/scholars/[slug]`, `/categories`, `/categories/[slug]`, `/sources`, `/sources/[slug]`, `/translators`, `/translators/[slug]`, `/about`, `/sitemap.xml`, and `/robots.txt`.

## Administrative routes

`/admin/login`, `/admin`, `/admin/quotes`, `/admin/quotes/new`, `/admin/quotes/[id]/edit`, `/admin/scholars`, `/admin/sources`, `/admin/categories`, `/admin/translators`, and `/admin/tags`.

## Deployment

Deploy the Next.js application to Vercel (or another compatible Node host), configure the production environment variables, apply all migrations to the production Supabase project, and verify the custom domain. Run the complete build and authenticated browser acceptance journey against a staging environment before promoting it.
