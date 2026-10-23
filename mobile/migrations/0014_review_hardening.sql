-- 0014: hardening from the 2026-10-23 code review.  NOT APPLIED (review first, then run once in the SQL editor of the
-- live project). Idempotent: safe to run more than once. Website and app code need no change for any of this; the
-- website server uses the service role, which these checks don't touch.
--
-- 1) email_logs had no row level security, so the public (publishable) key could read recipient emails + application
--    ids and insert/delete rows (breaking email idempotency). Only the server (service role) uses it.
-- 2) The customer guard function existed, but no applied migration attached it as a trigger: without it a signed-in
--    customer could set payment_status = 'paid' on their own row. Attach it.
-- 3) Guard: also lock everything except notes and document flags while 'awaiting_documents' (staff asked for
--    documents and the app uploads in that status), and stop a NULL status slipping past the checks.
-- 4) UPDATE policy: include 'awaiting_documents'. Uploads in that status were stored but the row update matched
--    0 rows, so the app never recorded or showed the file.
-- 5) Client INSERT could set any column (payment_status 'paid', application_status 'ready', appointment...).
--    A BEFORE INSERT guard forces safe values for anon/authenticated; signed-in callers can only insert rows
--    under their own email.
-- 6) Emails are stored lower-case so the app's exact-match queries and realtime filters see staff-entered rows.
-- 7) avatars bucket: private, each user only their own folder (app: lib/avatar.ts, avatars/<uid>/avatar.<ext>).

-- 1) email_logs -------------------------------------------------------------------------------------------------
alter table if exists public.email_logs enable row level security;
revoke all on public.email_logs from anon, authenticated;

-- 2 + 3) update guard ---------------------------------------------------------------------------------------------
create or replace function public.visa_applications_guard_customer_update()
returns trigger language plpgsql set search_path to 'public' as $function$
declare keep_notes text; f1 boolean; f2 boolean; f3 boolean; f4 boolean; discard boolean;
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    discard := auth.role() = 'authenticated' and coalesce(new.application_status, '') = 'cancelled' and old.application_status in ('draft', 'submitted')
               and coalesce(old.payment_status, '') not in ('paid', 'completed');
    new.payment_status := old.payment_status;
    new.payment_amount := old.payment_amount;
    new.payment_id     := old.payment_id;
    new.email          := old.email;
    if discard then
      keep_notes := new.additional_notes;
      new := old;
      new.application_status := 'cancelled'; new.additional_notes := keep_notes; new.updated_at := now();
      return new;
    end if;
    -- Only draft -> submitted is a customer status change (coalesce: a NULL status used to pass both checks).
    if old.application_status = 'submitted' and new.application_status is distinct from 'submitted' then
      new.application_status := old.application_status;
    end if;
    if coalesce(new.application_status, '') not in ('draft', 'submitted') then
      new.application_status := old.application_status;
    end if;
    -- In review or waiting for documents: notes (uploads list, answers) and document flags only.
    if old.application_status in ('reviewing', 'awaiting_documents') then
      keep_notes := new.additional_notes; f1 := new.has_passport; f2 := new.has_photos; f3 := new.has_bank_statements; f4 := new.has_employment_proof;
      new := old;
      new.additional_notes := keep_notes; new.has_passport := f1; new.has_photos := f2; new.has_bank_statements := f3; new.has_employment_proof := f4;
      new.updated_at := now();
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists visa_applications_guard_customer_update on public.visa_applications;
create trigger visa_applications_guard_customer_update
  before update on public.visa_applications
  for each row execute function public.visa_applications_guard_customer_update();

-- 4) update policy -------------------------------------------------------------------------------------------------
drop policy if exists "Customers update own applications" on public.visa_applications;
create policy "Customers update own applications" on public.visa_applications for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status, 'submitted') in ('draft', 'submitted', 'reviewing', 'awaiting_documents'))
  with check (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status, 'submitted') in ('draft', 'submitted', 'reviewing', 'awaiting_documents', 'cancelled'));

-- 5) insert guard + policy -----------------------------------------------------------------------------------------
create or replace function public.visa_applications_guard_customer_insert()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.payment_status := 'pending';
    new.payment_id     := null;
    new.payment_amount := null;
    if coalesce(new.application_status, '') not in ('draft', 'submitted') then
      new.application_status := 'submitted';
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists visa_applications_guard_customer_insert on public.visa_applications;
create trigger visa_applications_guard_customer_insert
  before insert on public.visa_applications
  for each row execute function public.visa_applications_guard_customer_insert();

-- Guest (anon) checkout stays possible; a signed-in caller can only file under their own email.
drop policy if exists "Allow public submissions" on public.visa_applications;
create policy "Allow public submissions" on public.visa_applications
  for insert to anon, authenticated
  with check (auth.role() = 'anon' or lower(email) = lower(auth.jwt() ->> 'email'));

-- 6) lower-case emails -----------------------------------------------------------------------------------------------
create or replace function public.visa_applications_lower_email()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.email is not null then new.email := lower(trim(new.email)); end if;
  return new;
end $function$;

drop trigger if exists visa_applications_lower_email on public.visa_applications;
create trigger visa_applications_lower_email
  before insert or update of email on public.visa_applications
  for each row execute function public.visa_applications_lower_email();

update public.visa_applications set email = lower(trim(email)) where email is not null and email <> lower(trim(email));

-- 7) avatars bucket --------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
  on conflict (id) do update set public = false;

drop policy if exists "avatars own read" on storage.objects;
drop policy if exists "avatars own insert" on storage.objects;
drop policy if exists "avatars own update" on storage.objects;
drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
