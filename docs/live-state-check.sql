-- EZvisa live-state check. READ-ONLY: one SELECT, no writes, no DDL, no secrets in the output.
-- Project: ezvisa-uae (ref dravvaykssrbktztmrlj). Run it in Supabase > SQL Editor and paste the result.
-- Why one statement: the SQL editor shows only the last result set, so everything comes back as rows of
--   section | item | status | detail
-- If the grid truncates, use "Download CSV" (or Copy as CSV) and paste that.
-- Tables that may not exist are counted through query_to_xml() only when to_regclass() finds them, so a missing
-- table shows "absent" instead of stopping the query. Counts are aggregates only (no emails, names or ids).
--
-- Sections
--   1 migrations   mobile/migrations 0001-0013, the app's avatars bucket, website scripts/006, mobile/db/proposed-live-changes.sql
--   2 risk         derived checks for audit B1 / B5 / H6 (broad SELECT/UPDATE, broad storage, open INSERT)
--   3 tables       device_tokens, wizard_events, document_reviews, customer_profiles, and related objects
--   4 realtime     tables in the supabase_realtime publication
--   5 policies     every RLS policy on schemas public and storage
--   6 rls          RLS on/off per public table, plus table privileges granted to anon / authenticated
--   7 buckets      storage buckets
--   8 columns      public.visa_applications columns
--   9 triggers     every non-internal trigger on public, storage and auth tables
--  10 functions    functions in schema public
--  11 extensions   installed extensions
--  12 counts       aggregate row counts (auth users, applications by status, tokens, events)

