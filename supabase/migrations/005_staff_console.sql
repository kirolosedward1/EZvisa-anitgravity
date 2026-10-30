-- Staff console foundation (admin console build, step 1 and 2). NOT applied by the app: review, then run once in the
-- SQL editor. Additive only: four new tables, no change to existing tables or customer data.
--
-- staff_users       who may open the console at /staff, and with which role (admin, specialist, support, finance).
--                   Emails in the Vercel variable ADMIN_EMAILS are always admins, even before this table exists.
-- audit_events      every change made from the console (and by automations), with before and after values.
--                   Retained 7 years, read only: no update or delete from the app.
-- case_assignments  the owner of a case; the newest row per application wins (history kept).
-- case_notes        internal notes on a case, never shown to the customer.
--
-- Access: RLS is on and there are no policies, so the anon and authenticated roles can neither read nor write these
-- tables. The console reads and writes them on the server with the service role, after checking the staff member's
-- role (lib/staff/session.ts and lib/staff/roles.ts).

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null,
  name text not null default '',
  role text not null default 'specialist',
  languages text[] not null default '{}',
  note text not null default '',
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint staff_users_role_check check (role in ('admin', 'specialist', 'support', 'finance')),
  constraint staff_users_email_check check (position('@' in email) > 1)
);

create unique index if not exists staff_users_email_idx on public.staff_users (lower(email));

comment on table public.staff_users is
  'EZvisa staff and their console role. Matched to auth.users by user_id, or by confirmed email on first sign-in.';

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_type text not null,
  actor_id uuid,
  actor_name text not null default '',
  action text not null,
  type text not null,
  target_table text,
  target_id text,
  target_label text,
  field text,
  before jsonb,
  after jsonb,
  notified text,
  device text,
  request_id text,
  reversible boolean not null default false,
  reversal_of bigint references public.audit_events (id),
  constraint audit_events_actor_type_check check (actor_type in ('staff', 'automation', 'customer', 'gateway')),
  constraint audit_events_type_check check (type in (
    'document', 'message', 'payment', 'stage', 'upload', 'settings', 'team', 'assignment', 'edit', 'export',
    'sla', 'sign_in', 'reversal', 'note', 'appointment', 'insurance', 'customer'
  )),
  constraint audit_events_size_check check (pg_column_size(before) <= 16384 and pg_column_size(after) <= 16384)
);

create index if not exists audit_events_created_idx on public.audit_events (created_at desc);
create index if not exists audit_events_target_idx on public.audit_events (target_table, target_id, created_at desc);
create index if not exists audit_events_actor_idx on public.audit_events (actor_id, created_at desc);

comment on table public.audit_events is
  'Console audit log: who changed what, before and after, who was told. Kept 7 years; the app never updates or deletes rows.';

create table if not exists public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.visa_applications (id) on delete cascade,
  staff_id uuid references public.staff_users (id) on delete set null,
  assigned_by uuid references public.staff_users (id) on delete set null,
  rule text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint case_assignments_rule_check check (rule in ('manual', 'fewest_open', 'round_robin', 'language', 'destination', 'unassigned'))
);

create index if not exists case_assignments_application_idx on public.case_assignments (application_id, created_at desc);
create index if not exists case_assignments_staff_idx on public.case_assignments (staff_id, created_at desc);

comment on table public.case_assignments is
  'Case owner history. The newest row per application is the owner; staff_id null means unassigned.';

create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.visa_applications (id) on delete cascade,
  author_id uuid references public.staff_users (id) on delete set null,
  author_name text not null default '',
  body text not null,
  mentions uuid[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint case_notes_body_check check (char_length(body) between 1 and 4000)
);

create index if not exists case_notes_application_idx on public.case_notes (application_id, created_at desc);

comment on table public.case_notes is 'Internal team notes on a case. Never shown to the customer.';

alter table public.staff_users enable row level security;
alter table public.audit_events enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_notes enable row level security;

-- No policies on purpose: only the service role (server side, after the role check) reads or writes these tables.
