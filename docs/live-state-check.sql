-- EZvisa live-state check. READ-ONLY: one SELECT statement, no writes, no DDL, no secrets, no personal data
-- (counts only; no emails, names or passport numbers are returned).
-- Project: ezvisa-uae (ref dravvaykssrbktztmrlj). Run in Supabase -> SQL Editor as the default (postgres) role.
-- Output: one table with columns section | item | result | detail. Export it (Download CSV) or copy all rows and paste them back.
--
-- Sections
--   01 migrations     which of mobile/migrations 0001-0013 are applied, judged by the objects each one creates
--   02 security       audit B1 / B5 / H6 checks (broad policies, insert guard, grants), website scripts 003/005/006
--   03 tables         every public table, row-level security on/off, plus the four tables asked about
--   04 policies       every policy on schemas public and storage (USING / WITH CHECK text)
--   05 buckets        storage buckets and object counts
--   06 columns        public.visa_applications columns
--   07 triggers       every user trigger on public tables and storage.objects
--   08 realtime       tables in the supabase_realtime publication
--   09 functions      functions in schema public (security definer flag)
--   10 extensions     installed extensions
--   11 data           counts only: applications by status, auth users, identities by provider, tokens, events

with
cols as (
  select table_name as t, column_name as c, data_type, is_nullable, column_default, ordinal_position
  from information_schema.columns where table_schema = 'public'
),
pol as (
  select schemaname, tablename, policyname, cmd, roles::text as roles, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies where schemaname in ('public', 'storage')
),
trg as (
  select n.nspname as sch, c.relname as tbl, t.tgname, pg_get_triggerdef(t.oid) as def
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and (n.nspname = 'public' or (n.nspname = 'storage' and c.relname = 'objects'))
),
fn as (
  select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosrc as src, p.prosecdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
),
con as (
  select cl.relname as tbl, co.conname, pg_get_constraintdef(co.oid) as def
  from pg_constraint co join pg_class cl on cl.oid = co.conrelid join pg_namespace n on n.oid = cl.relnamespace
  where n.nspname = 'public'
),
pub as (select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime'),
tbls as (
  select c.relname as t, c.relrowsecurity as rls, c.relforcerowsecurity as forced
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p')
),
-- One row per object a migration creates. found = the object is there now.
checks(mig, obj, found) as (
  select '0001 optional_passport_expiry_column', 'column visa_applications.passport_expiry_date',
         exists (select 1 from cols where t = 'visa_applications' and c = 'passport_expiry_date')
  union all select '0002 paid_customers_update_notes', 'policy "Customers update own applications"',
         exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications')
  union all select '0002 paid_customers_update_notes', 'function visa_applications_guard_customer_update()',
         exists (select 1 from fn where proname = 'visa_applications_guard_customer_update')
  union all select '0002 paid_customers_update_notes', 'trigger calling guard_customer_update (0002 has none; only db/proposed-live-changes block 4 creates it)',
         exists (select 1 from trg where tbl = 'visa_applications' and def ilike '%visa_applications_guard_customer_update%')
  union all select '0003 appointment_columns', 'all 6 appointment_* columns',
         (select count(*) from cols where t = 'visa_applications' and c in ('appointment_at', 'appointment_centre', 'appointment_address',
            'appointment_lat', 'appointment_lng', 'appointment_reference')) = 6
  union all select '0003 appointment_columns', 'trigger visa_applications_guard_appointment',
         exists (select 1 from trg where tbl = 'visa_applications' and tgname = 'visa_applications_guard_appointment')
  union all select '0004 wizard_events', 'table wizard_events', exists (select 1 from tbls where t = 'wizard_events')
  union all select '0004 wizard_events', 'policy "Clients insert wizard events"',
         exists (select 1 from pol where tablename = 'wizard_events' and policyname = 'Clients insert wizard events')
  union all select '0005 document_reviews', 'column visa_applications.document_reviews',
         exists (select 1 from cols where t = 'visa_applications' and c = 'document_reviews')
  union all select '0005 document_reviews', 'constraint visa_applications_document_reviews_object',
         exists (select 1 from con where conname = 'visa_applications_document_reviews_object')
  union all select '0005 document_reviews', 'guard_appointment() also freezes document_reviews',
         exists (select 1 from fn where proname = 'visa_applications_guard_appointment' and src ilike '%document_reviews%')
  union all select '0006 push_notifications', 'extension pg_net', exists (select 1 from pg_extension where extname = 'pg_net')
  union all select '0006 push_notifications', 'table device_tokens', exists (select 1 from tbls where t = 'device_tokens')
  union all select '0006 push_notifications', 'function ezvisa_notify_hook_ok(text)', exists (select 1 from fn where proname = 'ezvisa_notify_hook_ok')
  union all select '0006 push_notifications', 'trigger visa_applications_notify',
         exists (select 1 from trg where tbl = 'visa_applications' and tgname = 'visa_applications_notify')
  union all select '0007 customer_discard', 'guard_customer_update() handles discard',
         exists (select 1 from fn where proname = 'visa_applications_guard_customer_update' and src ilike '%discard%')
  union all select '0007 customer_discard', 'update policy WITH CHECK accepts cancelled',
         exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications' and with_check ilike '%cancelled%')
  union all select '0008 wizard_events_funnel', 'column wizard_events.outcome', exists (select 1 from cols where t = 'wizard_events' and c = 'outcome')
  union all select '0008 wizard_events_funnel', 'column wizard_events.ms', exists (select 1 from cols where t = 'wizard_events' and c = 'ms')
  union all select '0008 wizard_events_funnel', 'constraint wizard_events_page_format', exists (select 1 from con where conname = 'wizard_events_page_format')
  union all select '0008 wizard_events_funnel', 'event check allows app_start',
         exists (select 1 from con where tbl = 'wizard_events' and conname = 'wizard_events_event_check' and def ilike '%app_start%')
  union all select '0009 status_events_realtime', 'table visa_application_events', exists (select 1 from tbls where t = 'visa_application_events')
  union all select '0009 status_events_realtime', 'trigger visa_applications_log_events',
         exists (select 1 from trg where tbl = 'visa_applications' and tgname = 'visa_applications_log_events')
  union all select '0009 status_events_realtime', 'visa_applications in supabase_realtime',
         exists (select 1 from pub where schemaname = 'public' and tablename = 'visa_applications')
  union all select '0010 draft_autosave_checks (read-only; optional part B)', 'BEFORE UPDATE trigger setting updated_at (website script 003 also creates it)',
         exists (select 1 from trg where tbl = 'visa_applications' and def ilike '%before update%'
                 and (tgname = 'update_visa_applications_timestamp' or def ilike '%updated_at%'))
  union all select '0011 document_storage_policies', 'bucket visa_documents (underscore)', exists (select 1 from storage.buckets where id = 'visa_documents')
  union all select '0011 document_storage_policies', 'policy "customers read own application docs"',
         exists (select 1 from pol where schemaname = 'storage' and policyname = 'customers read own application docs')
  union all select '0011 document_storage_policies', 'policy "customers upload own paid application docs"',
         exists (select 1 from pol where schemaname = 'storage' and policyname = 'customers upload own paid application docs')
  union all select '0011 document_storage_policies', 'policy "Admins have full access to visa_documents" is gone',
         not exists (select 1 from pol where schemaname = 'storage' and policyname = 'Admins have full access to visa_documents')
  union all select '0013 claim_device_token (was 0012 until PR #22)', 'function claim_device_token(text, text)', exists (select 1 from fn where proname = 'claim_device_token')
  union all select '0012 customer_profiles', 'table customer_profiles', exists (select 1 from tbls where t = 'customer_profiles')
  union all select '0012 customer_profiles', 'trigger customer_profiles_touch',
         exists (select 1 from trg where tbl = 'customer_profiles' and tgname = 'customer_profiles_touch')
  union all select '0012 customer_profiles', 'all 4 "customer_profiles own ..." policies',
         (select count(*) from pol where tablename = 'customer_profiles' and policyname like 'customer_profiles own %') = 4
  union all select 'db/proposed-live-changes block 3', 'column visa_applications.tracking_token',
         exists (select 1 from cols where t = 'visa_applications' and c = 'tracking_token')
  union all select 'db/proposed-live-changes block 3', 'column visa_applications.preferred_language',
         exists (select 1 from cols where t = 'visa_applications' and c = 'preferred_language')
)

-- 01 migrations ------------------------------------------------------------------------------------------------------
select '01 migrations' as section, mig as item,
       case when bool_and(found) then 'APPLIED' when bool_or(found) then 'PARTIAL' else 'NOT APPLIED' end as result,
       count(*) filter (where found) || '/' || count(*) || ' found'
         || coalesce('; missing: ' || string_agg(obj, '; ') filter (where not found), '') as detail
from checks group by mig

-- 02 security ---------------------------------------------------------------------------------------------------------
union all
select '02 security', 'B1 visa_applications SELECT open to every signed-in user (script 003)',
       case when exists (select 1 from pol where tablename = 'visa_applications' and cmd in ('SELECT', 'ALL')
                         and (qual ilike '%auth.role()%' or qual = '' or qual = 'true')) then 'EXPOSED' else 'OK' end,
       coalesce((select string_agg(policyname || ': ' || qual, ' || ') from pol where tablename = 'visa_applications' and cmd in ('SELECT', 'ALL')), 'no SELECT policy')
union all
select '02 security', 'B1 visa_applications UPDATE without an email check (script 003 "Only admins can update")',
       case when exists (select 1 from pol where tablename = 'visa_applications' and cmd in ('UPDATE', 'ALL') and qual not ilike '%email%') then 'EXPOSED' else 'OK' end,
       coalesce((select string_agg(policyname || ': ' || qual, ' || ') from pol where tablename = 'visa_applications' and cmd in ('UPDATE', 'ALL')), 'no UPDATE policy')
union all
select '02 security', 'B1 storage policy on a visa documents bucket without an owner check (script 005)',
       case when exists (select 1 from pol where schemaname = 'storage' and (qual || with_check) ilike '%visa_documents%'
                         and (qual || with_check) not ilike '%foldername%' and (qual || with_check) not ilike '%auth.uid%'
                         and (qual || with_check) not ilike '%email%') then 'EXPOSED' else 'OK' end,
       coalesce((select string_agg(policyname, ', ') from pol where schemaname = 'storage' and (qual || with_check) ilike '%visa_documents%'), 'no policy names a visa documents bucket')
union all
select '02 security', 'B5 customer UPDATE policy live but guard trigger missing (customer could set payment_status = paid)',
       case when exists (select 1 from pol where tablename = 'visa_applications' and cmd in ('UPDATE', 'ALL'))
             and not exists (select 1 from trg where tbl = 'visa_applications' and def ilike '%visa_applications_guard_customer_update%')
            then 'EXPOSED' else 'OK' end,
       coalesce((select string_agg(tgname, ', ') from trg where tbl = 'visa_applications' and def ilike '%guard_customer_update%'), 'no guard trigger')
union all
select '02 security', 'DELETE / ALL policies on visa_applications',
       coalesce((select count(*)::text from pol where tablename = 'visa_applications' and cmd in ('DELETE', 'ALL')), '0'),
       coalesce((select string_agg(policyname || ' [' || cmd || ']', ', ') from pol where tablename = 'visa_applications' and cmd in ('DELETE', 'ALL')), '')
union all
select '02 security', 'B5/H6 INSERT policies on visa_applications',
       coalesce((select count(*)::text from pol where tablename = 'visa_applications' and cmd = 'INSERT'), '0'),
       coalesce((select string_agg(policyname || ' ' || roles || ' CHECK: ' || with_check, ' || ') from pol where tablename = 'visa_applications' and cmd = 'INSERT'), 'no INSERT policy')
union all
select '02 security', 'B5 BEFORE INSERT trigger on visa_applications (forces pending/unpaid on insert)',
       case when exists (select 1 from trg where tbl = 'visa_applications' and def ilike '%before insert%') then 'PRESENT' else 'NONE' end,
       coalesce((select string_agg(tgname, ', ') from trg where tbl = 'visa_applications' and def ilike '%before insert%'), '')
union all
select '02 security', 'table grants on visa_applications to ' || grantee, 'GRANTED', string_agg(privilege_type, ', ' order by privilege_type)
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'visa_applications' and grantee in ('anon', 'authenticated')
group by grantee
union all
select '02 security', 'website scripts/006 applied (own-rows SELECT, no "Only admins can update", no "Admins have full access")',
       case when exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Users can view own submissions' and qual not ilike '%auth.role()%')
             and not exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Only admins can update')
             and not exists (select 1 from pol where schemaname = 'storage' and policyname = 'Admins have full access to visa_documents')
            then 'YES' else 'NO' end, ''

-- 03 tables -----------------------------------------------------------------------------------------------------------
union all
select '03 tables', 'public.' || t, case when rls then 'RLS ON' else 'RLS OFF' end, case when forced then 'forced' else '' end from tbls
union all
select '03 tables', 'asked: ' || x.name,
       case when exists (select 1 from tbls where t = x.name) then 'TABLE EXISTS'
            when exists (select 1 from cols where c = x.name) then 'NOT A TABLE; column on ' || (select string_agg(distinct t, ', ') from cols where c = x.name)
            else 'MISSING' end, ''
from (values ('device_tokens'), ('wizard_events'), ('document_reviews'), ('customer_profiles')) as x(name)

-- 04 policies ---------------------------------------------------------------------------------------------------------
union all
select '04 policies', schemaname || '.' || tablename || ' / ' || policyname, cmd || ' ' || roles,
       concat('USING: ', nullif(qual, ''), ' | CHECK: ', nullif(with_check, ''))
from pol

-- 05 buckets ----------------------------------------------------------------------------------------------------------
union all
select '05 buckets', b.id, case when b.public then 'PUBLIC' else 'private' end,
       concat('size limit: ', coalesce(b.file_size_limit::text, 'none'), ' | mime: ', coalesce(array_to_string(b.allowed_mime_types, ','), 'any'),
              ' | objects: ', (select count(*) from storage.objects o where o.bucket_id = b.id))
from storage.buckets b

-- 06 columns ----------------------------------------------------------------------------------------------------------
union all
select '06 columns', lpad(ordinal_position::text, 2, '0') || ' ' || c, data_type,
       concat(case when is_nullable = 'NO' then 'not null' else 'null' end, coalesce(' default ' || column_default, ''))
from cols where t = 'visa_applications'

-- 07 triggers ---------------------------------------------------------------------------------------------------------
union all
select '07 triggers', sch || '.' || tbl || ' / ' || tgname, '', def from trg

-- 08 realtime ---------------------------------------------------------------------------------------------------------
union all
select '08 realtime', schemaname || '.' || tablename, 'IN supabase_realtime', '' from pub
union all
select '08 realtime', '(publication supabase_realtime)', case when exists (select 1 from pg_publication where pubname = 'supabase_realtime') then 'exists' else 'MISSING' end,
       (select count(*)::text || ' tables' from pub)

-- 09 functions --------------------------------------------------------------------------------------------------------
union all
select '09 functions', 'public.' || proname || '(' || args || ')', case when prosecdef then 'SECURITY DEFINER' else 'invoker' end, '' from fn

-- 10 extensions -------------------------------------------------------------------------------------------------------
union all
select '10 extensions', extname, extversion, '' from pg_extension

-- 11 data (counts only) -----------------------------------------------------------------------------------------------
union all
select '11 data', 'visa_applications status=' || coalesce(application_status, 'null') || ' payment=' || coalesce(payment_status, 'null'),
       count(*)::text,
       concat('app rows: ', count(*) filter (where additional_notes ilike '%mobile-app%'), ' | latest created: ', max(created_at)::date, ' | latest updated: ', max(updated_at)::date)
from public.visa_applications group by application_status, payment_status
union all
select '11 data', 'auth.users', count(*)::text,
       concat('email not confirmed: ', count(*) filter (where email_confirmed_at is null),
              ' | created last 7 days: ', count(*) filter (where created_at > now() - interval '7 days'),
              ' | signed in last 7 days: ', count(*) filter (where last_sign_in_at > now() - interval '7 days'),
              ' | confirmed within 1 s of sign-up (suggests autoconfirm): ', count(*) filter (where email_confirmed_at - created_at < interval '1 second'))
from auth.users
union all
select '11 data', 'auth.identities provider=' || provider, count(*)::text, '' from auth.identities group by provider
union all
select '11 data', 'storage.objects total', count(*)::text, concat('latest: ', max(created_at)::date) from storage.objects

order by 1, 2;

-- Optional follow-ups (only if the rows above exist; each is read-only, run one at a time):
--   select platform, count(*), max(updated_at) from public.device_tokens group by 1;
--   select event, count(*), max(created_at) from public.wizard_events where created_at > now() - interval '7 days' group by 1 order by 1;
--   select kind, count(*), max(created_at) from public.visa_application_events group by 1;
--   select count(*) from public.customer_profiles;
--   select name, created_at from vault.secrets where name = 'ezvisa_notify_hook';   -- name and date only, never the secret
