-- APPLIED 2026-10-21 (owner approved). Real status values (live data + website lib/types/visa-application.ts):
-- draft, submitted, reviewing, approved, ready, rejected, cancelled, completed.
-- Customers may now also update their own application while it is 'reviewing', but ONLY additional_notes and the
-- has_* document flags; every other column is reset by the guard trigger. Payment, status and email stay protected.
drop policy if exists "Customers update own unpaid applications" on public.visa_applications;
drop policy if exists "Customers update own applications" on public.visa_applications;
create policy "Customers update own applications" on public.visa_applications for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status, 'submitted') in ('draft', 'submitted', 'reviewing'))
  with check (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status, 'submitted') in ('draft', 'submitted', 'reviewing'));

create or replace function public.visa_applications_guard_customer_update() returns trigger
language plpgsql set search_path = public as $$
declare keep_notes text; f1 boolean; f2 boolean; f3 boolean; f4 boolean;
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.payment_status := old.payment_status;
    new.payment_amount := old.payment_amount;
    new.payment_id     := old.payment_id;
    new.email          := old.email;
    if old.application_status = 'submitted' and new.application_status <> 'submitted' then
      new.application_status := old.application_status;  -- only draft -> submitted is allowed for customers
    end if;
    if new.application_status not in ('draft', 'submitted') then
      new.application_status := old.application_status;
    end if;
    -- In review: notes (employment answers, uploads list) and document flags only.
    if old.application_status = 'reviewing' then
      keep_notes := new.additional_notes; f1 := new.has_passport; f2 := new.has_photos; f3 := new.has_bank_statements; f4 := new.has_employment_proof;
      new := old;
      new.additional_notes := keep_notes; new.has_passport := f1; new.has_photos := f2; new.has_bank_statements := f3; new.has_employment_proof := f4;
      new.updated_at := now();
    end if;
  end if;
  return new;
end $$;
