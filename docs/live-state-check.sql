-- EZvisa live-state check: READ ONLY. One SELECT, no writes, no DDL, no functions created.
-- Run in the Supabase SQL editor of project ezvisa-uae (ref dravvaykssrbktztmrlj), then paste the whole result grid
-- (or "Export -> CSV") back into the chat.
-- Returns one table: section | item | status | detail. Aggregates only; no customer names, emails or passport data.
--
-- Sections:
--   1 policies        every RLS policy on public.* and storage.*
--   2 rls             RLS on/off for every public table
--   3 buckets         storage buckets
--   4 columns         public.visa_applications columns
--   5 triggers        triggers on public tables
--   6 realtime        tables in the supabase_realtime publication
--   7 objects         do device_tokens, wizard_events, document_reviews, customer_profiles (and friends) exist
--   8 migrations      mobile/migrations 0001-0013: APPLIED / PARTIAL / NOT APPLIED, judged by the objects each creates
--                     (on main @7be29de claim_device_token is 0013; it was 0012 until PR #22), plus website scripts/006
--                     and mobile/db/proposed-live-changes.sql
--   9 security        verdicts for audit B1, B5, H6 (policies that expose other customers' rows or files)
--  10 functions       public functions, extensions, Vault secret name used by push
--  11 data           row counts (no personal data) so we can see whether app/website rows are arriving

with
cols as (
  select column_name::text as column_name from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications'
),
pol as (
  select schemaname::text as schemaname, tablename::text as tablename, policyname::text as policyname, cmd::text as cmd, roles::text as roles, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies where schemaname in ('public', 'storage')
),
trg as (
  select c.relname::text as tbl, t.tgname::text as tgname, p.proname::text as proname, pg_get_triggerdef(t.oid) as def
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace join pg_proc p on p.oid = t.tgfoid
  where n.nspname = 'public' and not t.tgisinternal
),
fn as (
  select p.proname::text as proname, p.prosrc, p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
),
f as (  -- one row of yes/no facts used by sections 8 and 9
  select
    exists (select 1 from cols where column_name = 'passport_expiry_date')                          as c_passport_expiry,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications') as p_update_own,
    exists (select 1 from fn where proname = 'visa_applications_guard_customer_update' and prosrc ilike '%reviewing%') as fn_guard_reviewing,
    exists (select 1 from trg where tbl = 'visa_applications' and proname = 'visa_applications_guard_customer_update') as t_guard_customer,
    exists (select 1 from cols where column_name = 'appointment_at')                                as c_appointment,
    exists (select 1 from trg where tgname = 'visa_applications_guard_appointment')                 as t_guard_appt,
    to_regclass('public.wizard_events') is not null                                                 as tb_wizard_events,
    exists (select 1 from cols where column_name = 'document_reviews')                              as c_doc_reviews,
    exists (select 1 from fn where proname = 'visa_applications_guard_appointment' and prosrc ilike '%document_reviews%') as fn_appt_reviews,
    to_regclass('public.device_tokens') is not null                                                 as tb_device_tokens,
    exists (select 1 from trg where tgname = 'visa_applications_notify')                            as t_notify,
    exists (select 1 from fn where proname = 'ezvisa_notify_hook_ok')                               as fn_hook_ok,
    exists (select 1 from pg_extension where extname = 'pg_net')                                    as ext_pg_net,
    exists (select 1 from fn where proname = 'visa_applications_guard_customer_update' and prosrc ilike '%discard%') as fn_guard_discard,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own applications' and with_check ilike '%cancelled%') as p_update_cancelled,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wizard_events' and column_name = 'outcome') as c_we_outcome,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wizard_events' and column_name = 'ms') as c_we_ms,
    to_regclass('public.visa_application_events') is not null                                       as tb_app_events,
    exists (select 1 from trg where tgname = 'visa_applications_log_events')                        as t_log_events,
    exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visa_applications') as rt_visa_apps,
    exists (select 1 from trg where tbl = 'visa_applications' and tgname = 'update_visa_applications_timestamp') as t_updated_at,
    exists (select 1 from storage.buckets where id = 'visa_documents')                              as b_visa_documents,
    exists (select 1 from pol where schemaname = 'storage' and policyname = 'customers read own application docs') as p_st_read_own,
    exists (select 1 from pol where schemaname = 'storage' and policyname = 'customers upload own paid application docs') as p_st_upload_paid,
    exists (select 1 from pol where schemaname = 'storage' and policyname = 'Admins have full access to visa_documents') as p_st_admins_full,
    exists (select 1 from fn where proname = 'claim_device_token')                                  as fn_claim_token,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Users can view own submissions'
            and qual ilike '%auth.jwt()%' and qual !~* 'auth\.role\(\)\s*=\s*''authenticated''') as p_select_own_jwt,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Only admins can update') as p_only_admins_update,
    exists (select 1 from cols where column_name = 'tracking_token')                                as c_tracking_token,
    exists (select 1 from pol where tablename = 'visa_applications' and policyname = 'Customers update own unpaid applications') as p_update_unpaid,
    to_regclass('public.customer_profiles') is not null                                             as tb_profiles
),
m as (  -- migration verdicts: APPLIED when every marker is present, PARTIAL when some are, NOT APPLIED when none
  select v.*, case when v.have = v.total then 'APPLIED' when v.have = 0 then 'NOT APPLIED' else 'PARTIAL' end as verdict
  from f, lateral (values
    ('0001_optional_passport_expiry_column', f.c_passport_expiry::int, 1, 'column visa_applications.passport_expiry_date=' || f.c_passport_expiry),
    ('0002_paid_customers_update_notes', f.p_update_own::int + f.fn_guard_reviewing::int + f.t_guard_customer::int, 3,
       'policy "Customers update own applications"=' || f.p_update_own || ', guard fn handles reviewing=' || f.fn_guard_reviewing || ', guard trigger attached=' || f.t_guard_customer),
    ('0003_appointment_columns', f.c_appointment::int + f.t_guard_appt::int, 2, 'column appointment_at=' || f.c_appointment || ', trigger visa_applications_guard_appointment=' || f.t_guard_appt),
    ('0004_wizard_events', f.tb_wizard_events::int, 1, 'table public.wizard_events=' || f.tb_wizard_events),
    ('0005_document_reviews', f.c_doc_reviews::int + f.fn_appt_reviews::int, 2, 'column document_reviews=' || f.c_doc_reviews || ', guard fn freezes document_reviews=' || f.fn_appt_reviews),
    ('0006_push_notifications', f.tb_device_tokens::int + f.t_notify::int + f.fn_hook_ok::int + f.ext_pg_net::int, 4,
       'table device_tokens=' || f.tb_device_tokens || ', trigger visa_applications_notify=' || f.t_notify || ', fn ezvisa_notify_hook_ok=' || f.fn_hook_ok || ', pg_net=' || f.ext_pg_net),
    ('0007_customer_discard', f.fn_guard_discard::int + f.p_update_cancelled::int, 2, 'guard fn allows discard=' || f.fn_guard_discard || ', update policy WITH CHECK allows cancelled=' || f.p_update_cancelled),
    ('0008_wizard_events_funnel', f.c_we_outcome::int + f.c_we_ms::int, 2, 'wizard_events.outcome=' || f.c_we_outcome || ', wizard_events.ms=' || f.c_we_ms),
    ('0009_status_events_realtime (block 1)', f.tb_app_events::int + f.t_log_events::int, 2, 'table visa_application_events=' || f.tb_app_events || ', trigger visa_applications_log_events=' || f.t_log_events),
    ('0009_status_events_realtime (block 2)', f.rt_visa_apps::int, 1, 'visa_applications in supabase_realtime=' || f.rt_visa_apps),
    ('0010_draft_autosave_checks (optional part B)', f.t_updated_at::int, 1, 'trigger update_visa_applications_timestamp=' || f.t_updated_at || ' (website scripts/003 creates the same trigger; parts A are read-only checks)'),
    ('0011_document_storage_policies', f.b_visa_documents::int + f.p_st_read_own::int + f.p_st_upload_paid::int, 3,
       'bucket visa_documents=' || f.b_visa_documents || ', read-own policy=' || f.p_st_read_own || ', upload-own-paid policy=' || f.p_st_upload_paid || ', old "Admins have full access" dropped=' || (not f.p_st_admins_full)),
    ('0013_claim_device_token (was 0012 before PR #22)', f.fn_claim_token::int, 1, 'fn public.claim_device_token=' || f.fn_claim_token),
    ('0012_customer_profiles (branch bold-feynman renames it 0013)', f.tb_profiles::int, 1, 'table public.customer_profiles=' || f.tb_profiles),
    ('website scripts/006_tighten_visa_applications_rls', f.p_select_own_jwt::int + (not f.p_only_admins_update)::int + (not f.p_st_admins_full)::int, 3,
       'own-email SELECT policy=' || f.p_select_own_jwt || ', "Only admins can update" dropped=' || (not f.p_only_admins_update) || ', "Admins have full access" dropped=' || (not f.p_st_admins_full) || ' (the two "dropped" markers are also true if 003/005 never ran)'),
    ('mobile/db/proposed-live-changes.sql (blocks 2-4)', f.c_tracking_token::int + f.p_update_unpaid::int + f.p_select_own_jwt::int, 3,
       'column tracking_token=' || f.c_tracking_token || ', policy "Customers update own unpaid applications"=' || f.p_update_unpaid || ' (0002 replaces it, so false is normal after 0002), own-email SELECT=' || f.p_select_own_jwt)
  ) as v(item, have, total, detail)
),
out as (
  -- 1 policies
  select 1 as s, 'policies'::text as section, schemaname || '.' || tablename || ' / ' || policyname as item, cmd as status,
         'roles=' || roles || ' | using=' || qual || ' | check=' || with_check as detail
  from pol
  union all
  -- 2 rls
  select 2, 'rls', c.relname::text, case when c.relrowsecurity then 'RLS ON' else 'RLS OFF' end,
         case when c.relforcerowsecurity then 'forced' else '' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
  union all
  -- 3 buckets
  select 3, 'buckets', id, case when public then 'PUBLIC' else 'private' end,
         'size_limit=' || coalesce(file_size_limit::text, 'none') || ' | mime=' || coalesce(allowed_mime_types::text, 'any')
  from storage.buckets
  union all
  -- 4 columns
  select 4, 'columns', column_name::text, data_type::text, 'nullable=' || is_nullable || ' | default=' || coalesce(column_default::text, '')
  from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications'
  union all
  -- 5 triggers
  select 5, 'triggers', tbl || ' / ' || tgname, proname, def from trg
  union all
  -- 6 realtime
  select 6, 'realtime', schemaname || '.' || tablename, 'in supabase_realtime', '' from pg_publication_tables where pubname = 'supabase_realtime'
  union all
  select 6, 'realtime', 'publication supabase_realtime', case when exists (select 1 from pg_publication where pubname = 'supabase_realtime') then 'exists' else 'MISSING' end, ''
  union all
  -- 7 objects
  select 7, 'objects', o.name, case when o.present then 'EXISTS' else 'missing' end, o.note
  from (values
    ('table public.device_tokens', to_regclass('public.device_tokens') is not null, 'migration 0006'),
    ('table public.wizard_events', to_regclass('public.wizard_events') is not null, 'migration 0004'),
    ('column visa_applications.document_reviews', exists (select 1 from cols where column_name = 'document_reviews'), 'migration 0005 (a column, not a table)'),
    ('table public.document_reviews', to_regclass('public.document_reviews') is not null, 'not expected: document_reviews is a column'),
    ('table public.customer_profiles', to_regclass('public.customer_profiles') is not null, 'migration 0012_customer_profiles'),
    ('table public.visa_application_events', to_regclass('public.visa_application_events') is not null, 'migration 0009'),
    ('table public.email_logs', to_regclass('public.email_logs') is not null, 'website supabase/migrations/001'),
    ('table public.push_tokens', to_regclass('public.push_tokens') is not null, 'old name, should not exist'),
    ('column visa_applications.tracking_token', exists (select 1 from cols where column_name = 'tracking_token'), 'website /track, emails; db/proposed-live-changes.sql block 3'),
    ('column visa_applications.preferred_language', exists (select 1 from cols where column_name = 'preferred_language'), 'website email service')
  ) as o(name, present, note)
  union all
  -- 8 migrations
  select 8, 'migrations', item, verdict, have || '/' || total || ' markers | ' || detail from m
  union all
  -- 9 security verdicts
  select 9, 'security', 'B1 visa_applications readable by every signed-in user',
         case when exists (select 1 from pol where tablename = 'visa_applications' and cmd in ('SELECT', 'ALL')
                           and (qual ~* 'auth\.role\(\)\s*=\s*''authenticated''' or qual = '' or qual = 'true')) then 'EXPOSED' else 'ok' end,
         'a SELECT/ALL policy whose USING is empty, true, or allows auth.role() = ''authenticated'' (website scripts/003)'
  union all
  select 9, 'security', 'B1 visa_applications updatable by every signed-in user',
         case when exists (select 1 from pol where tablename = 'visa_applications' and cmd in ('UPDATE', 'ALL')
                           and (qual ~* 'auth\.role\(\)\s*=\s*''authenticated''' or qual = '' or qual = 'true')) then 'EXPOSED' else 'ok' end,
         'an UPDATE/ALL policy whose USING is empty, true, or allows auth.role() = ''authenticated'' ("Only admins can update")'
  union all
  select 9, 'security', 'B1 storage: authenticated users can reach every document',
         case when exists (select 1 from pol where schemaname = 'storage' and tablename = 'objects'
                           and (roles ilike '%authenticated%' or roles ilike '%public%')
                           and qual not ilike '%auth.%' and with_check not ilike '%auth.%'
                           and (qual ilike '%visa%documents%' or with_check ilike '%visa%documents%')) then 'EXPOSED' else 'ok' end,
         'a storage.objects policy for visa_documents / visa-documents that does not check auth.uid()/auth.jwt()'
  union all
  select 9, 'security', 'B5 insert guard (BEFORE INSERT trigger on visa_applications)',
         case when exists (select 1 from trg where tbl = 'visa_applications' and def ilike '%BEFORE INSERT%') then 'present' else 'MISSING' end,
         'without it a client can insert payment_status=paid'
  union all
  select 9, 'security', 'H6 anonymous inserts into visa_applications',
         case when exists (select 1 from pol where tablename = 'visa_applications' and cmd in ('INSERT', 'ALL') and (roles ilike '%anon%' or roles ilike '%public%')) then 'ALLOWED' else 'not allowed' end,
         coalesce((select string_agg(policyname || ' check=' || with_check, ' ; ') from pol where tablename = 'visa_applications' and cmd = 'INSERT'), 'no INSERT policy')
  union all
  -- 10 functions / extensions / vault
  select 10, 'functions', 'public.' || proname, case when prosecdef then 'SECURITY DEFINER' else 'invoker' end, '' from fn
  union all
  select 10, 'functions', 'extension ' || extname, extversion::text, '' from pg_extension
  union all
  select 10, 'functions', 'vault secret ezvisa_notify_hook',
         case when exists (select 1 from vault.secrets where name = 'ezvisa_notify_hook') then 'EXISTS' else 'missing' end, 'name only, value not read'
  union all
  -- 11 data (counts only)
  select 11, 'data', 'visa_applications by status', coalesce(application_status, 'null') || ' / ' || coalesce(payment_status, 'null'),
         count(*)::text || ' rows, newest ' || coalesce(max(created_at)::text, '-')
  from public.visa_applications group by application_status, payment_status
  union all
  select 11, 'data', 'visa_applications from the app', 'additional_notes mentions mobile-app',
         count(*)::text || ' rows, newest ' || coalesce(max(created_at)::text, '-')
  from public.visa_applications where additional_notes ilike '%mobile-app%'
  union all
  select 11, 'data', 'auth.users', 'total / unconfirmed email',
         count(*)::text || ' / ' || (count(*) filter (where email_confirmed_at is null))::text || ', newest ' || coalesce(max(created_at)::text, '-')
  from auth.users
  union all
  select 11, 'data', 'auth.identities by provider', provider::text, count(*)::text from auth.identities group by provider
)
select section, item, status, detail from out order by s, section, item;

