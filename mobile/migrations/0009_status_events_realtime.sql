-- 0009: real step times for the Home timeline + live updates.  APPROVED by the owner 2026-10-22. Block 2 (Realtime) APPLIED to ezvisa-uae 2026-10-30 (guard passed); block 1 (events table) not yet run.
-- Live DB: Supabase project ezvisa-uae (ref dravvaykssrbktztmrlj). Additive only: no existing column, row or policy is
-- changed or deleted. Two independent blocks; run block 1 first.
--
-- Why: visa_applications has created_at/updated_at only. There is no paid-at, review, file-ready or decision time, so
-- the timeline shows those steps as done without a time. updated_at moves on every edit and is never used as a step time.

-- 1) Status/payment history written by the database itself (server clock), from the moment this is applied.
--    No backfill: past changes have no recorded time and none is invented.
create table if not exists public.visa_application_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.visa_applications(id) on delete cascade,
  kind text not null check (kind in ('status', 'payment')),
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);
create index if not exists visa_application_events_app_idx on public.visa_application_events (application_id, created_at);
alter table public.visa_application_events enable row level security;
revoke all on public.visa_application_events from anon, authenticated;
grant select on public.visa_application_events to authenticated;
drop policy if exists "Customers read own application events" on public.visa_application_events;
create policy "Customers read own application events" on public.visa_application_events for select to authenticated
  using (exists (select 1 from public.visa_applications va where va.id = application_id and lower(va.email) = lower(auth.jwt() ->> 'email')));

create or replace function public.visa_applications_log_events() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.application_status is distinct from old.application_status then
    insert into public.visa_application_events (application_id, kind, from_value, to_value)
    values (new.id, 'status', case when tg_op = 'UPDATE' then old.application_status end, new.application_status);
  end if;
  if tg_op = 'INSERT' or new.payment_status is distinct from old.payment_status then
    insert into public.visa_application_events (application_id, kind, from_value, to_value)
    values (new.id, 'payment', case when tg_op = 'UPDATE' then old.payment_status end, new.payment_status);
  end if;
  return null;
end $$;
revoke all on function public.visa_applications_log_events() from public, anon, authenticated;
drop trigger if exists visa_applications_log_events on public.visa_applications;
create trigger visa_applications_log_events after insert or update of application_status, payment_status on public.visa_applications
  for each row execute function public.visa_applications_log_events();

-- 2) Realtime for the Home screen (lib/useApps.ts subscribes to the user's own rows, filter email=eq.<own email>).
--    Realtime checks the subscriber's SELECT policy, so this is only safe when customers can read ONLY their own rows.
--    Guard: refuse to run while any SELECT policy on visa_applications still lets every signed-in user read every row
--    (the "OR auth.role() = 'authenticated'" policy described in db/proposed-live-changes.sql block 4).
do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'visa_applications' and cmd in ('SELECT', 'ALL')
             and (qual ilike '%auth.role()%authenticated%' or qual is null or qual = 'true')) then
    raise exception 'visa_applications has a SELECT policy that exposes other customers'' rows; apply the own-rows policy first';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visa_applications') then
    alter publication supabase_realtime add table public.visa_applications;
  end if;
end $$;

-- Check after applying:
--   select * from pg_publication_tables where pubname = 'supabase_realtime';
--   select * from pg_policies where tablename in ('visa_applications', 'visa_application_events');
-- Rollback:
--   alter publication supabase_realtime drop table public.visa_applications;
--   drop trigger if exists visa_applications_log_events on public.visa_applications;
--   drop function if exists public.visa_applications_log_events();
--   drop table if exists public.visa_application_events;
-- App follow-up after approval (next chat): read visa_application_events for the row and use the first
-- payment->paid/completed, status->reviewing/ready/completed/rejected times in lib/timeline.ts.
