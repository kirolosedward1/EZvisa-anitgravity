-- EZvisa live-state check (ezvisa-uae, ref dravvaykssrbktztmrlj). READ-ONLY.
--
-- How to run: Supabase dashboard > SQL editor > paste this whole file > Run. It is ONE select statement (the SQL editor
-- only shows the last statement's result), so the output is one table: n | section | item | status | detail.
-- Export it ("Copy as CSV" / "Download CSV") and paste the result back into the chat.
--
-- What it does: reads the system catalogs (pg_policies, pg_trigger, pg_proc, information_schema, storage.buckets,
-- pg_publication_tables, vault.secrets names) and counts rows. It never writes, never reads secret values, and prints
-- no personal data: only counts, names and policy text. Tables that may not exist are checked with to_regclass first,
-- and their counts run through query_to_xml only when they exist, so a missing table never breaks the query.
--
-- Sections:
--   01 policies          every RLS policy on schemas public and storage
--   02 rls               RLS on/off for every table in public
--   03 grants            table privileges of anon / authenticated on public tables (B5: what a client may insert)
--   04 buckets           storage buckets
--   05 columns           public.visa_applications columns
--   06 triggers          every user trigger on public tables
--   07 functions         public functions the app or migrations rely on (and whether they are SECURITY DEFINER)
--   08 realtime          tables in the supabase_realtime publication
--   09 tables            whether device_tokens, wizard_events, document_reviews, customer_profiles (and others) exist
--   10 migrations        mobile/migrations 0001-0013 (+ website scripts/003/005/006, mobile/db/proposed-live-changes.sql)
--   11 risks             automatic red flags (B1, B5, H6)
--   12 auth              counts only: users, confirmation timing (hint for mailer_autoconfirm), providers in use
--   13 data              row counts (by status) so we know what is actually used
--   14 extensions        installed extensions (pg_net for push, etc.)
with
-- one row of yes/no facts reused by the migration and risk sections
f as (
  select
    to_regclass('public.visa_applications') is not null                                         as t_apps,
    to_regclass('public.device_tokens') is not null                                             as t_tokens,
    to_regclass('public.wizard_events') is not null                                             as t_events,
    to_regclass('public.customer_profiles') is not null                                         as t_profiles,
    to_regclass('public.document_reviews') is not null                                          as t_doc_reviews_table,
    to_regclass('public.visa_application_events') is not null                                   as t_app_events,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'passport_expiry_date') as c_passport_expiry,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'appointment_at')       as c_appointment_at,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'document_reviews')     as c_document_reviews,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'tracking_token')       as c_tracking_token,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications' and column_name = 'preferred_language')   as c_preferred_language,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wizard_events' and column_name = 'outcome')               as c_events_outcome,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wizard_events' and column_name = 'ms')                    as c_events_ms,
    exists (select 1 from pg_constraint where conname = 'wizard_events_event_check' and pg_get_constraintdef(oid) like '%app_start%')                        as k_events_funnel,
    exists (select 1 from pg_constraint where conname = 'visa_applications_document_reviews_object')                                                        as k_doc_reviews_object,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Customers update own applications') as p_customer_update,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Customers update own applications' and coalesce(with_check, '') like '%cancelled%') as p_customer_update_cancel,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Customers update own unpaid applications') as p_proposed_unpaid_update,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Only admins can update')           as p_003_admin_update,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Allow public submissions')         as p_003_public_insert,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and policyname = 'Users can view own submissions'
              and coalesce(qual, '') not like '%authenticated%')                                                                                         as p_006_select_tight,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'wizard_events' and policyname = 'Clients insert wizard events')        as p_events_insert,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'device_tokens' and policyname = 'Own tokens select')                  as p_tokens_select,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_application_events' and policyname = 'Customers read own application events') as p_app_events_select,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'customer_profiles' and policyname = 'customer_profiles own select')    as p_profiles_select,
    exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins have full access to visa_documents') as p_005_storage_all,
    exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'customers read own application docs')     as p_storage_read_own,
    exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'customers upload own paid application docs') as p_storage_upload_paid,
    exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('customers upload own application docs', 'customers replace own application docs')) as p_proposed_storage,
    exists (select 1 from pg_trigger where not tgisinternal and tgrelid = to_regclass('public.visa_applications') and tgname = 'visa_applications_guard_customer_update') as g_guard_customer,
    exists (select 1 from pg_trigger where not tgisinternal and tgrelid = to_regclass('public.visa_applications') and tgname = 'visa_applications_guard_appointment')     as g_guard_appointment,
    exists (select 1 from pg_trigger where not tgisinternal and tgrelid = to_regclass('public.visa_applications') and tgname = 'visa_applications_notify')                as g_notify,
    exists (select 1 from pg_trigger where not tgisinternal and tgrelid = to_regclass('public.visa_applications') and tgname = 'visa_applications_log_events')            as g_log_events,
    exists (select 1 from pg_trigger t where not tgisinternal and tgrelid = to_regclass('public.visa_applications') and tgtype & 2 = 2 and tgtype & 16 = 16
              and exists (select 1 from pg_proc p where p.oid = t.tgfoid and p.prosrc ~* 'new\.updated_at\s*(:=|=)\s*now\(\)'))                                     as g_updated_at,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'visa_applications_guard_customer_update' and p.prosrc like '%keep_notes%') as fn_guard_reviewing,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'visa_applications_guard_customer_update' and p.prosrc like '%cancelled%')  as fn_guard_discard,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'visa_applications_guard_appointment' and p.prosrc like '%document_reviews%') as fn_guard_doc_reviews,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ezvisa_notify_hook_ok')        as fn_hook_ok,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'claim_device_token')           as fn_claim_token,
    exists (select 1 from pg_extension where extname = 'pg_net')                                                                                              as x_pg_net,
    exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visa_applications')          as r_apps_realtime,
    exists (select 1 from storage.buckets where id = 'visa_documents')                                                                                      as b_underscore,
    exists (select 1 from storage.buckets where id = 'visa-documents')                                                                                      as b_hyphen,
    case when to_regclass('vault.secrets') is null then null
         else (xpath('/row/c/text()', query_to_xml('select count(*) as c from vault.secrets where name = ''ezvisa_notify_hook''', false, true, '')))[1]::text::int > 0 end as v_hook_secret
),
-- per-migration evidence: every part must be present for APPLIED; some = PARTIAL; none = NOT APPLIED
m(mig, parts, evidence) as (
  select '0001 passport_expiry_date column (optional)', array[c_passport_expiry], 'column visa_applications.passport_expiry_date=' || c_passport_expiry from f
  union all select '0002 reviewing customers may edit notes', array[p_customer_update, fn_guard_reviewing],
    'policy "Customers update own applications"=' || p_customer_update || ', guard fn keeps notes in review=' || fn_guard_reviewing
    || ' | 0002 does NOT create the trigger; it is attached only by mobile/db/proposed-live-changes.sql. Trigger visa_applications_guard_customer_update=' || g_guard_customer from f
  union all select '0003 appointment columns + guard', array[c_appointment_at, g_guard_appointment],
    'column appointment_at=' || c_appointment_at || ', trigger visa_applications_guard_appointment=' || g_guard_appointment from f
  union all select '0004 wizard_events', array[t_events, p_events_insert],
    'table wizard_events=' || t_events || ', policy "Clients insert wizard events"=' || p_events_insert from f
  union all select '0005 document_reviews column', array[c_document_reviews, k_doc_reviews_object, fn_guard_doc_reviews],
    'column document_reviews=' || c_document_reviews || ', check constraint=' || k_doc_reviews_object || ', guard freezes document_reviews=' || fn_guard_doc_reviews from f
  union all select '0006 push (device_tokens, pg_net, notify trigger, vault secret)', array[t_tokens, p_tokens_select, x_pg_net, fn_hook_ok, g_notify, coalesce(v_hook_secret, false)],
    'device_tokens=' || t_tokens || ', own-token policies=' || p_tokens_select || ', pg_net=' || x_pg_net || ', ezvisa_notify_hook_ok()=' || fn_hook_ok
    || ', trigger visa_applications_notify=' || g_notify || ', vault secret ezvisa_notify_hook=' || coalesce(v_hook_secret::text, 'vault not readable') from f
  union all select '0007 customer discard -> cancelled', array[fn_guard_discard, p_customer_update_cancel],
    'guard fn allows cancelled=' || fn_guard_discard || ', update policy WITH CHECK allows cancelled=' || p_customer_update_cancel from f
  union all select '0008 wizard_events funnel', array[c_events_outcome, c_events_ms, k_events_funnel],
    'column outcome=' || c_events_outcome || ', column ms=' || c_events_ms || ', event check includes app_start=' || k_events_funnel from f
  union all select '0009 block 1: status events table + trigger', array[t_app_events, p_app_events_select, g_log_events],
    'table visa_application_events=' || t_app_events || ', read-own policy=' || p_app_events_select || ', trigger visa_applications_log_events=' || g_log_events from f
  union all select '0009 block 2: visa_applications in supabase_realtime', array[r_apps_realtime], 'publication supabase_realtime has visa_applications=' || r_apps_realtime from f
  union all select '0010 part B: updated_at trigger (optional; part A is read-only)', array[g_updated_at],
    'a BEFORE UPDATE trigger sets new.updated_at := now() (0010 B or website scripts/003)=' || g_updated_at from f
  union all select '0011 visa_documents bucket + own-folder storage policies', array[b_underscore, p_storage_read_own, p_storage_upload_paid],
    'bucket visa_documents=' || b_underscore || ' (bucket visa-documents=' || b_hyphen || '), read-own policy=' || p_storage_read_own || ', upload-own-paid policy=' || p_storage_upload_paid from f
  union all select '0012 customer_profiles', array[t_profiles, p_profiles_select],
    'table customer_profiles=' || t_profiles || ', own-row policies=' || p_profiles_select from f
  union all select '0013 claim_device_token (on main also filed as 0012_claim_device_token.sql)', array[fn_claim_token],
    'function public.claim_device_token=' || fn_claim_token from f
  union all select 'website scripts/003 broad policies (should be GONE)', array[p_003_admin_update, p_003_public_insert],
    'policy "Only admins can update" (any signed-in user updates every row)=' || p_003_admin_update || ', policy "Allow public submissions"=' || p_003_public_insert from f
  union all select 'website scripts/005 storage full access (should be GONE)', array[p_005_storage_all],
    'policy "Admins have full access to visa_documents" (any signed-in user reads every passport)=' || p_005_storage_all from f
  union all select 'website scripts/006 tighten RLS', array[p_006_select_tight, not p_003_admin_update, not p_005_storage_all],
    'own-email select policy=' || p_006_select_tight || ', 003 update policy dropped=' || (not p_003_admin_update) || ', 005 storage policy dropped=' || (not p_005_storage_all) from f
  union all select 'mobile/db/proposed-live-changes.sql (19 Oct proposal)', array[c_tracking_token, c_preferred_language, p_proposed_unpaid_update, p_proposed_storage, g_guard_customer],
    'tracking_token=' || c_tracking_token || ', preferred_language=' || c_preferred_language || ', policy "Customers update own unpaid applications"=' || p_proposed_unpaid_update
    || ', its storage policies=' || p_proposed_storage || ', guard trigger visa_applications_guard_customer_update=' || g_guard_customer from f
),
rows(n, section, item, status, detail) as (
  -- 01 policies
  select 1, 'policies', schemaname || '.' || tablename || ' :: ' || policyname, cmd || ' ' || permissive,
         'roles=' || roles::text || ' | using=' || coalesce(qual, '-') || ' | check=' || coalesce(with_check, '-')
  from pg_policies where schemaname in ('public', 'storage')
  -- 02 rls
  union all
  select 2, 'rls', c.relname, case when c.relrowsecurity then 'RLS ON' else 'RLS OFF' end, 'force=' || c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p')
  -- 03 grants
  union all
  select 3, 'grants', table_name || ' -> ' || grantee, string_agg(privilege_type, ',' order by privilege_type), 'table-level privileges'
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
  group by table_name, grantee
  -- 04 buckets
  union all
  select 4, 'buckets', id, case when public then 'PUBLIC' else 'private' end,
         'name=' || name || ' | size_limit=' || coalesce(file_size_limit::text, '-') || ' | mime=' || coalesce(allowed_mime_types::text, '-')
         || ' | objects=' || (select count(*) from storage.objects o where o.bucket_id = b.id)
  from storage.buckets b
  -- 05 columns
  union all
  select 5, 'columns', lpad(ordinal_position::text, 3, '0') || ' ' || column_name, data_type,
         'nullable=' || is_nullable || ' | default=' || coalesce(column_default, '-')
  from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications'
  -- 06 triggers
  union all
  select 6, 'triggers', c.relname || ' :: ' || t.tgname, case t.tgenabled when 'D' then 'DISABLED' else 'enabled' end, pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and n.nspname = 'public'
  -- 07 functions
  union all
  select 7, 'functions', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         case when p.prosecdef then 'SECURITY DEFINER' else 'invoker' end,
         'execute by anon=' || has_function_privilege('anon', p.oid, 'execute') || ', authenticated=' || has_function_privilege('authenticated', p.oid, 'execute')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
  -- 08 realtime
  union all
  select 8, 'realtime', schemaname || '.' || tablename, 'in supabase_realtime', '' from pg_publication_tables where pubname = 'supabase_realtime'
  union all
  select 8, 'realtime', '(none)', 'publication has no tables', '' where not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime')
  -- 09 tables
  union all
  select 9, 'tables', t.name, case when to_regclass(t.name) is null then 'MISSING' else 'exists' end, t.note
  from (values
    ('public.visa_applications', 'every case (app + website)'),
    ('public.device_tokens', 'push tokens (0006)'),
    ('public.wizard_events', 'analytics (0004/0008)'),
    ('public.document_reviews', 'expected MISSING: 0005 made document_reviews a COLUMN on visa_applications (see migrations row 0005)'),
    ('public.customer_profiles', 'profile prefill (0012)'),
    ('public.visa_application_events', 'status history (0009)'),
    ('public.email_logs', 'website emails (supabase/migrations/001)'),
    ('public.blog_posts', 'website blog (scripts/001)')
  ) as t(name, note)
  -- 10 migrations
  union all
  select 10, 'migrations', mig,
         case when true = all(parts) then 'APPLIED' when true = any(parts) then 'PARTIAL' else 'NOT APPLIED' end, evidence
  from m
  -- 11 risks
  union all
  select 11, 'risks', 'B1 broad read/update on visa_applications', 'RISK', policyname || ' ' || cmd || ' using=' || coalesce(qual, '-')
  from pg_policies
  where schemaname = 'public' and tablename = 'visa_applications' and cmd in ('SELECT', 'UPDATE', 'ALL', 'DELETE')
    and (coalesce(qual, 'true') in ('true', '(true)') or qual ilike '%auth.role()%authenticated%' or roles::text like '%anon%')
  union all
  select 11, 'risks', 'B1 broad access to document files', 'RISK', policyname || ' ' || cmd || ' using=' || coalesce(qual, '-')
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and (qual ilike '%visa_documents%' or qual ilike '%visa-documents%' or with_check ilike '%visa_documents%' or with_check ilike '%visa-documents%')
    and coalesce(qual, '') not ilike '%visa_applications%' and coalesce(with_check, '') not ilike '%visa_applications%'
  union all
  select 11, 'risks', 'B5/H6 client inserts into visa_applications', 'CHECK',
         policyname || ' roles=' || roles::text || ' check=' || coalesce(with_check, '-') || ' (a client may set any column it has INSERT on, incl. payment_status, unless a BEFORE INSERT trigger resets it)'
  from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and cmd in ('INSERT', 'ALL')
  union all
  select 11, 'risks', 'B5 BEFORE INSERT guard on visa_applications', case when exists (
           select 1 from pg_trigger where not tgisinternal and tgrelid = to_regclass('public.visa_applications') and tgtype & 2 = 2 and tgtype & 4 = 4)
         then 'present' else 'NONE' end, 'a before-insert trigger is what would stop a client inserting payment_status=paid'
  union all
  select 11, 'risks', 'customer UPDATE policy without the guard trigger', 'RISK',
         'policy "Customers update own applications" exists but no trigger runs visa_applications_guard_customer_update(): a signed-in customer can change payment_status, application_status and email on their own draft/submitted/reviewing rows'
  from f where p_customer_update and not g_guard_customer
  union all
  select 11, 'risks', 'tables in public with RLS OFF', 'RISK', c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  -- 12 auth (counts only; mailer_autoconfirm itself is not visible from SQL, see the dashboard checklist)
  union all
  select 12, 'auth', 'users', count(*)::text,
         'confirmed=' || count(*) filter (where email_confirmed_at is not null)
         || ' | unconfirmed=' || count(*) filter (where email_confirmed_at is null)
         || ' | confirmed within 5s of sign-up (autoconfirm hint)=' || count(*) filter (where email_confirmed_at is not null and email_confirmed_at - created_at < interval '5 seconds')
         || ' | signed in while unconfirmed=' || count(*) filter (where email_confirmed_at is null and last_sign_in_at is not null)
         || ' | created last 7 days=' || count(*) filter (where created_at > now() - interval '7 days')
         || ' | newest=' || coalesce(max(created_at)::date::text, '-')
  from auth.users
  union all
  select 12, 'auth', 'provider ' || provider, count(*)::text, 'identities' from auth.identities group by provider
  -- 13 data
  union all
  select 13, 'data', 'visa_applications status=' || coalesce(application_status, 'null') || ' payment=' || coalesce(payment_status, 'null'),
         count(*)::text,
         'from app=' || count(*) filter (where additional_notes like '%"source":"mobile-app"%') || ' | newest=' || coalesce(max(created_at)::date::text, '-')
  from public.visa_applications group by application_status, payment_status
  union all
  select 13, 'data', t.name,
         case when to_regclass(t.name) is null then 'MISSING'
              else (xpath('/row/c/text()', query_to_xml('select count(*) as c from ' || t.name, false, true, '')))[1]::text || ' rows' end, ''
  from (values ('public.device_tokens'), ('public.wizard_events'), ('public.customer_profiles'), ('public.visa_application_events'), ('public.email_logs')) as t(name)
  -- 14 extensions
  union all
  select 14, 'extensions', extname, extversion, (select nspname from pg_namespace where oid = extnamespace) from pg_extension
)
select n, section, item, status, detail from rows order by n, section, item;

