-- EZvisa live-state check (READ ONLY). Project: ezvisa-uae (ref dravvaykssrbktztmrlj).
-- Run in Supabase Dashboard > SQL Editor as one statement, then copy the whole result table (or "Export > CSV") back
-- into the chat. It only reads catalog tables and counts; it changes nothing, reads no customer data and no secret values.
--
-- One result set, columns: section | item | status | detail. Sections:
--   1 policies          every RLS policy in schemas public and storage
--   2 rls               RLS on/off for every public table
--   3 buckets           storage buckets
--   4 columns           public.visa_applications columns
--   5 triggers          non-internal triggers on public tables (+ definitions)
--   6 functions         public functions (name, security definer, has 'discard' logic)
--   7 realtime          tables in the supabase_realtime publication
--   8 tables            device_tokens, wizard_events, document_reviews (column), customer_profiles, visa_application_events
--   9 grants            table/column privileges for anon and authenticated on visa_applications and device_tokens
--  10 migrations        mobile/migrations 0001-0012 + website scripts/006 + mobile/db/proposed-live-changes.sql:
--                       APPLIED / NOT APPLIED / PARTIAL, judged from the objects each file creates
--  11 extensions/vault  pg_net, vault secret NAMES only (no values)
--  12 auth counts       total users / unconfirmed users (counts only)

