-- Behaviour checks for migrations/0013_claim_device_token.sql on top of 0006 (run by run-sql.sh).
\set ON_ERROR_STOP 1
\set A '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","email":"A@x.com","role":"authenticated"}'
\set B '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","email":"b@x.com","role":"authenticated"}'
create or replace function pg_temp.ok(cond boolean, name text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FAIL %', name; end if; raise notice 'PASS %', name; end $$;
grant execute on function pg_temp.ok(boolean, text) to public;

-- 1. A claims a token: one row, owned by A, email lower-cased, platform kept.
set role authenticated; select set_config('request.jwt.claims', :'A', false);
select public.claim_device_token('ExpoPushToken[phone1]', 'ios');
reset role;
select pg_temp.ok((select count(*) = 1 and bool_and(user_id = 'aaaaaaaa-0000-4000-8000-000000000001' and email = 'a@x.com' and platform = 'ios') from public.device_tokens where token = 'ExpoPushToken[phone1]'), 'A claim creates one own row');
select updated_at as t1 from public.device_tokens where token = 'ExpoPushToken[phone1]' \gset

-- 2. A claims again (re-sign-in): still one row, updated_at moves, platform null keeps ios.
select pg_sleep(0.01);
set role authenticated; select set_config('request.jwt.claims', :'A', false);
select public.claim_device_token('ExpoPushToken[phone1]', null);
reset role;
select pg_temp.ok((select count(*) = 1 and bool_and(platform = 'ios' and updated_at > :'t1'::timestamptz) from public.device_tokens where token = 'ExpoPushToken[phone1]'), 'A re-claim is idempotent, bumps updated_at, keeps platform');

-- 3. Same phone, B signs in: A's row is gone, B owns the token.
set role authenticated; select set_config('request.jwt.claims', :'B', false);
select public.claim_device_token('ExpoPushToken[phone1]', 'ios');
reset role;
select pg_temp.ok((select count(*) = 1 and bool_and(email = 'b@x.com') from public.device_tokens where token = 'ExpoPushToken[phone1]'), 'B claim takes the token off A');

-- 4. A on a second phone keeps that row (two devices, same user).
set role authenticated; select set_config('request.jwt.claims', :'A', false);
select public.claim_device_token('ExpoPushToken[phone2]', 'android');
reset role;
select pg_temp.ok((select count(*) = 2 from public.device_tokens), 'two phones, two rows');

-- 5. Bad input is refused.
set role authenticated; select set_config('request.jwt.claims', :'A', false);
do $$ begin perform public.claim_device_token('not-a-token', 'ios'); raise exception 'FAIL bad token accepted'; exception when sqlstate '22023' then raise notice 'PASS bad token refused (22023)'; end $$;
do $$ begin perform public.claim_device_token(null, 'ios'); raise exception 'FAIL null token accepted'; exception when sqlstate '22023' then raise notice 'PASS null token refused (22023)'; end $$;
do $$ begin perform public.claim_device_token(repeat('x', 5000), 'ios'); raise exception 'FAIL long junk accepted'; exception when sqlstate '22023' then raise notice 'PASS very long junk refused (22023)'; end $$;
do $$ begin perform public.claim_device_token('ExpoPushToken[ab''c]', 'ios'); raise exception 'FAIL quote accepted'; exception when sqlstate '22023' then raise notice 'PASS special characters refused (22023)'; end $$;
select public.claim_device_token('ExpoPushToken[phone3]', 'web');
reset role;
select pg_temp.ok((select platform is null from public.device_tokens where token = 'ExpoPushToken[phone3]'), 'unknown platform stored as null');

-- 6. No session -> refused; anon cannot execute at all.
set role authenticated; select set_config('request.jwt.claims', '{}', false);
do $$ begin perform public.claim_device_token('ExpoPushToken[x]', 'ios'); raise exception 'FAIL no-session accepted'; exception when sqlstate '42501' then raise notice 'PASS no session refused (42501)'; end $$;
reset role; set role anon;
do $$ begin perform public.claim_device_token('ExpoPushToken[x]', 'ios'); raise exception 'FAIL anon executed'; exception when insufficient_privilege then raise notice 'PASS anon has no execute'; end $$;
reset role;

-- 7. The app's fallback path (0006 grants + RLS, before the RPC exists): insert, duplicate -> 23505, updated_at bump, delete own only.
set role authenticated; select set_config('request.jwt.claims', :'A', false);
insert into public.device_tokens (token, platform) values ('ExpoPushToken[fb]', 'ios');
do $$ begin insert into public.device_tokens (token, platform) values ('ExpoPushToken[fb]', 'ios'); raise exception 'FAIL dup'; exception when unique_violation then raise notice 'PASS duplicate insert -> 23505'; end $$;
update public.device_tokens set updated_at = now() where token = 'ExpoPushToken[fb]';
select set_config('request.jwt.claims', :'B', false);
delete from public.device_tokens where token = 'ExpoPushToken[fb]';
reset role;
select pg_temp.ok((select count(*) = 1 from public.device_tokens where token = 'ExpoPushToken[fb]'), 'B cannot delete A''s row (RLS)');
set role authenticated; select set_config('request.jwt.claims', :'A', false);
delete from public.device_tokens where token = 'ExpoPushToken[fb]';
reset role;
select pg_temp.ok((select count(*) = 0 from public.device_tokens where token = 'ExpoPushToken[fb]'), 'A deletes own row (sign-out)');
select pg_temp.ok((select prosecdef from pg_proc where proname = 'claim_device_token'), 'function is security definer');