-- =====================================================================================================================
-- Not visible from SQL: check these by hand and paste the answers with the result above.
-- (Already checked from this session on 2026-10-23, no need to repeat: Vercel production env var NAMES, Vercel production
--  deployment = main 7be29de READY, latest EAS preview update group 7e64bbdb-1e36-459e-be20-07b8b5f1e9d2 from mobile-app
--  aad5052 with the bundle verified against dravvaykssrbktztmrlj by CI.)
--
-- Supabase dashboard (project ezvisa-uae):
--   A1  Authentication > URL Configuration > Site URL                        expected https://www.ezvisa.net (was http://localhost:3000 on 19 Oct)
--   A2  Authentication > URL Configuration > Redirect URLs (full list)       expected https://www.ezvisa.net/**, ezvisa://auth/callback, exp://**/--/auth/callback
--   A3  Authentication > Sign In / Providers > Email > "Confirm email"       must be ON (mailer_autoconfirm = false). Ownership is "row email = JWT email",
--                                                                            so with it OFF anyone can sign up as someone else's email and read their case.
--   A4  Authentication > Sign In / Providers: which providers are enabled    (Email, Google, Apple, ...). The app shows Google/Apple only when enabled.
--   A5  Edge Functions: are delete-account and notify-status listed, and their "last deployed" dates.
--
-- Vercel (project e-zvisa-anitgravity):
--   V1  ZIINA_TEST_MODE is "true" on production (plain-text variable). Confirm whether production should take real payments.
--       While it is true, every checkout is a Ziina TEST intent and a test card marks a case "paid".
--
-- Expo (expo.dev > ezvisa > Environment variables > preview):
--   E1  Names and values of EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY / _SITE_URL / _WEB_URL. CI overrides them for its own
--       publishes, but a manual `eas update --environment preview` would still use these. EXPO_PUBLIC_WEB_URL is unused: delete it.
--   E2  Updates > branch preview: is the newest update group 7e64bbdb-1e36-459e-be20-07b8b5f1e9d2 (or newer, from a later push)?
--   E3  GitHub repo > Settings > Secrets > Actions: EXPO_TOKEN present (it is: the workflow runs pass).
