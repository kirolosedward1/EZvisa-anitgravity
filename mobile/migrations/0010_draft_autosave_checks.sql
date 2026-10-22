-- 0010: draft autosave / resume (chat 06).  NOT APPLIED. Nothing in this file is required for the feature to work.
-- Project: ezvisa-uae (dravvaykssrbktztmrlj). This session could not reach that project (network policy), so the facts the
-- code relies on come from lib/database.types.ts, migrations 0002-0007 and the website code. Part A verifies them;
-- part B is an optional hardening step that needs the owner's approval before it is run.

-- =====================================================================================================================
-- A. READ-ONLY checks (safe to run any time in the SQL editor)
-- =====================================================================================================================

-- A1. Columns the autosave uses (no version column exists; updated_at is the version).
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'visa_applications'
  and column_name in ('id', 'email', 'application_status', 'additional_notes', 'updated_at', 'destination_country')
order by column_name;

-- A2. Is there an updated_at trigger? (The app and website also send updated_at themselves and read the stored value
--     back, so stale-copy detection works either way. Without a trigger, staff edits made outside the app don't change
--     updated_at, so an open draft would not notice them; see B1.)
select tgname, pg_get_triggerdef(t.oid)
from pg_trigger t join pg_class c on c.oid = t.tgrelid
where c.relname = 'visa_applications' and not t.tgisinternal;

-- A3. Policies: signed-in customers must be able to INSERT and SELECT their own rows and UPDATE them while draft.
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'visa_applications'
order by cmd, policyname;

-- A4. After testing: drafts per account (expect one per application in progress, no duplicates).
select lower(email) as email, destination_country, count(*) as drafts, max(updated_at) as last_saved
from public.visa_applications
where application_status = 'draft'
group by 1, 2
having count(*) > 1
order by last_saved desc;

-- A5. After testing: one test draft in detail (replace the email).
select id, application_status, updated_at,
       additional_notes::jsonb ->> 'wizardStep'     as step,
       additional_notes::jsonb ->> 'wizardQuestion' as question,
       additional_notes::jsonb ->> 'lastEditedOn'   as last_edited_on,
       additional_notes::jsonb ->> 'source'         as source
from public.visa_applications
where lower(email) = lower('you+ezvisa-app-test@gmail.com')
order by updated_at desc;

-- =====================================================================================================================
-- B. OPTIONAL (needs approval). Only if A2 shows no BEFORE UPDATE trigger that sets updated_at.
-- =====================================================================================================================
-- B1. Keep updated_at current on every update (also staff / service-role edits), as scripts/003 on the website defines.
--     Additive; changes no data. Customer updates already pass through visa_applications_guard_customer_update().
-- create or replace function public.update_visa_applications_updated_at() returns trigger
-- language plpgsql set search_path = public as $$
-- begin
--   new.updated_at = now();
--   return new;
-- end $$;
-- drop trigger if exists update_visa_applications_timestamp on public.visa_applications;
-- create trigger update_visa_applications_timestamp before update on public.visa_applications
--   for each row execute function public.update_visa_applications_updated_at();
