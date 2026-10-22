-- APPLIED 2026-10-21 (owner approved plan). Per-document review status set by EZvisa staff (service role).
-- Shape: {"passportCopy": {"status": "under_review"|"approved"|"rejected", "reason": "...", "at": "ISO time"}, ...}
-- Additive column with an empty default; customers cannot change it (guard trigger below).
alter table public.visa_applications add column if not exists document_reviews jsonb not null default '{}'::jsonb;
alter table public.visa_applications drop constraint if exists visa_applications_document_reviews_object;
alter table public.visa_applications add constraint visa_applications_document_reviews_object check (jsonb_typeof(document_reviews) = 'object');
create or replace function public.visa_applications_guard_appointment() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.appointment_at := old.appointment_at; new.appointment_centre := old.appointment_centre; new.appointment_address := old.appointment_address;
    new.appointment_lat := old.appointment_lat; new.appointment_lng := old.appointment_lng; new.appointment_reference := old.appointment_reference;
    new.document_reviews := old.document_reviews; -- staff only
  end if;
  return new;
end $$;
