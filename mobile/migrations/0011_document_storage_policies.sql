-- PROPOSED 2026-10-22 (chat 09). NOT APPLIED. Needs the owner's approval before it runs on ezvisa-uae (dravvaykssrbktztmrlj).
-- Customer access to their own document files in the private bucket `visa_documents`:
--   * read (needed for 60-second signed URLs in the app): only files under their own application's folder
--   * upload (the app's fallback when the website route is down): only into their own, PAID application while it can
--     still take documents
--   * no update, no delete for customers (staff and the website use the service role, which bypasses RLS)
-- Object layout (website and app): visa_documents/<visa_applications.id>/<documentType>_<uploadId>.<ext>
-- Ownership = the application's email is the signed-in user's email (same rule as the dashboard and 0002).
-- Supersedes db/proposed-live-changes.sql blocks 1 and 2 (adds the payment check, drops the customer UPDATE policy).

-- 0) Read-only check first. Run this alone and keep the output with the approval:
--    select id, public, file_size_limit, allowed_mime_types from storage.buckets where id in ('visa_documents', 'visa-documents');
--    select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;

begin;

-- 1) The bucket the website code and the app use (the live project was last seen with only "visa-documents").
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visa_documents', 'visa_documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- 2) Remove broad or older customer policies on this bucket.
--    scripts/005 gave EVERY signed-in user full access to every file (passports, bank statements).
drop policy if exists "Admins have full access to visa_documents" on storage.objects;
drop policy if exists "customers upload own application docs" on storage.objects;
drop policy if exists "customers read own application docs" on storage.objects;
drop policy if exists "customers replace own application docs" on storage.objects;

-- 3) Read own files (signed URLs are created only if this SELECT is allowed).
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

-- 4) Upload only into own, paid application that can still take documents (same list as the app: UPLOAD_STATUSES).
create policy "customers upload own paid application docs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'visa_documents'
    and exists (
      select 1 from public.visa_applications va
      where va.id::text = (storage.foldername(name))[1]
        and lower(va.email) = lower(auth.jwt() ->> 'email')
        and va.payment_status in ('paid', 'completed')
        and coalesce(va.application_status, 'submitted') in ('draft', 'submitted', 'reviewing', 'awaiting_documents')
    )
  );

commit;

-- After applying: the second query in step 0 should list exactly the two "customers ..." policies for this bucket and no
-- policy with `bucket_id = 'visa_documents'` alone. Then test with two accounts (see mobile/HANDOFF.md section 2f).
