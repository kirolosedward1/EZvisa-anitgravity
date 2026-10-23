-- 0013: one push token = one account (same phone, two users).  APPROVED by the owner on 2026-10-22 (approved as "0012";
-- renumbered because 0012_customer_profiles.sql has the same number). NOT YET APPLIED: run it in the ezvisa-uae SQL editor.
-- Project: ezvisa-uae (dravvaykssrbktztmrlj). Depends on 0006 (device_tokens).
--
-- Problem today: device_tokens is unique on (user_id, token) and RLS lets a user touch only their own rows. If user A signs out
-- while offline (or deletes the app without signing out), A's row stays. When B signs in on that phone, B gets a second row with
-- the same token, and A's status pushes keep arriving on B's phone. Neither user can delete the other's row.
--
-- Fix: claim_device_token() runs as the table owner, removes the token from every OTHER account, then upserts the caller's row.
-- The app (lib/data.ts registerPushToken) calls it at sign-in and after a token change, and falls back to the 0006 insert
-- path while this function does not exist (PGRST202), so shipping the app before or after this migration is safe.
--
-- Risk note: a user who somehow learned another phone's Expo push token could claim it. Effect: that phone stops getting the
-- other account's pushes and gets the claimer's (generic text, no data). Tokens are never readable by other users (RLS), so
-- this needs the token from the phone itself.

create or replace function public.claim_device_token(p_token text, p_platform text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  em text := lower(auth.jwt() ->> 'email');
begin
  if uid is null or coalesce(em, '') = '' then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'invalid push token' using errcode = '22023';
  end if;
  if p_platform is not null and p_platform not in ('ios', 'android') then
    p_platform := null;
  end if;

  delete from public.device_tokens where token = p_token and user_id <> uid;

  insert into public.device_tokens (user_id, email, token, platform)
  values (uid, em, p_token, p_platform)
  on conflict (user_id, token) do update
    set email = excluded.email, platform = coalesce(excluded.platform, public.device_tokens.platform), updated_at = now();
end $$;

revoke all on function public.claim_device_token(text, text) from public, anon;
grant execute on function public.claim_device_token(text, text) to authenticated;

-- Check after applying (as a signed-in test user in the app, then in the SQL editor):
--   select user_id, email, platform, updated_at from public.device_tokens where token = '<the test phone token>';
--   -> exactly one row, owned by the account that signed in last.
