-- APPROVED by the owner 2026-10-22 (chat 14). RUN 2026-10-30 on ezvisa-uae (dravvaykssrbktztmrlj), before 0016.
-- The app needed no update afterwards (lib/analytics.ts).
-- Widens public.wizard_events (0004) for the full funnel: step viewed/completed, payment started/finished, upload done
-- and cold-start time. Still anonymous: no user id, no email, no free text. Every value is an id, an enum or a number.
-- Safe to re-run (drop/add constraint, add column if not exists). All or nothing (one transaction).

begin;

alter table public.wizard_events drop constraint if exists wizard_events_event_check; -- 0004's inline check (auto-named)
alter table public.wizard_events add constraint wizard_events_event_check check (event in (
  'wizard_open', 'wizard_page', 'wizard_submit', 'wizard_close',
  'wizard_step_viewed', 'wizard_step_completed', 'payment_started', 'payment_finished', 'upload_done', 'app_start'
));

-- page now also holds the step name (step events) or the document type (upload_done); it is already limited to 64 chars.
-- page values are code identifiers only.
alter table public.wizard_events drop constraint if exists wizard_events_page_format;
alter table public.wizard_events add constraint wizard_events_page_format check (page is null or page ~ '^[A-Za-z][A-Za-z-]{0,47}$') not valid; -- new rows only

alter table public.wizard_events add column if not exists outcome text
  check (outcome is null or outcome in ('paid', 'pending', 'failed', 'cancelled', 'ok', 'retry'));
alter table public.wizard_events add column if not exists ms integer
  check (ms is null or ms between 0 and 120000);

grant insert (outcome, ms) on public.wizard_events to anon, authenticated;

-- The insert policy (created_at within 1 minute) and "no select for clients" stay as in 0004.

commit;

-- Verify: wizard_events_event_check lists the 10 names, and wizard_events_page_format plus the outcome and ms checks exist:
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.wizard_events'::regclass and contype = 'c';

-- Funnel query for staff (service role / SQL editor):
-- select page as step, count(distinct session_id) filter (where event = 'wizard_step_viewed') as viewed,
--        count(distinct session_id) filter (where event = 'wizard_step_completed') as completed
-- from public.wizard_events where created_at > now() - interval '30 days' and event like 'wizard_step_%'
-- group by page order by viewed desc;
