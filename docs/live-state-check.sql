-- EZvisa live-state check. READ-ONLY: one SELECT, no writes, no DDL, no secrets.
-- Run in the Supabase SQL editor of project ezvisa-uae (ref dravvaykssrbktztmrlj), then paste the whole result back
-- (or use "Export > Copy as CSV/Markdown"). The editor only shows the last statement's result, so this is one query that
-- returns one table: section | item | detail.
--
-- What it reports
--   01  RLS on/off for every table in public and storage
--   02  every policy on public.* and storage.*
--   03  storage buckets (settings only) and object counts per bucket (no file names)
--   04  public.visa_applications columns
--   05  grants to anon/authenticated on visa_applications (table and column level)
--   06  triggers on public.* and storage.*
--   07  tables in the supabase_realtime publication
--   08  whether device_tokens, wizard_events, document_reviews (column), customer_profiles, visa_application_events exist
--   09  which of mobile/migrations 0001-0012 (and the website's scripts/006) look applied, from the objects each creates
--   10  aggregate counts only (no emails, names or ids): applications by status, auth users, sign-in providers
--
-- Privacy: no row of customer data is returned. The Vault check reads only whether a secret NAME exists, never its value.

with
-- helpers ---------------------------------------------------------------------------------------------------------
va_cols as (
  select column_name from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications'
),
we_cols as (
  select column_name from information_schema.columns where table_schema = 'public' and table_name = 'wizard_events'
),
pol as (
  select schemaname, tablename, policyname, cmd, roles::text as roles, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies where schemaname in ('public', 'storage')
),
trg as (
  select n.nspname as schema_name, c.relname as table_name, t.tgname, p.proname, t.tgenabled, pg_get_triggerdef(t.oid) as def
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal and n.nspname in ('public', 'storage')
),
fn as (
  select p.proname, p.prosrc, p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
),
flags as (
  select
    exists (select 1 from va_cols where column_name = 'passport_expiry_date')                                        as c0001_col,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications') as c0002_pol,
    exists (select 1 from fn where proname = 'visa_applications_guard_customer_update')                               as c0002_fn,
    exists (select 1 from trg where table_name = 'visa_applications' and proname = 'visa_applications_guard_customer_update') as c0002_trg,
    (select count(*) from va_cols where column_name in ('appointment_at', 'appointment_centre', 'appointment_address',
                                                         'appointment_lat', 'appointment_lng', 'appointment_reference')) as c0003_cols,
    exists (select 1 from trg where table_name = 'visa_applications' and proname = 'visa_applications_guard_appointment') as c0003_trg,
    to_regclass('public.wizard_events') is not null                                                                   as c0004_tbl,
    exists (select 1 from pol where tablename = 'wizard_events' and policyname = 'Clients insert wizard events')       as c0004_pol,
    exists (select 1 from va_cols where column_name = 'document_reviews')                                             as c0005_col,
    exists (select 1 from pg_constraint where conname = 'visa_applications_document_reviews_object')                  as c0005_con,
    exists (select 1 from fn where proname = 'visa_applications_guard_appointment' and prosrc ilike '%document_reviews%') as c0005_fn,
    exists (select 1 from pg_extension where extname = 'pg_net')                                                       as c0006_ext,
    to_regclass('public.device_tokens') is not null                                                                   as c0006_tbl,
    exists (select 1 from fn where proname = 'ezvisa_notify_hook_ok')                                                 as c0006_fn,
    exists (select 1 from trg where table_name = 'visa_applications' and proname = 'visa_applications_notify')         as c0006_trg,
    case when to_regclass('vault.secrets') is null then null
         else (xpath('/row/n/text()', query_to_xml(
                'select count(*) as n from vault.secrets where name = ''ezvisa_notify_hook''', false, true, '')))[1]::text::int > 0
    end                                                                                                               as c0006_vault,
    exists (select 1 from fn where proname = 'visa_applications_guard_customer_update' and prosrc ilike '%discard%')    as c0007_fn,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications'
                                and with_check ilike '%cancelled%')                                                  as c0007_pol,
    exists (select 1 from we_cols where column_name = 'outcome') and exists (select 1 from we_cols where column_name = 'ms') as c0008_cols,
    exists (select 1 from pg_constraint where conname = 'wizard_events_page_format')                                  as c0008_con,
    to_regclass('public.visa_application_events') is not null                                                        as c0009_tbl,
    exists (select 1 from trg where table_name = 'visa_applications' and proname = 'visa_applications_log_events')     as c0009_trg,
    exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'
                                                  and tablename = 'visa_applications')                               as c0009_rt,
    exists (select 1 from trg where table_name = 'visa_applications' and tgname = 'update_visa_applications_timestamp') as c0010_trg,
    exists (select 1 from trg where table_name = 'visa_applications' and tgtype_before_update_sets_updated_at)         as c0010_any,
    exists (select 1 from pol where schemaname = 'storage' and policyname = 'customers read own application docs')    as c0011_read,
    exists (select 1 from pol where schemaname = 'storage' and policyname = 'customers upload own paid application docs') as c0011_up,
    exists (select 1 from storage.buckets where id = 'visa_documents')                                                as bucket_underscore,
    exists (select 1 from storage.buckets where id = 'visa-documents')                                                as bucket_hyphen,
    exists (select 1 from fn where proname = 'claim_device_token')                                                    as c0012a_fn,
    to_regclass('public.customer_profiles') is not null                                                               as c0012b_tbl,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Only admins can update')          as web003_update_all,
    exists (select 1 from pol where schemaname = 'storage' and policyname = 'Admins have full access to visa_documents') as web005_storage_all,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Users can view own submissions'
                                and qual ilike '%auth.jwt()%' and qual not ilike '%authenticated%')                   as web006_select_own,
    exists (select 1 from trg where table_name = 'visa_applications' and def ilike '%BEFORE INSERT%')                 as b5_insert_guard
  from (select 1) one
  -- tgtype_before_update_sets_updated_at: any BEFORE UPDATE trigger whose function body assigns updated_at
  cross join lateral (
    select exists (select 1 from trg t2 join fn f2 on f2.proname = t2.proname
                   where t2.table_name = 'visa_applications' and t2.def ilike '%BEFORE UPDATE%'
                     and f2.prosrc ilike '%updated_at%now()%') as tgtype_before_update_sets_updated_at
  ) x
),
r(ord, section, item, detail) as (
  -- 01 RLS per table ------------------------------------------------------------------------------------------------
  select 1, '01 rls', n.nspname || '.' || c.relname,
         'rls=' || case when c.relrowsecurity then 'ON' else 'OFF' end || ' forced=' || case when c.relforcerowsecurity then 'yes' else 'no' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'storage') and c.relkind in ('r', 'p')

  -- 02 policies ------------------------------------------------------------------------------------------------------
  union all
  select 2, '02 policy', schemaname || '.' || tablename || ' :: ' || policyname,
         'cmd=' || cmd || ' roles=' || roles || ' using=(' || qual || ') with_check=(' || with_check || ')'
  from pol

  -- 03 buckets + object counts -----------------------------------------------------------------------------------------
  union all
  select 3, '03 bucket', b.id,
         'public=' || b.public::text || ' size_limit=' || coalesce(b.file_size_limit::text, 'none')
         || ' mime=' || coalesce(array_to_string(b.allowed_mime_types, ','), 'any')
         || ' objects=' || (select count(*) from storage.objects o where o.bucket_id = b.id)::text
  from storage.buckets b

  -- 04 visa_applications columns -------------------------------------------------------------------------------------
  union all
  select 4, '04 visa_applications column', column_name,
         data_type || case when is_nullable = 'NO' then ' not null' else '' end
         || coalesce(' default ' || column_default, '')
  from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications'

  -- 05 grants on visa_applications ------------------------------------------------------------------------------------
  union all
  select 5, '05 grant', grantee || ' ' || privilege_type, 'table-level on public.visa_applications'
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'visa_applications' and grantee in ('anon', 'authenticated')
  union all
  select 5, '05 grant', grantee || ' ' || privilege_type || ' (column)', string_agg(column_name, ', ' order by column_name)
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'visa_applications' and grantee in ('anon', 'authenticated')
  group by grantee, privilege_type

  -- 06 triggers ------------------------------------------------------------------------------------------------------
  union all
  select 6, '06 trigger', schema_name || '.' || table_name || ' :: ' || tgname,
         'fn=' || proname || ' enabled=' || tgenabled::text || ' :: ' || def
  from trg

  -- 07 realtime publication ------------------------------------------------------------------------------------------
  union all
  select 7, '07 realtime', 'publication supabase_realtime exists',
         case when exists (select 1 from pg_publication where pubname = 'supabase_realtime') then 'yes' else 'NO' end
  union all
  select 7, '07 realtime', schemaname || '.' || tablename, 'in supabase_realtime'
  from pg_publication_tables where pubname = 'supabase_realtime'

  -- 08 objects the app depends on ------------------------------------------------------------------------------------
  union all select 8, '08 exists', 'table public.device_tokens',           case when c0006_tbl  then 'yes' else 'NO' end from flags
  union all select 8, '08 exists', 'table public.wizard_events',           case when c0004_tbl  then 'yes' else 'NO' end from flags
  union all select 8, '08 exists', 'column visa_applications.document_reviews', case when c0005_col then 'yes' else 'NO' end from flags
  union all select 8, '08 exists', 'table public.customer_profiles',       case when c0012b_tbl then 'yes' else 'NO' end from flags
  union all select 8, '08 exists', 'table public.visa_application_events', case when c0009_tbl  then 'yes' else 'NO' end from flags
  union all select 8, '08 exists', 'table public.document_reviews (should NOT exist; reviews are a column)',
                   case when to_regclass('public.document_reviews') is not null then 'yes' else 'no' end
  union all select 8, '08 exists', 'column visa_applications.tracking_token',
                   case when exists (select 1 from va_cols where column_name = 'tracking_token') then 'yes' else 'NO' end
  union all select 8, '08 exists', 'column visa_applications.preferred_language',
                   case when exists (select 1 from va_cols where column_name = 'preferred_language') then 'yes' else 'NO' end
  union all select 8, '08 exists', 'table public.email_logs',
                   case when to_regclass('public.email_logs') is not null then 'yes' else 'NO' end

  -- 09 migrations ----------------------------------------------------------------------------------------------------
  union all select 9, '09 migration', '0001 passport_expiry_date column',
    case when c0001_col then 'APPLIED' else 'not applied' end from flags
  union all select 9, '09 migration', '0002 customer update policy + guard trigger',
    case when c0002_pol and c0002_fn and c0002_trg then 'APPLIED'
         when c0002_fn and not c0002_trg then 'PARTIAL: guard function exists but NO trigger calls it, so customer updates are '
              || 'unguarded (0002 assumes the trigger from db/proposed-live-changes.sql) policy=' || c0002_pol
         when c0002_pol or c0002_fn or c0002_trg then 'PARTIAL policy=' || c0002_pol || ' fn=' || c0002_fn || ' trigger=' || c0002_trg
         else 'not applied' end from flags
  union all select 9, '09 migration', '0003 appointment_* columns + guard',
    case when c0003_cols = 6 and c0003_trg then 'APPLIED'
         when c0003_cols > 0 or c0003_trg then 'PARTIAL cols=' || c0003_cols || '/6 trigger=' || c0003_trg
         else 'not applied' end from flags
  union all select 9, '09 migration', '0004 wizard_events table + insert policy',
    case when c0004_tbl and c0004_pol then 'APPLIED' when c0004_tbl then 'PARTIAL (table, no policy)' else 'not applied' end from flags
  union all select 9, '09 migration', '0005 document_reviews column + check + guard',
    case when c0005_col and c0005_con and c0005_fn then 'APPLIED'
         when c0005_col or c0005_con or c0005_fn then 'PARTIAL col=' || c0005_col || ' check=' || c0005_con || ' guard=' || c0005_fn
         else 'not applied' end from flags
  union all select 9, '09 migration', '0006 pg_net + device_tokens + vault secret + notify trigger',
    case when c0006_ext and c0006_tbl and c0006_fn and c0006_trg and coalesce(c0006_vault, false) then 'APPLIED'
         when c0006_ext or c0006_tbl or c0006_fn or c0006_trg then
           'PARTIAL pg_net=' || c0006_ext || ' table=' || c0006_tbl || ' hook_fn=' || c0006_fn || ' trigger=' || c0006_trg
           || ' vault_secret_name=' || coalesce(c0006_vault::text, 'vault schema missing')
         else 'not applied' end from flags
  union all select 9, '09 migration', '0007 customer discard (guard + policy accept cancelled)',
    case when c0007_fn and c0007_pol then 'APPLIED'
         when c0007_fn or c0007_pol then 'PARTIAL guard=' || c0007_fn || ' policy=' || c0007_pol
         else 'not applied' end from flags
  union all select 9, '09 migration', '0008 wizard_events funnel (outcome, ms, page format)',
    case when c0008_cols and c0008_con then 'APPLIED'
         when c0008_cols or c0008_con then 'PARTIAL cols=' || c0008_cols || ' constraint=' || c0008_con
         else 'not applied' end from flags
  union all select 9, '09 migration', '0009 visa_application_events + log trigger + realtime',
    case when c0009_tbl and c0009_trg and c0009_rt then 'APPLIED'
         when c0009_tbl or c0009_trg or c0009_rt then 'PARTIAL table=' || c0009_tbl || ' trigger=' || c0009_trg || ' realtime=' || c0009_rt
         else 'not applied' end from flags
  union all select 9, '09 migration', '0010 (checks only) optional B: updated_at trigger',
    case when c0010_trg then 'optional B APPLIED (update_visa_applications_timestamp)'
         when c0010_any then 'some BEFORE UPDATE trigger already sets updated_at (see 06)'
         else 'no trigger sets updated_at on update (see 06)' end from flags
  union all select 9, '09 migration', '0011 storage policies (own-folder read, paid upload)',
    case when c0011_read and c0011_up then 'APPLIED'
         when c0011_read or c0011_up then 'PARTIAL read=' || c0011_read || ' upload=' || c0011_up
         else 'not applied' end
    || ' | bucket visa_documents=' || bucket_underscore || ' visa-documents=' || bucket_hyphen from flags
  union all select 9, '09 migration', '0012 claim_device_token()',
    case when c0012a_fn then 'APPLIED' else 'not applied' end from flags
  union all select 9, '09 migration', '0012 customer_profiles table',
    case when c0012b_tbl then 'APPLIED' else 'not applied' end from flags
  union all select 9, '09 website', 'scripts/003 "Only admins can update" (any signed-in user updates every row)',
    case when web003_update_all then 'PRESENT (B1 open)' else 'absent' end from flags
  union all select 9, '09 website', 'scripts/005 "Admins have full access to visa_documents" (any signed-in user, all files)',
    case when web005_storage_all then 'PRESENT (B1 open)' else 'absent' end from flags
  union all select 9, '09 website', 'scripts/006 "Users can view own submissions" scoped to own email only',
    case when web006_select_own then 'yes' else 'NO (check 02 for its using clause)' end from flags
  union all select 9, '09 audit', 'B5 BEFORE INSERT guard on visa_applications',
    case when b5_insert_guard then 'a BEFORE INSERT trigger exists (see 06)' else 'none (B5 open)' end from flags

  -- 10 aggregate counts (no personal data) ---------------------------------------------------------------------------
  union all
  select 10, '10 count', 'applications status=' || coalesce(application_status, 'null') || ' payment=' || coalesce(payment_status, 'null'),
         count(*)::text
  from public.visa_applications group by application_status, payment_status
  union all
  select 10, '10 count', 'applications created in the last 7 days', count(*)::text
  from public.visa_applications where created_at > now() - interval '7 days'
  union all
  select 10, '10 count', 'auth users total / email not confirmed',
         count(*)::text || ' / ' || count(*) filter (where email_confirmed_at is null)::text
  from auth.users
  union all
  select 10, '10 count', 'auth identities provider=' || provider, count(*)::text
  from auth.identities group by provider
  union all
  select 10, '10 count', 'device_tokens rows',
         case when to_regclass('public.device_tokens') is null then 'table missing'
              else (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.device_tokens', false, true, '')))[1]::text end
  union all
  select 10, '10 count', 'wizard_events rows (last 7 days)',
         case when to_regclass('public.wizard_events') is null then 'table missing'
              else (xpath('/row/n/text()', query_to_xml(
                     'select count(*) as n from public.wizard_events where created_at > now() - interval ''7 days''', false, true, '')))[1]::text end
)
select section, item, detail from r order by ord, section, item;
