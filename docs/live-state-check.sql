-- EZvisa live-state check (read-only). Project: ezvisa-uae (ref dravvaykssrbktztmrlj).
-- Written 2026-10-23 to settle audit H8 ("docs disagree on what is live"). Changes nothing.
--
-- How to run: Supabase dashboard > SQL editor > paste this whole file > Run > in the result grid use "Copy" (or
-- "Export > CSV") and paste the output back into the chat. It is ONE select on purpose: the SQL editor only shows the
-- result of the last statement. It reads only system catalogs and row counts, so it cannot fail when an object is
-- missing, and it returns no personal data (auth users and applications appear as counts only).
--
-- Output columns: section | item | detail. Sections, in order:
--   1 migration      0001-0013 (mobile/migrations) + website scripts/006 + db/proposed-live-changes.sql:
--                    APPLIED / PARTIAL / NOT APPLIED, with the individual checks as t/f in brackets
--   2 security       derived flags for audit B1, B5, H6 (broad read, broad storage, open insert)
--   3 table          every public table: RLS on/off, live row estimate
--   4 table-check    device_tokens, wizard_events, customer_profiles, visa_application_events (exists?) + document_reviews column
--   5 column         visa_applications columns (one row, name:type, in column order)
--   6 policy         every policy on schema public and storage
--   7 grant          table privileges of anon / authenticated on visa_applications
--   8 trigger        every non-internal trigger in public (full definition)
--   9 function       public functions (security definer flagged)
--  10 realtime       tables in the supabase_realtime publication
--  11 bucket         storage buckets
--  12 extension      installed extensions
--  13 auth           auth user counts (total, unconfirmed, confirmed within 5 s of sign-up = autoconfirm hint), identity providers
--  14 data           visa_applications counts by application_status / payment_status, app vs website rows