with
pol as (
  select 1 as s, 'policies' as section,
         schemaname || '.' || tablename || ' :: ' || policyname as item,
         cmd as status,
         'roles=' || array_to_string(roles, ',') || ' | using=' || coalesce(qual, '-') || ' | check=' || coalesce(with_check, '-') as detail
  from pg_policies where schemaname in ('public', 'storage')
),
rls as (
  select 2, 'rls', n.nspname || '.' || c.relname,
         case when c.relrowsecurity then 'RLS ON' else 'RLS OFF' end,
         case when c.relforcerowsecurity then 'forced' else '' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
bkt as (
  select 3, 'buckets', id::text,
         case when public then 'PUBLIC' else 'private' end,
         'size_limit=' || coalesce(file_size_limit::text, '-') || ' | mime=' || coalesce(array_to_string(allowed_mime_types, ','), '-')
  from storage.buckets
),
col as (
  select 4, 'columns', column_name::text, data_type::text,
         'nullable=' || is_nullable || ' | default=' || coalesce(column_default, '-')
  from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications'
),
trg as (
  select 5, 'triggers', c.relname || ' :: ' || t.tgname,
         case t.tgenabled when 'O' then 'enabled' when 'D' then 'DISABLED' else 'mode ' || t.tgenabled::text end,
         pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and n.nspname = 'public'
),
fn as (
  select 6, 'functions', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         case when p.prosecdef then 'security definer' else 'invoker' end,
         case when p.prosrc ilike '%discard%' then 'has discard logic (0007)' else '' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
rt as (
  select 7, 'realtime', schemaname || '.' || tablename, 'in supabase_realtime', ''
  from pg_publication_tables where pubname = 'supabase_realtime'
  union all
  select 7, 'realtime', 'publication supabase_realtime',
         case when exists (select 1 from pg_publication where pubname = 'supabase_realtime') then 'exists' else 'MISSING' end, ''
),
tbl as (
  select 8, 'tables', x.name,
         case when to_regclass(x.name) is not null then 'EXISTS' else 'missing' end, x.note
  from (values
    ('public.device_tokens', '0006 push tokens'),
    ('public.wizard_events', '0004 analytics'),
    ('public.customer_profiles', '0012_customer_profiles'),
    ('public.visa_application_events', '0009 status history'),
    ('public.email_logs', 'website supabase/migrations/001'),
    ('public.blog_posts', 'website blog')
  ) as x(name, note)
  union all
  select 8, 'tables', 'public.visa_applications.document_reviews (column, 0005)',
         case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'document_reviews') then 'EXISTS' else 'missing' end,
         'document_reviews is a jsonb column, not a table'
  union all
  select 8, 'tables', 'public.document_reviews (table)',
         case when to_regclass('public.document_reviews') is not null then 'EXISTS' else 'missing (expected: it is a column)' end, ''
),
grt as (
  select 9, 'grants', table_name || ' :: ' || grantee, string_agg(privilege_type, ',' order by privilege_type), 'table-level'
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name in ('visa_applications', 'device_tokens', 'wizard_events') and grantee in ('anon', 'authenticated')
  group by table_name, grantee
  union all
  select 9, 'grants', table_name || ' :: ' || grantee || ' :: ' || privilege_type, 'column-level', string_agg(column_name, ',' order by column_name)
  from information_schema.column_privileges
  where table_schema = 'public' and table_name in ('visa_applications', 'device_tokens', 'wizard_events') and grantee in ('anon', 'authenticated')
  group by table_name, grantee, privilege_type
),
-- helpers for section 10
h as (
  select
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'passport_expiry_date') as c0001,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Customers update own applications') as p0002,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'visa_applications_guard_customer_update') as f0002,
    exists (select 1 from pg_trigger where not tgisinternal and tgrelid = to_regclass('public.visa_applications') and tgfoid = (select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'visa_applications_guard_customer_update' limit 1)) as t0002,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name in ('appointment_at','appointment_centre','appointment_address','appointment_lat','appointment_lng','appointment_reference')) as c0003,
    exists (select 1 from pg_trigger where not tgisinternal and tgname = 'visa_applications_guard_appointment') as t0003,
    to_regclass('public.wizard_events') is not null as t0004,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'document_reviews') as c0005,
    exists (select 1 from pg_constraint where conname = 'visa_applications_document_reviews_object') as k0005,
    to_regclass('public.device_tokens') is not null as t0006,
    exists (select 1 from pg_trigger where not tgisinternal and tgname = 'visa_applications_notify') as g0006,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ezvisa_notify_hook_ok') as f0006,
    exists (select 1 from pg_extension where extname = 'pg_net') as e0006,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'visa_applications_guard_customer_update' and p.prosrc ilike '%discard%') as f0007,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'wizard_events' and column_name in ('outcome', 'ms')) as c0008,
    to_regclass('public.visa_application_events') is not null as t0009,
    exists (select 1 from pg_trigger where not tgisinternal and tgname = 'visa_applications_log_events') as g0009,
    exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visa_applications') as r0009,
    exists (select 1 from pg_trigger where not tgisinternal and tgname = 'update_visa_applications_timestamp') as g0010,
    exists (select 1 from storage.buckets where id = 'visa_documents') as b0011,
    exists (select 1 from storage.buckets where id = 'visa-documents') as bh0011,
    exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'customers read own application docs') as pr0011,
    exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'customers upload own paid application docs') as pu0011,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'claim_device_token') as f0012,
    to_regclass('public.customer_profiles') is not null as t0012,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Only admins can update') as p003_update,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Users can view own submissions'
            and qual ilike '%lower(email)%' and qual not ilike '%auth.role()%') as p006_select,
    exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins have full access to visa_documents') as p005_storage,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'tracking_token') as c_tracking,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'preferred_language') as c_lang,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Customers update own unpaid applications') as p_unpaid,
    exists (select 1 from pg_trigger where not tgisinternal and tgrelid = to_regclass('public.visa_applications') and (tgtype & 4) = 4 and (tgtype & 2) = 2) as before_insert_trg
),
mig as (
  select 10, 'migrations', m.name, m.status, m.detail from h, lateral (values
    ('0001 passport_expiry_date column', case when c0001 = 1 then 'APPLIED' else 'NOT APPLIED' end, 'column visa_applications.passport_expiry_date'),
    ('0002 paid customers update notes', case when p0002 and f0002 then 'APPLIED' when p0002 or f0002 then 'PARTIAL' else 'NOT APPLIED' end,
       'policy=' || p0002 || ' guard fn=' || f0002 || ' | guard trigger attached (created by proposed-live-changes.sql, needed for 0002/0007 to act)=' || t0002),
    ('0003 appointment columns', case when c0003 = 6 and t0003 then 'APPLIED' when c0003 > 0 or t0003 then 'PARTIAL' else 'NOT APPLIED' end,
       'appointment_* columns=' || c0003 || '/6 trigger=' || t0003),
    ('0004 wizard_events', case when t0004 then 'APPLIED' else 'NOT APPLIED' end, 'table public.wizard_events'),
    ('0005 document_reviews', case when c0005 and k0005 then 'APPLIED' when c0005 or k0005 then 'PARTIAL' else 'NOT APPLIED' end,
       'column=' || c0005 || ' check constraint=' || k0005),
    ('0006 push notifications', case when t0006 and g0006 and f0006 and e0006 then 'APPLIED' when t0006 or g0006 or f0006 then 'PARTIAL' else 'NOT APPLIED' end,
       'device_tokens=' || t0006 || ' notify trigger=' || g0006 || ' hook fn=' || f0006 || ' pg_net=' || e0006),
    ('0007 customer discard', case when f0007 then 'APPLIED' else 'NOT APPLIED' end, 'guard function contains discard logic'),
    ('0008 wizard_events funnel', case when c0008 = 2 then 'APPLIED' when c0008 = 1 then 'PARTIAL' else 'NOT APPLIED' end, 'wizard_events.outcome/ms=' || c0008 || '/2 (also see check constraint in section 5/1)'),
    ('0009 block 1 status events', case when t0009 and g0009 then 'APPLIED' when t0009 or g0009 then 'PARTIAL' else 'NOT APPLIED' end,
       'visa_application_events=' || t0009 || ' log trigger=' || g0009),
    ('0009 block 2 realtime', case when r0009 then 'APPLIED' else 'NOT APPLIED' end, 'visa_applications in supabase_realtime'),
    ('0010 optional part B updated_at trigger', case when g0010 then 'APPLIED' else 'NOT APPLIED' end, 'part A is read-only checks; B = trigger update_visa_applications_timestamp'),
    ('0011 document storage policies', case when pr0011 and pu0011 and b0011 then 'APPLIED' when pr0011 or pu0011 then 'PARTIAL' else 'NOT APPLIED' end,
       'bucket visa_documents=' || b0011 || ' (visa-documents=' || bh0011 || ') read policy=' || pr0011 || ' upload policy=' || pu0011),
    ('0012 claim_device_token', case when f0012 then 'APPLIED' else 'NOT APPLIED' end, 'function public.claim_device_token'),
    ('0012 customer_profiles', case when t0012 then 'APPLIED' else 'NOT APPLIED' end, 'table public.customer_profiles'),
    ('website scripts/006 tighten RLS', case when not p003_update and not p005_storage and p006_select then 'APPLIED' when not p003_update or not p005_storage then 'PARTIAL' else 'NOT APPLIED' end,
       'old 003 update policy present=' || p003_update || ' | old 005 storage full-access present=' || p005_storage || ' | own-email select policy=' || p006_select),
    ('mobile/db/proposed-live-changes.sql', case when c_tracking and c_lang and p_unpaid then 'APPLIED' when c_tracking or c_lang or p_unpaid then 'PARTIAL' else 'NOT APPLIED' end,
       'tracking_token=' || c_tracking || ' preferred_language=' || c_lang || ' unpaid-update policy=' || p_unpaid),
    ('audit B5 insert guard', case when before_insert_trg then 'SOME BEFORE INSERT TRIGGER EXISTS (check section 5)' else 'NONE' end, 'any BEFORE INSERT trigger on visa_applications')
  ) as m(name, status, detail)
),
ext as (
  select 11, 'extensions', extname::text, extversion::text, '' from pg_extension where extname in ('pg_net', 'pg_cron', 'http', 'supabase_vault')
  union all
  select 11, 'vault secret names', name::text, 'exists (value not read)', coalesce(description, '') from vault.secrets
),
au as (
  select 12, 'auth counts', 'auth.users', count(*)::text,
         'unconfirmed (email_confirmed_at is null)=' || count(*) filter (where email_confirmed_at is null)
         || ' | created last 7 days=' || count(*) filter (where created_at > now() - interval '7 days')
  from auth.users
  union all
  select 12, 'auth counts', 'auth.identities by provider', provider::text, count(*)::text from auth.identities group by provider
  union all
  select 12, 'data counts', 'visa_applications by application_status', coalesce(application_status, 'null'), count(*)::text
  from public.visa_applications group by application_status
)
select section, item, status, detail from (
  select * from pol union all select * from rls union all select * from bkt union all select * from col
  union all select * from trg union all select * from fn union all select * from rt union all select * from tbl
  union all select * from grt union all select * from mig union all select * from ext union all select * from au
) all_rows(s, section, item, status, detail)
order by s, item;

