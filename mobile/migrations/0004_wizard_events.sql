-- NOT APPLIED. Needs [DB] approval. Anonymous wizard funnel events (no personal data) so drop-off can be measured
-- across all users, including guests. Insert-only for clients; only staff/service role can read.
create table if not exists public.wizard_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null,          -- random per wizard session, not linked to a person
  event text not null check (event in ('wizard_open','wizard_page','wizard_submit','wizard_close')),
  page text, destination text, platform text, app_version text
);
alter table public.wizard_events enable row level security;
create policy "Clients insert wizard events" on public.wizard_events for insert to anon, authenticated with check (true);