with
-- ---------- helpers ----------
va as (select to_regclass('public.visa_applications') as oid),
col(ctab, ccol) as (
  select table_name::text, column_name::text from information_schema.columns where table_schema = 'public'
),
fn as (
  select p.proname::text as name, p.prosrc as src, p.prosecdef as secdef,
         pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
),
trg as (
  select c.relname::text as tbl, n.nspname::text as sch, t.tgname::text as name, p.proname::text as fn,
         pg_get_triggerdef(t.oid) as def
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal and n.nspname in ('public', 'storage', 'auth')
),
pol as (
  select schemaname::text as sch, tablename::text as tbl, policyname::text as name, cmd::text as cmd,
         array_to_string(roles, ',') as roles, coalesce(qual, '') as qual, coalesce(with_check, '') as wcheck
  from pg_policies where schemaname in ('public', 'storage')
),
vault_secret as (
  select case when to_regclass('vault.secrets') is null then null
    else ((xpath('/row/n/text()', query_to_xml(
      $q$select count(*) as n from vault.secrets where name = 'ezvisa_notify_hook'$q$, false, true, '')))[1])::text::int > 0
  end as present
),
-- ---------- 1. migration markers: (sort, migration, marker, present) ----------
markers(sort, mig, marker, present) as (values
  (1,  '0001 passport_expiry_date column (optional)', 'column visa_applications.passport_expiry_date',
       exists(select 1 from col where ctab = 'visa_applications' and ccol = 'passport_expiry_date')),

  (2,  '0002 customers update notes while reviewing', 'policy "Customers update own applications"',
       exists(select 1 from pol where tbl = 'visa_applications' and name = 'Customers update own applications')),
  (2,  '0002 customers update notes while reviewing', 'function visa_applications_guard_customer_update',
       exists(select 1 from fn where name = 'visa_applications_guard_customer_update')),
  (2,  '0002 customers update notes while reviewing', 'guard function handles reviewing (keep_notes)',
       exists(select 1 from fn where name = 'visa_applications_guard_customer_update' and src ilike '%keep_notes%')),
  (2,  '0002 customers update notes while reviewing', 'a trigger on visa_applications runs the guard function',
       exists(select 1 from trg where tbl = 'visa_applications' and fn = 'visa_applications_guard_customer_update')),

  (3,  '0003 appointment columns', 'columns appointment_at/_centre/_address/_lat/_lng/_reference (all 6)',
       (select count(*) from col where ctab = 'visa_applications' and ccol in
         ('appointment_at', 'appointment_centre', 'appointment_address', 'appointment_lat', 'appointment_lng', 'appointment_reference')) = 6),
  (3,  '0003 appointment columns', 'trigger visa_applications_guard_appointment',
       exists(select 1 from trg where tbl = 'visa_applications' and name = 'visa_applications_guard_appointment')),

  (4,  '0004 wizard_events', 'table public.wizard_events', to_regclass('public.wizard_events') is not null),
  (4,  '0004 wizard_events', 'policy "Clients insert wizard events"',
       exists(select 1 from pol where tbl = 'wizard_events' and name = 'Clients insert wizard events')),

  (5,  '0005 document_reviews', 'column visa_applications.document_reviews',
       exists(select 1 from col where ctab = 'visa_applications' and ccol = 'document_reviews')),
  (5,  '0005 document_reviews', 'constraint visa_applications_document_reviews_object',
       exists(select 1 from pg_constraint where conname = 'visa_applications_document_reviews_object')),
  (5,  '0005 document_reviews', 'guard_appointment also protects document_reviews',
       exists(select 1 from fn where name = 'visa_applications_guard_appointment' and src ilike '%document_reviews%')),

  (6,  '0006 push notifications', 'extension pg_net', exists(select 1 from pg_extension where extname = 'pg_net')),
  (6,  '0006 push notifications', 'table public.device_tokens', to_regclass('public.device_tokens') is not null),
  (6,  '0006 push notifications', 'policies "Own tokens select/insert/update/delete" (all 4)',
       (select count(*) from pol where tbl = 'device_tokens' and name like 'Own tokens %') = 4),
  (6,  '0006 push notifications', 'function ezvisa_notify_hook_ok', exists(select 1 from fn where name = 'ezvisa_notify_hook_ok')),
  (6,  '0006 push notifications', 'vault secret ezvisa_notify_hook (existence only)', coalesce((select present from vault_secret), false)),
  (6,  '0006 push notifications', 'trigger visa_applications_notify',
       exists(select 1 from trg where tbl = 'visa_applications' and name = 'visa_applications_notify')),

  (7,  '0007 customer discard', 'guard function allows discard to cancelled',
       exists(select 1 from fn where name = 'visa_applications_guard_customer_update' and src ilike '%discard%' and src ilike '%cancelled%')),
  (7,  '0007 customer discard', 'update policy WITH CHECK accepts cancelled',
       exists(select 1 from pol where tbl = 'visa_applications' and name = 'Customers update own applications' and wcheck ilike '%cancelled%')),

  (8,  '0008 wizard_events funnel', 'columns wizard_events.outcome and .ms',
       (select count(*) from col where ctab = 'wizard_events' and ccol in ('outcome', 'ms')) = 2),
  (8,  '0008 wizard_events funnel', 'constraint wizard_events_page_format',
       exists(select 1 from pg_constraint where conname = 'wizard_events_page_format')),
  (8,  '0008 wizard_events funnel', 'event check lists the funnel events (wizard_step_viewed)',
       exists(select 1 from pg_constraint where conname = 'wizard_events_event_check' and pg_get_constraintdef(oid) ilike '%wizard_step_viewed%')),

  (9,  '0009 status events + realtime', 'table public.visa_application_events', to_regclass('public.visa_application_events') is not null),
  (9,  '0009 status events + realtime', 'trigger visa_applications_log_events',
       exists(select 1 from trg where tbl = 'visa_applications' and name = 'visa_applications_log_events')),
  (9,  '0009 status events + realtime', 'visa_applications in publication supabase_realtime',
       exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visa_applications')),

  (10, '0010 draft autosave: optional part B1 only (the same trigger also comes from website scripts/003)', 'trigger update_visa_applications_timestamp (keeps updated_at current)',
       exists(select 1 from trg where tbl = 'visa_applications' and name = 'update_visa_applications_timestamp')),

  (11, '0011 document storage policies', 'bucket visa_documents', exists(select 1 from storage.buckets where id = 'visa_documents')),
  (11, '0011 document storage policies', 'policy "customers read own application docs"',
       exists(select 1 from pol where sch = 'storage' and tbl = 'objects' and name = 'customers read own application docs')),
  (11, '0011 document storage policies', 'policy "customers upload own paid application docs"',
       exists(select 1 from pol where sch = 'storage' and tbl = 'objects' and name = 'customers upload own paid application docs')),
  (11, '0011 document storage policies', 'broad policy "Admins have full access to visa_documents" is GONE',
       not exists(select 1 from pol where sch = 'storage' and tbl = 'objects' and name = 'Admins have full access to visa_documents')),

  (12, '0012 customer_profiles', 'table public.customer_profiles', to_regclass('public.customer_profiles') is not null),
  (12, '0012 customer_profiles', 'policies "customer_profiles own *" (all 4)',
       (select count(*) from pol where tbl = 'customer_profiles' and name like 'customer_profiles own %') = 4),
  (12, '0012 customer_profiles', 'trigger customer_profiles_touch',
       exists(select 1 from trg where tbl = 'customer_profiles' and name = 'customer_profiles_touch')),

  (13, '0013 claim_device_token', 'function claim_device_token(text, text)',
       exists(select 1 from fn where name = 'claim_device_token')),

  (14, 'app avatars storage (mobile v10.6; no migration in the repo)', 'bucket avatars',
       exists(select 1 from storage.buckets where id = 'avatars')),
  (14, 'app avatars storage (mobile v10.6; no migration in the repo)', 'a storage policy mentions avatars',
       exists(select 1 from pol where sch = 'storage' and (qual || wcheck) ilike '%avatars%')),

  (20, 'website scripts/006 tighten RLS', 'policy "Users can view own submissions" scoped to own email',
       exists(select 1 from pol where tbl = 'visa_applications' and name = 'Users can view own submissions' and qual ilike '%email%' and qual not ilike '%auth.role()%')),
  (20, 'website scripts/006 tighten RLS', 'broad policy "Only admins can update" is GONE',
       not exists(select 1 from pol where tbl = 'visa_applications' and name = 'Only admins can update')),
  (20, 'website scripts/006 tighten RLS', 'broad storage policy "Admins have full access to visa_documents" is GONE',
       not exists(select 1 from pol where sch = 'storage' and name = 'Admins have full access to visa_documents')),

  (21, 'db/proposed-live-changes.sql block 3', 'columns visa_applications.tracking_token and preferred_language',
       (select count(*) from col where ctab = 'visa_applications' and ccol in ('tracking_token', 'preferred_language')) = 2),
  (21, 'db/proposed-live-changes.sql block 4', 'policy "Allow public submissions" (anon insert)',
       exists(select 1 from pol where tbl = 'visa_applications' and name = 'Allow public submissions'))
),
s1 as (
  select '1 migrations'::text as section, mig as item,
         case when bool_and(present) then 'APPLIED' when bool_or(present) then 'PARTIAL' else 'NOT APPLIED' end as status,
         string_agg(case when present then '[x] ' else '[ ] ' end || marker, '; ' order by marker) as detail,
         min(sort) as sort
  from markers group by mig
),
-- ---------- 2. derived risk checks ----------
s2 as (
  select '2 risk', 'B1 SELECT policy on visa_applications open to every signed-in user',
         case when exists(select 1 from pol where tbl = 'visa_applications' and cmd in ('SELECT', 'ALL')
                          and (qual ilike '%auth.role()%' or qual = 'true')) then 'EXPOSED' else 'ok' end,
         coalesce((select string_agg(name || ' :: ' || qual, ' | ') from pol where tbl = 'visa_applications' and cmd in ('SELECT', 'ALL')), 'no SELECT policy'), 100
  union all
  select '2 risk', 'B1 UPDATE policy on visa_applications without an own-email check',
         case when exists(select 1 from pol where tbl = 'visa_applications' and cmd in ('UPDATE', 'ALL')
                          and qual not ilike '%email%') then 'EXPOSED' else 'ok' end,
         coalesce((select string_agg(name || ' :: ' || roles || ' :: ' || qual, ' | ') from pol where tbl = 'visa_applications' and cmd in ('UPDATE', 'ALL')), 'no UPDATE policy'), 101
  union all
  select '2 risk', 'B1 storage policy on visa_documents without an ownership check',
         case when exists(select 1 from pol where sch = 'storage' and (qual ilike '%visa_documents%' or wcheck ilike '%visa_documents%')
                          and (qual || wcheck) not ilike '%email%' and (qual || wcheck) not ilike '%auth.uid%') then 'EXPOSED' else 'ok' end,
         coalesce((select string_agg(name || ' :: ' || cmd || ' :: ' || roles, ' | ') from pol where sch = 'storage' and (qual ilike '%visa%' or wcheck ilike '%visa%')), 'no policy mentions visa_documents / visa-documents'), 102
  union all
  select '2 risk', 'B5/H6 INSERT policies on visa_applications (WITH CHECK)',
         case when exists(select 1 from pol where tbl = 'visa_applications' and cmd in ('INSERT', 'ALL') and (wcheck = 'true' or wcheck = ''))
              then 'OPEN INSERT' else 'checked' end,
         coalesce((select string_agg(name || ' :: ' || roles || ' :: ' || wcheck, ' | ') from pol where tbl = 'visa_applications' and cmd in ('INSERT', 'ALL')), 'no INSERT policy'), 103
  union all
  select '2 risk', 'B5 BEFORE INSERT trigger on visa_applications (forces pending / no paid inserts)',
         case when exists(select 1 from trg where tbl = 'visa_applications' and def ilike '%BEFORE INSERT%') then 'present' else 'ABSENT' end,
         coalesce((select string_agg(name || ' -> ' || fn, ' | ') from trg where tbl = 'visa_applications' and def ilike '%INSERT%'), 'none'), 104
  union all
  select '2 risk', 'B5 column-level INSERT grants to anon/authenticated on visa_applications',
         case when exists(select 1 from information_schema.column_privileges where table_schema = 'public' and table_name = 'visa_applications'
                          and grantee in ('anon', 'authenticated') and privilege_type = 'INSERT' and column_name in ('payment_status', 'application_status', 'payment_amount'))
              then 'clients may set payment/status columns' else 'payment/status columns not insertable' end,
         coalesce((select string_agg(distinct grantee || ':' || column_name, ', ') from information_schema.column_privileges
                   where table_schema = 'public' and table_name = 'visa_applications' and grantee in ('anon', 'authenticated')
                     and privilege_type = 'INSERT' and column_name in ('payment_status', 'application_status', 'payment_amount', 'payment_id')), 'none'), 105
),
-- ---------- 3. tables asked about ----------
s3 as (
  select '3 tables', t.name, case when to_regclass('public.' || t.name) is not null then 'exists' else 'absent' end,
         case when t.name = 'document_reviews'
              then 'table absent is expected: 0005 adds it as a COLUMN; column visa_applications.document_reviews '
                   || case when exists(select 1 from col where ctab = 'visa_applications' and ccol = 'document_reviews') then 'EXISTS' else 'ABSENT' end
              else coalesce((select 'RLS ' || case when c.relrowsecurity then 'on' else 'OFF' end from pg_class c where c.oid = to_regclass('public.' || t.name)), '') end,
         200 + t.ord
  from (values (1, 'device_tokens'), (2, 'wizard_events'), (3, 'document_reviews'), (4, 'customer_profiles'),
               (5, 'visa_application_events'), (6, 'visa_applications'), (7, 'email_logs'), (8, 'blog_posts')) as t(ord, name)
),
-- ---------- 4. realtime ----------
s4 as (
  select '4 realtime', coalesce(schemaname || '.' || tablename, '(none)'), 'in supabase_realtime', '', 300
  from (select 1) d left join pg_publication_tables on pubname = 'supabase_realtime'
  union all
  select '4 realtime', 'publication supabase_realtime', case when exists(select 1 from pg_publication where pubname = 'supabase_realtime') then 'exists' else 'ABSENT' end, '', 299
),
-- ---------- 5. policies ----------
s5 as (
  select '5 policies', sch || '.' || tbl || ' :: ' || name, cmd || ' to ' || roles,
         'USING (' || qual || ')' || case when wcheck <> '' then ' WITH CHECK (' || wcheck || ')' else '' end, 400
  from pol
),
-- ---------- 6. RLS flags and table grants ----------
s6 as (
  select '6 rls', c.relname::text, case when c.relrowsecurity then 'RLS on' else 'RLS OFF' end,
         coalesce((select string_agg(distinct grantee || ':' || privilege_type, ', ') from information_schema.role_table_grants g
                   where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')), 'no table grants to anon/authenticated'), 500
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p')
),
-- ---------- 7. buckets ----------
s7 as (
  select '7 buckets', id::text, case when public then 'PUBLIC' else 'private' end,
         'size_limit=' || coalesce(file_size_limit::text, 'none') || ' mime=' || coalesce(array_to_string(allowed_mime_types, ','), 'any'), 600
  from storage.buckets
),
-- ---------- 8. visa_applications columns ----------
s8 as (
  select '8 columns', column_name::text, data_type::text,
         'nullable=' || is_nullable || coalesce(' default=' || column_default, ''), 700 + ordinal_position::int
  from information_schema.columns where table_schema = 'public' and table_name = 'visa_applications'
),
-- ---------- 9. triggers ----------
s9 as (select '9 triggers', sch || '.' || tbl || ' :: ' || name, fn, def, 900 from trg),
-- ---------- 10. functions ----------
s10 as (
  select '10 functions', name || '(' || args || ')', case when secdef then 'SECURITY DEFINER' else 'invoker' end, '', 1000 from fn
  where name not like 'pg\_%'
),
-- ---------- 11. extensions ----------
s11 as (select '11 extensions', extname::text, extversion::text, '', 1100 from pg_extension),
-- ---------- 12. counts (aggregates only) ----------
cnt(item, q, ord) as (values
  ('auth.users total', 'select count(*)::text as n from auth.users', 1),
  ('auth.users never confirmed (email_confirmed_at is null)', 'select count(*)::text as n from auth.users where email_confirmed_at is null', 2),
  ('auth.users confirmed within 5 s of sign-up (hint of mailer_autoconfirm)', 'select count(*)::text as n from auth.users where email_confirmed_at - created_at < interval ''5 seconds''', 3),
  ('auth.identities by provider', 'select coalesce(string_agg(provider || ''='' || n, '', ''), ''none'') as n from (select provider, count(*) n from auth.identities group by provider) x', 4),
  ('visa_applications total', 'select count(*)::text as n from public.visa_applications', 5),
  ('visa_applications by application_status', 'select string_agg(coalesce(application_status, ''null'') || ''='' || n, '', '') as n from (select application_status, count(*) n from public.visa_applications group by 1) x', 6),
  ('visa_applications by payment_status', 'select string_agg(coalesce(payment_status, ''null'') || ''='' || n, '', '') as n from (select payment_status, count(*) n from public.visa_applications group by 1) x', 7),
  ('visa_applications created by the app (notes source mobile-app)', 'select count(*)::text as n from public.visa_applications where additional_notes::text like ''%"source":"mobile-app"%''', 8),
  ('visa_applications newest created_at', 'select coalesce(max(created_at)::text, ''none'') as n from public.visa_applications', 9),
  ('device_tokens rows', 'select count(*)::text as n from public.device_tokens', 10),
  ('wizard_events rows, last 7 days', 'select count(*)::text as n from public.wizard_events where created_at > now() - interval ''7 days''', 11),
  ('wizard_events by event, last 7 days', 'select coalesce(string_agg(event || ''='' || n, '', ''), ''none'') as n from (select event, count(*) n from public.wizard_events where created_at > now() - interval ''7 days'' group by 1) x', 12),
  ('customer_profiles rows', 'select count(*)::text as n from public.customer_profiles', 13),
  ('visa_application_events rows', 'select count(*)::text as n from public.visa_application_events', 14),
  ('storage objects per bucket', 'select coalesce(string_agg(bucket_id || ''='' || n, '', ''), ''none'') as n from (select bucket_id, count(*) n from storage.objects group by 1) x', 15)
),
s12 as (
  select '12 counts', item,
         case when to_regclass(substring(q from 'from (\w+\.\w+)')) is null then 'absent'
              else ((xpath('/row/n/text()', query_to_xml(q, false, true, '')))[1])::text end,
         '', 1200 + ord
  from cnt
)
select section, item, status, detail from (
  select section, item, status, detail, sort from s1
  union all select * from s2
  union all select * from s3
  union all select * from s4
  union all select * from s5
  union all select * from s6
  union all select * from s7
  union all select * from s8
  union all select * from s9
  union all select * from s10
  union all select * from s11
  union all select * from s12
) all_rows
order by sort, section, item;

-- ---------------------------------------------------------------------------------------------------------------------
-- NOT readable from SQL. Check these by hand and paste what you see (names and settings only, never secret values):
--
-- Supabase (project ezvisa-uae)
--   a. Authentication > URL Configuration > Site URL            (expected: https://www.ezvisa.net; last seen http://localhost:3000)
--   b. Authentication > URL Configuration > Redirect URLs       (the app needs ezvisa://auth/callback, exp://**/--/auth/callback
--                                                                and https://www.ezvisa.net/auth/callback)
--   c. Authentication > Sign In / Providers > Email > "Confirm email"   (must be ON; OFF = mailer_autoconfirm true = audit B1 risk).
--      Shortcut: open https://dravvaykssrbktztmrlj.supabase.co/auth/v1/settings?apikey=<publishable key> and paste the JSON
--      (it lists mailer_autoconfirm and every enabled provider; it contains no secrets).
--   d. Authentication > Sign In / Providers: which providers are enabled (Email, Google, Apple, ...)
--   e. Edge Functions: is delete-account deployed, is notify-status deployed, and the version / "last updated" of each
--
-- Vercel (the project that serves www.ezvisa.net, Production environment)
--   f. Settings > Environment Variables: the NAMES only, and which environments each one is set for. Especially:
--      NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY vs NEXT_PUBLIC_ezvisaSUPABASE_URL / _ANON_KEY,
--      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ZIINA_API_KEY, ZIINA_WEBHOOK_SECRET (audit B3)
--   g. Deployments: the commit SHA of the current Production deployment (expected 7be29de or later)
--
-- Expo / EAS (project @kirolosedward1/ezvisa)
--   h. Project > Environment variables > preview: the names and the value of EXPO_PUBLIC_SUPABASE_URL (should be
--      https://dravvaykssrbktztmrlj.supabase.co); whether EXPO_PUBLIC_WEB_URL still exists (it should not)
--   i. Updates > branch "preview": the latest update group ID, its message and git commit, and its date
--      (the GitHub workflow last published mobile-app aad5052 "v10.3" at 2026-10-22 23:14 UTC)
