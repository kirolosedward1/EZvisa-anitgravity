-- Editable console settings (admin console, Settings board). Additive only: one key/value table, read and written by
-- the server with the service role (RLS on, no client policies), every change recorded in audit_events.
--
-- key      'templates' | 'sla' | 'auto_assign' | 'centres'
-- value    jsonb, validated by lib/staff/console-settings.ts (an invalid or missing value falls back to the default)
--
-- Destinations, document requirements and the service fee stay in the shared website/app contract
-- (lib/shared/wizard-contract.ts) so the website and the app never disagree.

create table if not exists public.console_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.staff_users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint console_settings_key_check check (key in ('templates', 'sla', 'auto_assign', 'centres')),
  constraint console_settings_size check (pg_column_size(value) <= 32768)
);

alter table public.console_settings enable row level security;
