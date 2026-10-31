-- Travel insurance quotes (admin console, Insurance board). NOT applied by the app: review, then run once in the SQL
-- editor. Additive only: one new table.
--
-- A customer who chose "Buy insurance through EZvisa" on their dashboard (additional_notes.insurancePreference =
-- "quote") gets a quote typed by staff from the insurer's rates; no insurer is connected. Status: sent, accepted,
-- declined, issued. The policy PDF is stored at <case id>/insurance_policy.pdf in the visa_documents bucket.
-- Quotes are separate from the visa service fee.
--
-- RLS on with no policies: only the service role (server side, after the role check) reads or writes.

create table if not exists public.insurance_quotes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.visa_applications (id) on delete cascade,
  insurer text,
  cover text,
  price numeric(10, 2) not null,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  reminded_at timestamptz,
  decided_at timestamptz,
  policy_path text,
  updated_by text not null,
  constraint insurance_quotes_status_check check (status in ('sent', 'accepted', 'declined', 'issued')),
  constraint insurance_quotes_price_check check (price > 0 and price < 100000)
);

alter table public.insurance_quotes enable row level security;