-- =====================================================================================================================
-- NOT VISIBLE FROM SQL: check these by hand and paste what you see (names and on/off only, never secret values)
-- =====================================================================================================================
-- Supabase dashboard, project ezvisa-uae (dravvaykssrbktztmrlj):
--   1. Authentication > URL Configuration > Site URL. Expected: https://www.ezvisa.net (19 Oct it was http://localhost:3000).
--   2. Same page > Redirect URLs. Expected entries: https://www.ezvisa.net/** , ezvisa://auth/callback ,
--      exp://**/--/auth/callback (Expo Go; remove before store release).
--   3. mailer_autoconfirm: Authentication > Sign In / Providers > Email > "Confirm email" must be ON. Or open
--      https://dravvaykssrbktztmrlj.supabase.co/auth/v1/settings?apikey=<publishable key> and read
--      "mailer_autoconfirm" (must be false). Ownership is "row email = JWT email", so this is a data-safety setting.
--   4. Enabled providers: the same /auth/v1/settings JSON, "external": {...} (which are true). Or Sign In / Providers.
--   5. Edge Functions list: are delete-account and notify-status deployed, and which version / last deploy date.
-- Vercel, the project that serves www.ezvisa.net, Settings > Environment Variables, Production. NAMES only:
--   expected by main's code: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_URL,
--   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY), NEXT_PUBLIC_ezvisaSUPABASE_URL (read by /api/submit-application),
--   ZIINA_API_KEY, ZIINA_WEBHOOK_SECRET, ZIINA_TEST_MODE (should be absent or false in Production), HUBSPOT_ACCESS_TOKEN
--   (or HUBSPOT_API_KEY), RESEND_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME, EMAIL_REPLY_TO, EMAIL_ADMIN_ADDRESS,
--   ADMIN_API_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL, BLOB_READ_WRITE_TOKEN.
--   Also: is the latest Production deployment READY and built from main @7be29de (or later)?
--   Ziina dashboard: is the webhook URL https://www.ezvisa.net/api/webhooks/ziina registered, with a secret?
-- Expo (expo.dev > kirolosedward1/ezvisa):
--   6. Environment variables > preview: NAMES + which project the URL points at: EXPO_PUBLIC_SUPABASE_URL (must be
--      https://dravvaykssrbktztmrlj.supabase.co), EXPO_PUBLIC_SUPABASE_ANON_KEY (publishable key of that project),
--      EXPO_PUBLIC_SITE_URL (https://www.ezvisa.net), EXPO_PUBLIC_SENTRY_DSN (optional). EXPO_PUBLIC_WEB_URL should be gone.
--   7. Updates > branch preview: the latest update group ID, its message and commit. CI run 26 published
--      5a2c2adf-d73c-404d-b7f6-a567db092f02 (v10.7, commit 2137710) on 23 Oct 00:13 UTC; run 27 (v10.8, de95dcf) was running.