with
-- helpers -------------------------------------------------------------------------------------------------------------
cols as (
  select table_name, column_name, data_type, ordinal_position
  from information_schema.columns where table_schema = 'public'
),
pol as (
  select schemaname, tablename, policyname, cmd, roles, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies where schemaname in ('public', 'storage')
),
trg as (
  select c.relname as table_name, t.tgname, pg_get_triggerdef(t.oid) as def
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
fn as (
  select p.proname, p.prosrc, p.prosecdef, pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
),
pub as (
  select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime'
),
has_col as (select table_name || '.' || column_name as k from cols),
-- 1) migrations: each row = id, what it creates, array of checks ------------------------------------------------------
mig(id, what, checks) as (
  values
  ('0001', 'visa_applications.passport_expiry_date column (optional)',
    array[exists(select 1 from has_col where k = 'visa_applications.passport_expiry_date')]),
  ('0002', 'policy "Customers update own applications" (draft/submitted/reviewing) + guard function + the trigger that runs it (no numbered migration creates that trigger; db/proposed-live-changes.sql does. Without it the guard does nothing)',
    array[exists(select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications' and qual ilike '%reviewing%'),
          exists(select 1 from fn where proname = 'visa_applications_guard_customer_update' and prosrc ilike '%reviewing%'),
          exists(select 1 from trg where table_name = 'visa_applications' and def ilike '%visa_applications_guard_customer_update%')]),
  ('0003', 'appointment_* columns (6) + trigger visa_applications_guard_appointment',
    array[(select count(*) = 6 from cols where table_name = 'visa_applications' and column_name in ('appointment_at', 'appointment_centre', 'appointment_address', 'appointment_lat', 'appointment_lng', 'appointment_reference')),
          exists(select 1 from trg where table_name = 'visa_applications' and tgname = 'visa_applications_guard_appointment')]),
  ('0004', 'table wizard_events + insert policy',
    array[to_regclass('public.wizard_events') is not null,
          exists(select 1 from pol where tablename = 'wizard_events' and policyname = 'Clients insert wizard events')]),
  ('0005', 'document_reviews jsonb column + object check + guard freezes document_reviews',
    array[exists(select 1 from has_col where k = 'visa_applications.document_reviews'),
          exists(select 1 from pg_constraint where conname = 'visa_applications_document_reviews_object'),
          exists(select 1 from fn where proname = 'visa_applications_guard_appointment' and prosrc ilike '%document_reviews%')]),
  ('0006', 'pg_net + device_tokens + ezvisa_notify_hook_ok() + trigger visa_applications_notify',
    array[exists(select 1 from pg_extension where extname = 'pg_net'),
          to_regclass('public.device_tokens') is not null,
          exists(select 1 from fn where proname = 'ezvisa_notify_hook_ok'),
          exists(select 1 from trg where table_name = 'visa_applications' and tgname = 'visa_applications_notify')]),
  ('0007', 'customer discard: guard allows draft/submitted -> cancelled; policy WITH CHECK accepts cancelled',
    array[exists(select 1 from fn where proname = 'visa_applications_guard_customer_update' and prosrc ilike '%discard%'),
          exists(select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications' and with_check ilike '%cancelled%')]),
  ('0008', 'wizard_events funnel: event check incl. app_start, columns outcome + ms',
    array[exists(select 1 from pg_constraint where conname = 'wizard_events_event_check' and pg_get_constraintdef(oid) ilike '%app_start%'),
          exists(select 1 from has_col where k = 'wizard_events.outcome'),
          exists(select 1 from has_col where k = 'wizard_events.ms')]),
  ('0009', 'table visa_application_events + trigger visa_applications_log_events + visa_applications in supabase_realtime',
    array[to_regclass('public.visa_application_events') is not null,
          exists(select 1 from trg where table_name = 'visa_applications' and tgname = 'visa_applications_log_events'),
          exists(select 1 from pub where schemaname = 'public' and tablename = 'visa_applications')]),
  ('0010-B', 'optional part B only (part A is read-only): updated_at trigger update_visa_applications_timestamp. Website scripts/003 creates the same trigger, so APPLIED here does not mean 0010 was run',
    array[exists(select 1 from trg where table_name = 'visa_applications' and tgname = 'update_visa_applications_timestamp')]),
  ('0011', 'bucket visa_documents + storage policies "customers read own application docs" / "customers upload own paid application docs"; admin full-access policy gone',
    array[exists(select 1 from storage.buckets where id = 'visa_documents'),
          exists(select 1 from pol where schemaname = 'storage' and policyname = 'customers read own application docs'),
          exists(select 1 from pol where schemaname = 'storage' and policyname = 'customers upload own paid application docs'),
          not exists(select 1 from pol where schemaname = 'storage' and policyname = 'Admins have full access to visa_documents')]),
  ('0012', 'table customer_profiles (+ own-row policies)',
    array[to_regclass('public.customer_profiles') is not null,
          exists(select 1 from pol where tablename = 'customer_profiles' and policyname = 'customer_profiles own select')]),
  ('0013', 'function claim_device_token(text, text) (was "0012_claim_device_token")',
    array[exists(select 1 from fn where proname = 'claim_device_token')]),
  ('web-006', 'website scripts/006: own-row SELECT policy; no "Only admins can update"; no storage admin full access',
    array[exists(select 1 from pol where tablename = 'visa_applications' and policyname = 'Users can view own submissions' and qual ilike '%lower(email)%' and qual not ilike '%auth.role()%'),
          not exists(select 1 from pol where tablename = 'visa_applications' and policyname = 'Only admins can update'),
          not exists(select 1 from pol where schemaname = 'storage' and policyname = 'Admins have full access to visa_documents')]),
  ('db-proposed', 'mobile/db/proposed-live-changes.sql: tracking_token + preferred_language columns',
    array[exists(select 1 from has_col where k = 'visa_applications.tracking_token'),
          exists(select 1 from has_col where k = 'visa_applications.preferred_language')])
),
-- output ---------------------------------------------------------------------------------------------------------------
out(ord, section, item, detail) as (
  select 1, 'migration', id,
         case when true = all(checks) then 'APPLIED' when true = any(checks) then 'PARTIAL' else 'NOT APPLIED' end
         || ' [' || array_to_string(checks::text[], ',') || '] ' || what
  from mig

  union all
  select 2, 'security', 'B1 any SELECT/ALL policy on visa_applications open to every signed-in user',
         coalesce((select string_agg(policyname, '; ') from pol where tablename = 'visa_applications' and cmd in ('SELECT', 'ALL')
                   and (qual ilike '%auth.role()%' or qual = '' or qual = 'true')), 'none')
  union all
  select 2, 'security', 'B1 storage policies on visa_documents / visa-documents without a per-folder check',
         coalesce((select string_agg(policyname || ' (' || cmd || ')', '; ') from pol where schemaname = 'storage'
                   and (qual || with_check) ilike '%visa_documents%' and (qual || with_check) not ilike '%foldername%'), 'none')
  union all
  select 2, 'security', 'B5/H6 INSERT policies on visa_applications (with_check shown in section 6)',
         coalesce((select string_agg(policyname || ' to ' || array_to_string(roles, ',') || case when with_check in ('', 'true') then ' [NO CHECK]' else '' end, '; ')
                   from pol where tablename = 'visa_applications' and cmd in ('INSERT', 'ALL')), 'none')
  union all
  select 2, 'security', 'B5 BEFORE INSERT trigger on visa_applications (would force pending/unpaid on insert)',
         coalesce((select string_agg(tgname, '; ') from trg where table_name = 'visa_applications' and def ilike '%BEFORE INSERT%'), 'none')
  union all
  select 2, 'security', 'RLS enabled on visa_applications',
         coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.visa_applications')), 'table missing')

  union all
  select 3, 'table', c.relname,
         'RLS ' || case when c.relrowsecurity then 'on' else 'OFF' end || ', rows~' || coalesce(s.n_live_tup, 0)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace left join pg_stat_user_tables s on s.relid = c.oid
  where n.nspname = 'public' and c.relkind in ('r', 'p')

  union all
  select 4, 'table-check', t, case when to_regclass('public.' || t) is not null then 'EXISTS' else 'missing' end
  from unnest(array['device_tokens', 'wizard_events', 'customer_profiles', 'visa_application_events']) as t
  union all
  select 4, 'table-check', 'document_reviews (column on visa_applications)',
         case when exists(select 1 from has_col where k = 'visa_applications.document_reviews') then 'EXISTS' else 'missing' end
  union all
  select 4, 'table-check', 'document_reviews (as a table)', case when to_regclass('public.document_reviews') is not null then 'EXISTS' else 'missing' end

  union all
  select 5, 'column', 'visa_applications',
         (select string_agg(column_name || ':' || data_type, ', ' order by ordinal_position) from cols where table_name = 'visa_applications')

  union all
  select 6, 'policy', schemaname || '.' || tablename || ' :: ' || policyname,
         cmd || ' to ' || array_to_string(roles, ',')
         || case when qual <> '' then ' USING ' || qual else '' end
         || case when with_check <> '' then ' CHECK ' || with_check else '' end
  from pol

  union all
  select 7, 'grant', grantee || ' on visa_applications', string_agg(privilege_type, ', ' order by privilege_type)
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'visa_applications' and grantee in ('anon', 'authenticated')
  group by grantee

  union all
  select 8, 'trigger', table_name || ' :: ' || tgname, def from trg

  union all
  select 9, 'function', proname || '(' || args || ')', case when prosecdef then 'SECURITY DEFINER' else 'invoker' end from fn

  union all
  select 10, 'realtime', schemaname || '.' || tablename, 'in supabase_realtime' from pub
  union all
  select 10, 'realtime', '(count)', (select count(*)::text from pub)

  union all
  select 11, 'bucket', id, 'public=' || public || ', size_limit=' || coalesce(file_size_limit::text, 'none')
         || ', mime=' || coalesce(array_to_string(allowed_mime_types, ','), 'any')
  from storage.buckets

  union all
  select 12, 'extension', extname, extversion from pg_extension

  union all
  select 13, 'auth', 'users',
         'total=' || count(*) || ', unconfirmed=' || count(*) filter (where email_confirmed_at is null)
         || ', confirmed within 5s of sign-up=' || count(*) filter (where email_confirmed_at - created_at < interval '5 seconds')
         || ', newest sign-up=' || coalesce(max(created_at)::date::text, '-')
  from auth.users
  union all
  select 13, 'auth', 'identity provider: ' || provider, count(*)::text from auth.identities group by provider

  union all
  select 14, 'data', 'visa_applications status=' || coalesce(application_status, 'null') || ' / payment=' || coalesce(payment_status, 'null'),
         count(*)::text
  from public.visa_applications group by application_status, payment_status
  union all
  select 14, 'data', 'visa_applications from the app (additional_notes source mobile-app)',
         count(*) filter (where additional_notes like '%"source":"mobile-app"%') || ' of ' || count(*)
         || ', newest row=' || coalesce(max(created_at)::date::text, '-')
  from public.visa_applications
)
select section, item, detail from out order by ord, item;
