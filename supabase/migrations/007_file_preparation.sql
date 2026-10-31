-- File preparation (admin console, File preparation board). NOT applied by the app: review, then run once in the SQL
-- editor. Additive only: one new table.
--
-- One row per case and part of the prepared file: form, cover_letter, flight, hotel, itinerary, checklist.
-- body holds the editable text of generated parts; file_path a staff upload in the visa_documents bucket
-- (<case id>/prep/<part>.<ext>). The assembled file is written to <case id>/final_package.pdf, which is what the
-- customer downloads when the case is Ready.
--
-- RLS on with no policies: only the service role (server side, after the staff role check) reads or writes.

create table if not exists public.file_parts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.visa_applications (id) on delete cascade,
  part text not null,
  state text not null default 'todo',
  body text,
  file_path text,
  file_name text,
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint file_parts_part_check check (part in ('form', 'cover_letter', 'flight', 'hotel', 'itinerary', 'checklist')),
  constraint file_parts_state_check check (state in ('todo', 'draft', 'done')),
  constraint file_parts_body_length check (body is null or char_length(body) <= 40000),
  constraint file_parts_unique unique (application_id, part)
);

create index if not exists file_parts_application_idx on public.file_parts (application_id);

alter table public.file_parts enable row level security;
