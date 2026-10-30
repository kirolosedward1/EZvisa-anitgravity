-- Activity log of each application (owner approved in the dashboard redesign brief, NOT applied by the app).
-- Additive only: one new table, no changes to visa_applications. Apply once in the SQL editor after review.
--
-- The website writes rows through the service role from the flows that already change a case: payment status
-- (lib/ziina.ts applyIntentStatus), document uploads (POST /api/upload-document), file download, appointment and
-- insurance preference saves, and staff status changes (PATCH /api/admin/cases). The visa team adds review and
-- specialist rows the same way. Writes are best effort: until this migration is applied they fail quietly and the
-- dashboard builds the activity list from the application row instead (lib/application-events.ts).
--
-- kind: payment_received, payment_failed, document_uploaded, document_reviewed, status_changed,
-- specialist_assigned, file_downloaded, appointment_saved, insurance_preference. payload holds the few fields the
-- customer sees (document_type, status, name, at, centre, preference, amount). No passport numbers or files.

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.visa_applications (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  actor text not null default 'system',
  created_at timestamptz not null default now(),
  constraint application_events_kind_check check (kind in (
    'payment_received', 'payment_failed', 'document_uploaded', 'document_reviewed', 'status_changed',
    'specialist_assigned', 'file_downloaded', 'appointment_saved', 'insurance_preference'
  )),
  constraint application_events_actor_check check (actor in ('customer', 'team', 'system')),
  constraint application_events_payload_size check (pg_column_size(payload) <= 4096)
);

comment on table public.application_events is
  'Customer-visible activity of an application. Written by the service role; customers read their own.';
comment on column public.application_events.actor is
  'customer (their own action), team (a visa specialist) or system (payment provider, automatic steps).';

create index if not exists application_events_application_idx on public.application_events (application_id, created_at desc);

alter table public.application_events enable row level security;

drop policy if exists "Customers read events of their own applications" on public.application_events;
create policy "Customers read events of their own applications"
  on public.application_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.visa_applications va
      where va.id = application_events.application_id
        and lower(va.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- No insert, update or delete policies: only the service role (which bypasses RLS) writes events.
