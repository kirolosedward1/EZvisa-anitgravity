-- Stand-ins for what Supabase provides (auth.uid/jwt, roles, Vault, pg_net), so the real migration files run on plain Postgres.
-- Used by run-sql.sh. pg_net is replaced by net.calls, which records every HTTP call the trigger would make.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema auth; create schema extensions; create schema vault; create schema net;
create extension pgcrypto with schema extensions;
create table auth.users (id uuid primary key);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt() ->> 'role' $$;
grant usage on schema auth, extensions to anon, authenticated, service_role;
create table vault.secrets (name text primary key, secret text);
create view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;
create function vault.create_secret(s text, n text, d text) returns uuid language sql as $$ insert into vault.secrets values (n, s); select gen_random_uuid() $$;
create table net.calls (id serial, url text, headers jsonb, body jsonb);
create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) returns bigint language sql as $$ insert into net.calls (url, headers, body) values (url, headers, body) returning id $$;
-- Only the columns the push trigger reads.
create table public.visa_applications (id uuid primary key default gen_random_uuid(), email text, application_status text, document_reviews jsonb);
grant usage on schema public to anon, authenticated, service_role;
insert into auth.users values ('aaaaaaaa-0000-4000-8000-000000000001'), ('bbbbbbbb-0000-4000-8000-000000000002');
