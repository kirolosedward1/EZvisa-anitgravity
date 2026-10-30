-- NOT YET RUN. Needs the owner's approval, then run in the ezvisa-uae SQL editor (dravvaykssrbktztmrlj) after 0008.
-- Widens public.wizard_events (0004, 0008) for the v1 product events of the app design canvas (note "Analytics events
-- (v1)"). Still anonymous: no user id, no email, no free text. Every value is an id, an enum or a number.
-- The app needs no update afterwards: until this runs it keeps v1 events on the phone and retries daily (lib/analytics.ts).
-- Safe to re-run. All or nothing (one transaction).
--
-- Column use for v1 rows: page = the id the event is about (question id, Review field, screen id or document type);
-- outcome = the event's enum (payment state, sign-up method, upload source, rejection category, next = you | us,
-- language, numerals on/off); ms = time on the question; step = the wizard step slug.

begin;

alter table public.wizard_events drop constraint if exists wizard_events_event_check;
alter table public.wizard_events add constraint wizard_events_event_check check (event in (
  'wizard_open', 'wizard_page', 'wizard_submit', 'wizard_close',
  'wizard_step_viewed', 'wizard_step_completed', 'payment_started', 'payment_finished', 'upload_done', 'app_start',
  'wizard_question_view', 'wizard_question_answer', 'wizard_question_back', 'wizard_exit', 'review_row_tap',
  'signup_at_pay', 'payment_start', 'payment_result', 'doc_request_view', 'doc_upload', 'doc_rejected', 'status_view',
  'appointment_booked', 'live_activity_tap', 'globi_tap', 'whatsapp_handoff', 'lang_switch', 'numerals_switch'
));

alter table public.wizard_events drop constraint if exists wizard_events_outcome_check;
alter table public.wizard_events add constraint wizard_events_outcome_check check (outcome is null or outcome in (
  'paid', 'pending', 'failed', 'cancelled', 'ok', 'retry',
  'stalled', 'offline', 'apple', 'google', 'email', 'camera', 'library', 'file',
  'unreadable', 'incomplete', 'expired', 'wrong-document', 'other', 'you', 'us', 'en', 'ar', 'on', 'off'
));

alter table public.wizard_events add column if not exists step text
  check (step is null or step in ('destination', 'personal', 'payment', 'trip', 'passport', 'spouse', 'employment', 'review', 'trip-details'));

grant insert (step) on public.wizard_events to anon, authenticated;

commit;

-- Verify: select conname from pg_constraint where conrelid = 'public.wizard_events'::regclass;
-- First two weeks (canvas note): the three questions with the longest time on screen and the highest back rate:
-- select page as question, percentile_cont(0.5) within group (order by ms) as median_ms,
--        count(*) filter (where event = 'wizard_question_back')::float / nullif(count(*) filter (where event = 'wizard_question_view'), 0) as back_rate
-- from public.wizard_events where event like 'wizard_question_%' and created_at > now() - interval '14 days'
-- group by page order by median_ms desc nulls last limit 10;
