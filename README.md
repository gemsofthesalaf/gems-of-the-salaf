# Gems of the Salaf (جواهر السلف)

A scholarly digital library of sayings from the Salaf, featuring Arabic originals and English translations.

## Architecture

This project is built as a production-ready, full-stack application using the Vercel + Supabase stack.

### Technologies:
- **Next.js 16 (App Router)**: Handles routing, server-side rendering, and static generation.
- **Supabase**: 
  - **PostgreSQL Database**: Stores all content.
  - **Auth**: Manages administrative sessions.
  - **Row-Level Security (RLS)**: Enforces access control at the database layer.
- **Tailwind CSS**: Styling and responsive design.

### Security Model:
- **Middleware**: `src/lib/supabase/middleware.ts` intercepts all requests to `/admin`. It verifies the user's JWT and queries the database via an RPC function (`is_admin()`) to ensure only authorized admins can access the CMS.
- **RLS Policies**: The `public.quotes` and `public.imports` tables are strictly protected by Postgres Row-Level Security. Public users can only execute `SELECT` queries on quotes where `status = 'published'`. All mutations require a valid JWT belonging to a user ID listed in the `public.admins` table.

## Deployment & Configuration

### Prerequisites
1. Node.js 18+
2. A Supabase Project
3. A Vercel Account

### Environment Variables
Create a `.env.local` file in the root directory:

```bash
# The URL of your Supabase project
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co

# The public anon key for Supabase (safe for client use)
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]

# Site URL for SEO and canonical links (e.g., https://gemsofthesalaf.com)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
*(Note: Never expose the `SUPABASE_SERVICE_ROLE_KEY` in public variables. The current application design relies on RLS and standard Anon keys paired with authenticated JWTs to securely execute backend mutations.)*

### Database Migrations
1. Navigate to the Supabase SQL Editor.
2. Execute the schema script located in `supabase/migrations/001_initial_schema.sql`.
3. To authorize an admin, first create a user via Supabase Auth, then manually copy their UUID into the `public.admins` table.

### Local Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Telegram Import System
The Telegram Import system is designed for safety and scalability:
1. **Pending Queue**: Imported strings are parsed and stored in the `public.imports` table under a `pending` status.
2. **Human Review**: An admin must manually review and approve the parse results via the `/admin/import` CMS interface.
3. **Idempotency**: Rejected or duplicate records are simply marked `rejected` or deleted from the queue without touching the production `quotes` table.

## SEO & Rendering
- **Public Routes** (`/quotes`, `/scholars`, etc.) are heavily optimized using Next.js Server Components.
- Data fetching occurs server-side to guarantee indexing by web crawlers.
- `robots.txt` and `sitemap.xml` are dynamically generated to shield admin routes and expose published content.
