-- Refund requests and decisions (admin console, Payments board and Finance desk). NOT applied by the app: review,
-- then run once in the SQL editor. Additive only: one new table.
--
-- Support and specialists request a refund from a case; Finance or an admin approves (with the amount) or declines.
-- The console does not call the payment gateway: an approved refund is issued in the payment gateway's dashboard and
-- then marked "sent" here with the gateway reference. Every step is also in audit_events.
--
-- RLS on with no policies: only the service role (server side, after the role check) reads or writes.

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.visa_applications (id) on delete cascade,
  payment_ref text,
  amount_paid numeric(10, 2) not null,
  amount numeric(10, 2) not null,
  reason text not null,
  policy text not null,
  stage_at_request text not null,
  note text,
  status text not null default 'requested',
  requested_by text not null,
  requested_at timestamptz not null default now(),
  decided_by text,
  decided_at timestamptz,
  gateway_ref text,
  constraint refund_requests_status_check check (status in ('requested', 'approved', 'declined', 'sent')),
  constraint refund_requests_amount_check check (amount >= 0 and amount <= amount_paid),
  constraint refund_requests_note_length check (note is null or char_length(note) <= 1000)
);

create index if not exists refund_requests_status_idx on public.refund_requests (status, requested_at desc);
create index if not exists refund_requests_application_idx on public.refund_requests (application_id);

alter table public.refund_requests enable row level security;
