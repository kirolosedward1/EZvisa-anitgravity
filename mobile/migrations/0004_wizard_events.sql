-- APPLIED 2026-10-21 (owner approved). Anonymous wizard funnel events (no personal data).
-- Insert-only for clients; no select/update/delete policies, so only the service role can read.
create table if not exists public.wizard_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null check (length(session_id) between 8 and 64),
  event text not null check (event in ('wizard_open', 'wizard_page', 'wizard_submit', 'wizard_close')),
  page text check (page is null or length(page) <= 64),
  destination text check (destination is null or length(destination) <= 64),
  platform text check (platform is null or platform in ('ios', 'android', 'web')),
  app_version text check (app_version is null or length(app_version) <= 32),
  signed_in boolean
);
alter table public.wizard_events enable row level security;
revoke all on public.wizard_events from anon, authenticated;
grant insert (session_id, event, page, destination, platform, app_version, signed_in) on public.wizard_events to anon, authenticated;
drop policy if exists "Clients insert wizard events" on public.wizard_events;
create policy "Clients insert wizard events" on public.wizard_events for insert to anon, authenticated
  with check (created_at > now() - interval '1 minute');
create index if not exists wizard_events_created_at_idx on public.wizard_events (created_at);
