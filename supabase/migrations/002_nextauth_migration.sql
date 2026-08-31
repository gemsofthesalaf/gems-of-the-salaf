-- Migration to support NextAuth Credentials provider

-- Add the credential hash used by the NextAuth Credentials provider.
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Drop the old RLS policies that rely on auth.uid()
-- Since we are moving to Server Actions + NextAuth + Service Role, 
-- we can just leave RLS enabled but drop the specific authenticated mutation policies,
-- OR we can leave them for backward compatibility if the user ever goes back.
-- It's safer to leave them, since they won't trigger (auth.uid() will be null).

-- Administrative mutations use the service role only after a fresh server-side
-- NextAuth administrator check. The service role key is never exposed publicly.
