-- Per-document review results (owner approved in the dashboard redesign brief, NOT applied by the app).
-- Additive only: one new table, no changes to visa_applications. Apply once in the SQL editor after review.
--
-- The visa team writes these rows (service role): one row per application and document type, replaced when a
-- document is reviewed again. Customers can read the rows of their own applications (same email as the case,
-- like the dashboard) and never write them. The website and the app read them through the service role in
-- GET /api/upload-document and the dashboard; until this migration is applied those reads return nothing.
--
-- status: received (in, not yet looked at), checking (a specialist is on it), approved, rejected (needs a new file;
-- `note` says why). document_type uses the upload types of lib/shared/wizard-contract.ts (passportCopy, photo, ...).

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.visa_applications (id) on delete cascade,
  document_type text not null,
  status text not null,
  note text,
  reviewed_at timestamptz not null default now(),
  reviewed_by text,
  created_at timestamptz not null default now(),
  constraint document_reviews_status_check check (status in ('received', 'checking', 'approved', 'rejected')),
  constraint document_reviews_note_length check (note is null or char_length(note) <= 1000),
  constraint document_reviews_unique_type unique (application_id, document_type)
);

comment on table public.document_reviews is
  'Visa team review of each customer document. Written by the service role; customers read their own.';
comment on column public.document_reviews.note is
  'Shown to the customer when status is rejected: what to change in the new file.';
comment on column public.document_reviews.reviewed_by is
  'Staff name or id for the internal record. Not shown to customers.';

create index if not exists document_reviews_application_idx on public.document_reviews (application_id);

alter table public.document_reviews enable row level security;

drop policy if exists "Customers read reviews of their own applications" on public.document_reviews;
create policy "Customers read reviews of their own applications"
  on public.document_reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.visa_applications va
      where va.id = document_reviews.application_id
        and lower(va.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- No insert, update or delete policies: only the service role (which bypasses RLS) writes reviews.
