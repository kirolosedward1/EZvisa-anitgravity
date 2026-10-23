-- EZvisa live-state check (READ-ONLY). Project: ezvisa-uae, ref dravvaykssrbktztmrlj.
-- Written 2026-10-22 to settle audit H8 (docs disagree on what is live) and to give B1 / B5 / B4-adjacent facts.
--
-- How to run: Supabase dashboard -> SQL editor -> paste this whole file -> Run.
-- It is ONE select statement (the editor only shows the last statement's result), so every row comes back in one grid.
-- Copy the grid (or "Download CSV") and paste it back into the chat.
--
-- Safety: it only reads catalogs (pg_policies, pg_trigger, information_schema, storage.buckets, ...) and aggregate
-- counts. It returns no names, emails, passport numbers or file names. Objects that may not exist are looked up through
-- to_regclass / query_to_xml inside CASE, so a missing table gives "missing" instead of an error.
--
-- Order note found while testing this file: 0009 block 2 refuses to publish visa_applications to realtime while the
-- website's scripts/003 broad SELECT policy exists, so scripts/006 must run before 0009 block 2.
--
-- Columns: section | item | detail. Sections:
--   00 meta · 01 migrations (0001-0013 + website scripts) · 02 tables/columns that should exist · 03 policies (public + storage)
--   04 buckets · 05 visa_applications columns · 06 triggers on public tables · 07 supabase_realtime · 08 RLS on/off
--   09 column privileges that matter for B5 · 10 functions in public · 11 extensions · 12 aggregate counts

with
fn as (  -- function bodies we probe (null when the function does not exist)
  select p.proname, p.prosrc, p.prosecdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
pol as (
  select schemaname, tablename, policyname, cmd, array_to_string(roles, ',') as roles,
         coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies where schemaname in ('public', 'storage')
),
col as (
  select table_name, column_name from information_schema.columns where table_schema = 'public'
),
trg as (
  select c.relname as tbl, t.tgname, pg_get_triggerdef(t.oid) as def
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
rt as (
  select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime'
)

-- 00 META --------------------------------------------------------------------------------------------------------------
select '00 meta' as section, 'checked_at' as item, now()::text as detail
union all select '00 meta', 'postgres', version()
union all select '00 meta', 'database', current_database()
union all select '00 meta', 'supabase_realtime publication exists',
  (exists (select 1 from pg_publication where pubname = 'supabase_realtime'))::text

-- 01 MIGRATIONS: is the object each file creates present? ---------------------------------------------------------------
union all select '01 migrations', '0001 passport_expiry_date column (expected: NOT applied)',
  (exists (select 1 from col where table_name = 'visa_applications' and column_name = 'passport_expiry_date'))::text
union all select '01 migrations', '0002 policy "Customers update own applications"',
  (exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications'))::text
union all select '01 migrations', '0002 function visa_applications_guard_customer_update',
  (exists (select 1 from fn where proname = 'visa_applications_guard_customer_update'))::text
union all select '01 migrations', 'guard TRIGGER calling guard_customer_update (made by proposed-live-changes block 4; without it 0002/0007 do nothing)',
  coalesce((select string_agg(tgname, ', ') from trg where tbl = 'visa_applications' and def ilike '%guard_customer_update%'), 'none')
union all select '01 migrations', '0003 appointment_* columns present (of 6)',
  (select count(*)::text from col where table_name = 'visa_applications'
     and column_name in ('appointment_at','appointment_centre','appointment_address','appointment_lat','appointment_lng','appointment_reference'))
union all select '01 migrations', '0003 trigger visa_applications_guard_appointment',
  (exists (select 1 from trg where tgname = 'visa_applications_guard_appointment'))::text
union all select '01 migrations', '0004 table wizard_events',
  (to_regclass('public.wizard_events') is not null)::text
union all select '01 migrations', '0004 policy "Clients insert wizard events"',
  (exists (select 1 from pol where tablename = 'wizard_events' and policyname = 'Clients insert wizard events'))::text
union all select '01 migrations', '0005 column visa_applications.document_reviews',
  (exists (select 1 from col where table_name = 'visa_applications' and column_name = 'document_reviews'))::text
union all select '01 migrations', '0005 guard_appointment also freezes document_reviews',
  coalesce((select (prosrc ilike '%document_reviews%')::text from fn where proname = 'visa_applications_guard_appointment'), 'function missing')
union all select '01 migrations', '0006 table device_tokens',
  (to_regclass('public.device_tokens') is not null)::text
union all select '01 migrations', '0006 extension pg_net',
  coalesce((select extversion from pg_extension where extname = 'pg_net'), 'not installed')
union all select '01 migrations', '0006 function ezvisa_notify_hook_ok',
  (exists (select 1 from fn where proname = 'ezvisa_notify_hook_ok'))::text
union all select '01 migrations', '0006 trigger visa_applications_notify',
  (exists (select 1 from trg where tgname = 'visa_applications_notify'))::text
union all select '01 migrations', '0006 vault secret ezvisa_notify_hook exists (name only)',
  case when to_regclass('vault.secrets') is null then 'vault not installed'
       when not has_table_privilege('vault.secrets', 'SELECT') then 'no read access to vault.secrets'
       else (xpath('/row/c/text()', query_to_xml('select count(*) > 0 as c from vault.secrets where name = ''ezvisa_notify_hook''', false, true, '')))[1]::text end
union all select '01 migrations', '0007 guard function allows customer discard (body mentions cancelled + discard)',
  coalesce((select (prosrc ilike '%discard%' and prosrc ilike '%cancelled%')::text from fn where proname = 'visa_applications_guard_customer_update'), 'function missing')
union all select '01 migrations', '0007 update policy WITH CHECK accepts cancelled',
  coalesce((select (with_check ilike '%cancelled%')::text from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications'), 'policy missing')
union all select '01 migrations', '0008 wizard_events.outcome + ms columns (of 2)',
  (select count(*)::text from col where table_name = 'wizard_events' and column_name in ('outcome', 'ms'))
union all select '01 migrations', '0008 wizard_events event check constraint definition',
  coalesce((select pg_get_constraintdef(oid) from pg_constraint where conname = 'wizard_events_event_check'), 'missing')
union all select '01 migrations', '0009 block 1 table visa_application_events',
  (to_regclass('public.visa_application_events') is not null)::text
union all select '01 migrations', '0009 block 1 trigger visa_applications_log_events',
  (exists (select 1 from trg where tgname = 'visa_applications_log_events'))::text
union all select '01 migrations', '0009 block 2 visa_applications in supabase_realtime',
  (exists (select 1 from rt where schemaname = 'public' and tablename = 'visa_applications'))::text
union all select '01 migrations', '0010 part B updated_at trigger (optional; any BEFORE UPDATE trigger setting updated_at)',
  coalesce((select string_agg(tgname, ', ') from trg where tbl = 'visa_applications' and (tgname ilike '%updated_at%' or tgname ilike '%timestamp%')), 'none')
union all select '01 migrations', '0011 bucket visa_documents (underscore)',
  (exists (select 1 from storage.buckets where id = 'visa_documents'))::text
union all select '01 migrations', '0011 policy "customers read own application docs"',
  (exists (select 1 from pol where schemaname = 'storage' and policyname = 'customers read own application docs'))::text
union all select '01 migrations', '0011 policy "customers upload own paid application docs"',
  (exists (select 1 from pol where schemaname = 'storage' and policyname = 'customers upload own paid application docs'))::text
union all select '01 migrations', '0012/0013 function claim_device_token (file renamed to 0013 on mobile-app)',
  (exists (select 1 from fn where proname = 'claim_device_token'))::text
union all select '01 migrations', '0012/0013 table customer_profiles (renamed to 0013 on claude/bold-feynman-ssk2ur)',
  (to_regclass('public.customer_profiles') is not null)::text
union all select '01 migrations', 'website scripts/003 broad policy "Only admins can update" still present (true = BAD, B1)',
  (exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Only admins can update'))::text
union all select '01 migrations', 'website scripts/005 policy "Admins have full access to visa_documents" still present (true = BAD, B1)',
  (exists (select 1 from pol where schemaname = 'storage' and policyname = 'Admins have full access to visa_documents'))::text
union all select '01 migrations', 'website scripts/006 applied: own-email SELECT policy (qual mentions auth.jwt + email)',
  coalesce((select (qual ilike '%auth.jwt()%' and qual ilike '%email%' and qual not ilike '%authenticated%')::text
            from pol where tablename = 'visa_applications' and policyname = 'Users can view own submissions'), 'policy missing')
union all select '01 migrations', 'proposed-live-changes block 3: tracking_token / preferred_language columns (of 2)',
  (select count(*)::text from col where table_name = 'visa_applications' and column_name in ('tracking_token', 'preferred_language'))
union all select '01 migrations', 'proposed-live-changes block 4: policy "Customers update own unpaid applications" (superseded by 0002)',
  (exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own unpaid applications'))::text
union all select '01 migrations', 'B5 guard: any BEFORE INSERT trigger on visa_applications',
  coalesce((select string_agg(tgname, ', ') from trg where tbl = 'visa_applications' and def ilike '%BEFORE INSERT%'), 'none')

-- 02 TABLES / COLUMNS THAT SHOULD EXIST --------------------------------------------------------------------------------
union all select '02 objects', 'table ' || t, case when to_regclass('public.' || t) is null then 'MISSING' else 'exists' end
from unnest(array['visa_applications','device_tokens','wizard_events','customer_profiles','visa_application_events',
                  'email_logs','blog_posts','document_reviews']) as t
union all select '02 objects', 'note', 'document_reviews is a COLUMN on visa_applications (0005), not a table: see 01 / 05'

-- 03 POLICIES (public + storage) ---------------------------------------------------------------------------------------
union all select '03 policies', schemaname || '.' || tablename || ' · ' || policyname,
  'cmd=' || cmd || ' | roles=' || roles || ' | using=' || qual || ' | with_check=' || with_check
from pol

-- 04 BUCKETS -----------------------------------------------------------------------------------------------------------
union all select '04 buckets', id,
  'public=' || public::text || ' | file_size_limit=' || coalesce(file_size_limit::text, 'null')
  || ' | allowed_mime_types=' || coalesce(array_to_string(allowed_mime_types, ','), 'null')
from storage.buckets

-- 05 visa_applications COLUMNS -----------------------------------------------------------------------------------------
union all select '05 visa_applications columns', lpad(ordinal_position::text, 2, '0') || ' ' || column_name,
  data_type || case when is_nullable = 'NO' then ' not null' else '' end || coalesce(' default ' || column_default, '')
from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications'

-- 06 TRIGGERS on public tables -----------------------------------------------------------------------------------------
union all select '06 triggers', tbl || ' · ' || tgname, def from trg

-- 07 REALTIME publication ----------------------------------------------------------------------------------------------
union all select '07 supabase_realtime', schemaname || '.' || tablename, 'published' from rt

-- 08 RLS enabled per public table --------------------------------------------------------------------------------------
union all select '08 rls', c.relname, 'rls=' || c.relrowsecurity::text || ' | forced=' || c.relforcerowsecurity::text
from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'

-- 09 PRIVILEGES that decide B5 (can a client INSERT a row already paid / ready?) and B1 ------------------------------------
union all select '09 privileges', r || ' ' || p || ' visa_applications.' || c,
  has_column_privilege(r, 'public.visa_applications', c, p)::text
from unnest(array['anon','authenticated']) r, unnest(array['INSERT','UPDATE']) p,
     unnest(array['payment_status','payment_amount','payment_id','application_status','email']) c
where exists (select 1 from col where table_name = 'visa_applications' and column_name = c)
union all select '09 privileges', r || ' SELECT visa_applications (table)',
  has_table_privilege(r, 'public.visa_applications', 'SELECT')::text
from unnest(array['anon','authenticated']) r

-- 10 FUNCTIONS in public (names only; definer = runs with owner rights) -----------------------------------------------
union all select '10 functions', proname, 'security_definer=' || prosecdef::text from fn

-- 11 EXTENSIONS --------------------------------------------------------------------------------------------------------
union all select '11 extensions', extname, extversion from pg_extension

-- 12 AGGREGATE COUNTS (no personal data) -------------------------------------------------------------------------------
union all select '12 counts', 'auth.users total', (select count(*)::text from auth.users)
union all select '12 counts', 'auth.users with email NOT confirmed (0 with many users suggests autoconfirm is ON: confirm mailer_autoconfirm by hand)',
  (select count(*)::text from auth.users where email_confirmed_at is null)
union all select '12 counts', 'auth.users by provider',
  (select coalesce(string_agg(pr || '=' || n, ', '), 'none') from
     (select coalesce(raw_app_meta_data ->> 'provider', '?') as pr, count(*)::text as n from auth.users group by 1) agg)
union all select '12 counts', 'visa_applications by application_status',
  (select coalesce(string_agg(s || '=' || n, ', '), 'none') from
     (select coalesce(application_status, 'null') as s, count(*)::text as n from public.visa_applications group by 1 order by 1) agg)
union all select '12 counts', 'visa_applications by payment_status',
  (select coalesce(string_agg(s || '=' || n, ', '), 'none') from
     (select coalesce(payment_status, 'null') as s, count(*)::text as n from public.visa_applications group by 1 order by 1) agg)
union all select '12 counts', 'paid rows with no payment_id (B5 / B3 signal: should be 0)',
  (select count(*)::text from public.visa_applications where payment_status in ('paid', 'completed') and payment_id is null)
union all select '12 counts', 'rows created in the last 7 days',
  (select count(*)::text from public.visa_applications where created_at > now() - interval '7 days')
union all select '12 counts', 'device_tokens rows',
  case when to_regclass('public.device_tokens') is null then 'table missing'
       else (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.device_tokens', false, true, '')))[1]::text end
union all select '12 counts', 'wizard_events rows (last 7 days)',
  case when to_regclass('public.wizard_events') is null then 'table missing'
       else (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.wizard_events where created_at > now() - interval ''7 days''', false, true, '')))[1]::text end
union all select '12 counts', 'storage objects per bucket',
  (select coalesce(string_agg(b || '=' || n, ', '), 'none') from
     (select bucket_id as b, count(*)::text as n from storage.objects group by 1 order by 1) agg)

order by 1, 2;

-- ============================================================================================================================
-- NOT VISIBLE FROM SQL: check these by hand and paste what you see (names/values as described; never paste a secret).
--
-- Supabase dashboard (project ezvisa-uae)
--   1. Authentication -> URL Configuration -> Site URL. (Last known 19 Oct: http://localhost:3000. Should be https://www.ezvisa.net.)
--   2. Authentication -> URL Configuration -> Redirect URLs: the full allow list. The app needs ezvisa://auth/callback
--      (and exp://**/--/auth/callback for Expo Go testing); the website needs https://www.ezvisa.net/auth/callback (or /**).
--   3. mailer_autoconfirm: open https://dravvaykssrbktztmrlj.supabase.co/auth/v1/settings?apikey=<publishable key> in a
--      browser and paste the JSON (it is public: providers + mailer_autoconfirm). Or Authentication -> Sign In / Providers ->
--      Email -> "Confirm email" must be ON. If OFF, anyone can sign up as someone else's email and read their applications.
--   4. Authentication -> Sign In / Providers: which providers are enabled (Email, Google, Apple, ...).
--   5. Edge Functions: list (expect delete-account, notify-status) with their "last deployed" dates.
--
-- Vercel (project that serves www.ezvisa.net, Production environment) -> Settings -> Environment Variables
--   6. Paste the variable NAMES only (no values). Key questions: is it NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY or the
--      NEXT_PUBLIC_ezvisaSUPABASE_* names (main's code reads only the first pair); are SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
--      ZIINA_API_KEY and ZIINA_WEBHOOK_SECRET present (audit B3).
--   7. Deployments: the commit SHA of the current Production deployment (should be main ebc4f9a or later) and its status.
--
-- Expo / EAS (expo.dev -> @kirolosedward1/ezvisa)
--   8. Project -> Environment variables -> "preview": NAMES and, for the EXPO_PUBLIC_* ones (public by design), the values of
--      EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SITE_URL, and whether EXPO_PUBLIC_WEB_URL still exists (audit B4).
--   9. Updates -> branch "preview": the latest update group ID, its date, git commit, and message. Compare with
--      mobile-app's head. (B4 was "preview serves e866e894..., built against the OLD DB rjbgteqgqaxalcfnksjc".)
--  10. GitHub -> Actions -> "eas-update" workflow: the latest run on mobile-app (green/red, commit).
