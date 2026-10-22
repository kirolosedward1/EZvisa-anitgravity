-- =====================================================================================
-- PROPOSED changes for the LIVE website database: Supabase project ezvisa-uae
-- (ref dravvaykssrbktztmrlj). NOT APPLIED. Needs the owner's approval.
-- Written 2026-10-19 by the EZvisa app work. Each block is independent and idempotent;
-- run them in order in the SQL editor (or as one migration) after review.
-- Nothing here deletes data. The website's server routes use the service role, which
-- bypasses RLS, so blocks 3 and 4 do not affect them.
-- =====================================================================================

-- 1) Document bucket the website code actually uses.
--    The web routes /api/upload-document and /api/download-document use bucket "visa_documents"
--    (underscore), but the live project only has "visa-documents" (hyphen, 0 objects).
--    Creating "visa_documents" fixes the website (once its env vars are set) and gives the app the same bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visa_documents', 'visa_documents', false, 5242880,
        array['application/pdf','image/jpeg','image/jpg','image/png'])
on conflict (id) do nothing;

-- 2) Let a signed-in customer upload/read files ONLY under their own application's folder:
--    visa_documents/<visa_applications.id>/<documentType>_<rand>.<ext> (same path scheme as the website).
--    Ownership is the application's email = the user's verified JWT email (same rule as the website dashboard).
drop policy if exists "customers upload own application docs" on storage.objects;
create policy "customers upload own application docs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'visa_documents'
    and exists (
      select 1 from public.visa_applications va
      where va.id::text = (storage.foldername(name))[1]
        and lower(va.email) = lower(auth.jwt() ->> 'email')
    )
  );
drop policy if exists "customers read own application docs" on storage.objects;
create policy "customers read own application docs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'visa_documents'
    and exists (
      select 1 from public.visa_applications va
      where va.id::text = (storage.foldername(name))[1]
        and lower(va.email) = lower(auth.jwt() ->> 'email')
    )
  );
-- (upsert=true in the website/app needs UPDATE as well)
drop policy if exists "customers replace own application docs" on storage.objects;
create policy "customers replace own application docs" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'visa_documents'
    and exists (
      select 1 from public.visa_applications va
      where va.id::text = (storage.foldername(name))[1]
        and lower(va.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 3) Columns the website code reads/writes but which do not exist on the live table.
--    tracking_token: used by /track/[token], /api/upload-document?token=, /api/download-document, emails.
--    preferred_language: used by the email service.
alter table public.visa_applications
  add column if not exists tracking_token uuid not null default gen_random_uuid(),
  add column if not exists preferred_language text default 'en';
create unique index if not exists visa_applications_tracking_token_key on public.visa_applications (tracking_token);

-- 4) SECURITY FIX (recommended, important). Today:
--    - "Users can view own submissions" is  (email = jwt email) OR auth.role() = 'authenticated'
--      => ANY signed-in user can read EVERY application (names, passport numbers, phones).
--    - "Only admins can update" is  auth.role() = 'authenticated'
--      => ANY signed-in user can modify ANY application.
--    - anon/authenticated also hold TRUNCATE/DELETE/REFERENCES/TRIGGER grants on the table.
--    Replace with own-row rules. The app (and the website dashboard) only ever touch rows where
--    email = the signed-in user's email, so they keep working. Admin uses the service role.
drop policy if exists "Users can view own submissions" on public.visa_applications;
create policy "Users can view own submissions" on public.visa_applications
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Only admins can update" on public.visa_applications;
drop policy if exists "Customers update own unpaid applications" on public.visa_applications;
create policy "Customers update own unpaid applications" on public.visa_applications
  for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status,'submitted') in ('draft','submitted'))
  with check (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status,'submitted') in ('draft','submitted'));

-- Customers must not be able to mark their own case paid/ready: freeze staff/payment columns for non-service callers.
create or replace function public.visa_applications_guard_customer_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.payment_status := old.payment_status;
    new.payment_amount := old.payment_amount;
    new.payment_id     := old.payment_id;
    new.email          := old.email;
    if old.application_status = 'submitted' and new.application_status <> 'submitted' then
      new.application_status := old.application_status;  -- only draft -> submitted is allowed for customers
    end if;
    if new.application_status not in ('draft', 'submitted') then
      new.application_status := old.application_status;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists visa_applications_guard_customer_update on public.visa_applications;
create trigger visa_applications_guard_customer_update
  before update on public.visa_applications
  for each row execute function public.visa_applications_guard_customer_update();

-- Inserts: keep public submissions but require the row's email to be the caller's own email when signed in.
drop policy if exists "Allow public submissions" on public.visa_applications;
create policy "Allow public submissions" on public.visa_applications
  for insert to anon, authenticated
  with check (auth.role() = 'anon' or lower(email) = lower(auth.jwt() ->> 'email'));

revoke truncate, delete, references, trigger on public.visa_applications from anon, authenticated;

-- 5) OPTIONAL (not needed for the current app): device push tokens so EZvisa can notify customers.
-- create table if not exists public.push_tokens (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users(id) on delete cascade,
--   expo_push_token text not null unique, platform text, created_at timestamptz default now()
-- );
-- alter table public.push_tokens enable row level security;
-- create policy "own push tokens" on public.push_tokens for all to authenticated
--   using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -------------------------------------------------------------------------------------
-- NOT SQL, also needed (dashboard settings, owner action):
--  a) Vercel project serving www.ezvisa.net: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
--     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server only), ZIINA_API_KEY (+ ZIINA_WEBHOOK_SECRET), then redeploy.
--     Today the live site answers 500 "Storage not configured" / "Payment service configuration error",
--     and its browser bundle falls back to https://placeholder-project.supabase.co (login/signup cannot work).
--  b) Supabase Auth > URL configuration: Site URL = https://www.ezvisa.net (currently http://localhost:3000),
--     Redirect URLs: https://www.ezvisa.net/**, https://ezvisa.net/**, ezvisa://** .
--  c) (optional) enable the Google provider if Google sign-in is wanted (currently disabled).
-- -------------------------------------------------------------------------------------