-- =====================================================================================================================
-- CHECK BY HAND (not reachable from SQL). Paste what you see; names only, never secret values.
-- =====================================================================================================================
-- Supabase > Authentication > URL Configuration
--   [ ] Site URL (expected https://www.ezvisa.net; was http://localhost:3000 on 19 Oct)
--   [ ] Redirect URLs allow list. Needed: https://www.ezvisa.net/**, ezvisa://auth/callback (and ezvisa://**),
--       exp://**/--/auth/callback for Expo Go testing.
-- Supabase > Authentication > Sign In / Providers
--   [ ] Email: "Confirm email" ON?  (= mailer_autoconfirm false). Or open
--       https://dravvaykssrbktztmrlj.supabase.co/auth/v1/settings?apikey=<publishable key> and copy "mailer_autoconfirm"
--       and the "external" block.
--   [ ] Enabled providers (email, Google, Apple, ...).
-- Supabase > Edge Functions
--   [ ] delete-account and notify-status: deployed? last deploy date / version.
-- Vercel > project serving www.ezvisa.net > Settings > Environment Variables (Production), NAMES ONLY:
--   [ ] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY  or  NEXT_PUBLIC_ezvisaSUPABASE_URL / _ANON_KEY
--   [ ] SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
--   [ ] ZIINA_API_KEY, ZIINA_WEBHOOK_SECRET
--   [ ] KV_* / REDIS_URL (rate limit), HUBSPOT_ACCESS_TOKEN, BLOB_READ_WRITE_TOKEN, email sender vars
--   [ ] Which commit/PR the current Production deployment was built from, and its status (READY?).
-- Ziina dashboard
--   [ ] Webhook URL (expected https://www.ezvisa.net/api/webhooks/ziina) and whether a signing secret is set.
-- expo.dev > project @kirolosedward1/ezvisa
--   [ ] Environment variables > preview: names + the VALUE of EXPO_PUBLIC_SUPABASE_URL (it is public), whether
--       EXPO_PUBLIC_SUPABASE_ANON_KEY is the ezvisa-uae publishable key, EXPO_PUBLIC_SITE_URL, whether EXPO_PUBLIC_WEB_URL
--       still exists, EXPO_PUBLIC_SENTRY_DSN set or not.
--   [ ] Updates > branch preview: latest update group ID, created time, message, runtime version.
--       (Known older groups: e866e894-... = OLD DB; 6879dfaf-... named in main's merge commit 1e4386f.)
-- GitHub > Actions
--   [ ] Latest run of .github/workflows/eas-update.yml (on push to mobile-app): success/failure, date.
