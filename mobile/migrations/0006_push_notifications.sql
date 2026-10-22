-- APPLIED 2026-10-21 (owner approved plan). Push notifications.
-- RISK NOTE: enables the pg_net extension (async HTTP from Postgres). The trigger never blocks or fails an update:
-- errors are swallowed and the HTTP call is queued asynchronously.
create extension if not exists pg_net with schema extensions;

-- 1) Device tokens: each signed-in user sees and manages only their own rows.
create table if not exists public.device_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text not null default lower(auth.jwt() ->> 'email'),
  token text not null check (token ~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$'),
  platform text check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);
alter table public.device_tokens enable row level security;
revoke all on public.device_tokens from anon, authenticated;
grant select, delete on public.device_tokens to authenticated;
grant insert (token, platform) , update (platform, updated_at) on public.device_tokens to authenticated;
grant usage on sequence public.device_tokens_id_seq to authenticated;
drop policy if exists "Own tokens select" on public.device_tokens;
drop policy if exists "Own tokens insert" on public.device_tokens;
drop policy if exists "Own tokens update" on public.device_tokens;
drop policy if exists "Own tokens delete" on public.device_tokens;
create policy "Own tokens select" on public.device_tokens for select to authenticated using (user_id = auth.uid());
create policy "Own tokens insert" on public.device_tokens for insert to authenticated with check (user_id = auth.uid() and email = lower(auth.jwt() ->> 'email'));
create policy "Own tokens update" on public.device_tokens for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Own tokens delete" on public.device_tokens for delete to authenticated using (user_id = auth.uid());
create index if not exists device_tokens_email_idx on public.device_tokens (email);

-- 2) Shared secret between the trigger and the notify-status edge function (kept in Vault, never in code).
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'ezvisa_notify_hook') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ezvisa_notify_hook', 'notify-status edge function hook secret');
  end if;
end $$;
create or replace function public.ezvisa_notify_hook_ok(s text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'ezvisa_notify_hook' and decrypted_secret = s);
$$;
revoke all on function public.ezvisa_notify_hook_ok(text) from public, anon, authenticated;
grant execute on function public.ezvisa_notify_hook_ok(text) to service_role;

-- 3) Trigger: status change, or a document newly rejected -> POST to the edge function (async).
create or replace function public.visa_applications_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare secret text; rejected text[];
begin
  begin
    select array_agg(k) into rejected from jsonb_each(coalesce(new.document_reviews, '{}'::jsonb)) as e(k, v)
      where v ->> 'status' = 'rejected' and (coalesce(old.document_reviews, '{}'::jsonb) -> k) is distinct from v;
    if new.application_status is distinct from old.application_status or rejected is not null then
      select decrypted_secret into secret from vault.decrypted_secrets where name = 'ezvisa_notify_hook';
      perform net.http_post(
        url := 'https://dravvaykssrbktztmrlj.supabase.co/functions/v1/notify-status',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-ezvisa-hook', secret),
        body := jsonb_build_object('application_id', new.id, 'old_status', old.application_status, 'new_status', new.application_status, 'rejected', to_jsonb(coalesce(rejected, '{}'::text[]))),
        timeout_milliseconds := 5000);
    end if;
  exception when others then null; -- never block the update
  end;
  return new;
end $$;
revoke all on function public.visa_applications_notify() from public, anon, authenticated;
drop trigger if exists visa_applications_notify on public.visa_applications;
create trigger visa_applications_notify after update on public.visa_applications for each row execute function public.visa_applications_notify();
