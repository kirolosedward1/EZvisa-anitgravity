-- Website contact form messages (POST /api/send-email), kept in the database so no enquiry is lost when email
-- delivery fails. Shown in the staff console (Messaging, Website messages). Server only: RLS on, no client policies.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  email_sent boolean not null default false,
  status text not null default 'new',
  handled_by text,
  handled_at timestamptz,
  constraint contact_messages_status_check check (status in ('new', 'handled')),
  constraint contact_messages_length check (char_length(name) <= 120 and char_length(email) <= 200 and char_length(subject) <= 200 and char_length(message) <= 5000)
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
alter table public.contact_messages enable row level security;
