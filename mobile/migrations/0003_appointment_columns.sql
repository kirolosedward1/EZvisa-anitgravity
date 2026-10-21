-- APPLIED 2026-10-21 (owner approved). Additive, nullable columns; no data change. Set by staff (service role).
alter table public.visa_applications
  add column if not exists appointment_at timestamptz,
  add column if not exists appointment_centre text,
  add column if not exists appointment_address text,
  add column if not exists appointment_lat double precision,
  add column if not exists appointment_lng double precision,
  add column if not exists appointment_reference text;
-- Customers cannot set their own appointment (guard trigger keeps the old values for customer updates).
create or replace function public.visa_applications_guard_appointment() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.appointment_at := old.appointment_at; new.appointment_centre := old.appointment_centre; new.appointment_address := old.appointment_address;
    new.appointment_lat := old.appointment_lat; new.appointment_lng := old.appointment_lng; new.appointment_reference := old.appointment_reference;
  end if;
  return new;
end $$;
drop trigger if exists visa_applications_guard_appointment on public.visa_applications;
create trigger visa_applications_guard_appointment before update on public.visa_applications for each row execute function public.visa_applications_guard_appointment();
