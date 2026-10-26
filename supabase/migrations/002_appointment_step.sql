-- Appointment step (owner approved, NOT applied by the app). Additive only: new nullable
-- columns and checks. No drops, no data changes. Apply once in the SQL editor after review.
--
-- appointment_at, appointment_centre, appointment_address and appointment_reference already
-- exist (staff-set). This adds the customer's choice, the help-request status, and the
-- stamp that the prepared file was downloaded at least once. lat/lng columns are left as they are.
--
-- Customers may update their own row. The trigger is the lock, for every application_status:
-- authenticated and anon start from the old row and may change only the columns named in
-- visa_applications_guard_appointment(). Appointment columns change only when the row is
-- paid and the prepared file has been downloaded. contacted / booked / cancelled stay with
-- the service role. file_downloaded_at is service-role only.
-- There is no payment row and no price column.

alter table public.visa_applications
  add column if not exists appointment_choice text,
  add column if not exists appointment_help_status text,
  add column if not exists appointment_help_requested_at timestamptz,
  add column if not exists file_downloaded_at timestamptz;

comment on column public.visa_applications.appointment_choice is
  'has_one, help_requested, later, or null when the customer has not answered.';
comment on column public.visa_applications.appointment_help_status is
  'requested, contacted, booked, cancelled. Customers may only set requested.';
comment on column public.visa_applications.appointment_help_requested_at is
  'When the customer asked EZvisa to try to find an appointment. No price is stored.';
comment on column public.visa_applications.file_downloaded_at is
  'First time the prepared visa file was downloaded. The appointment step stays locked until this is set.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'visa_applications_appointment_choice_check'
  ) then
    alter table public.visa_applications
      add constraint visa_applications_appointment_choice_check
      check (appointment_choice is null or appointment_choice in ('has_one', 'help_requested', 'later'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'visa_applications_appointment_help_status_check'
  ) then
    alter table public.visa_applications
      add constraint visa_applications_appointment_help_status_check
      check (appointment_help_status is null or appointment_help_status in ('requested', 'contacted', 'booked', 'cancelled'));
  end if;
end $$;

-- Own-row updates. Permissive policies are OR'd with any existing update policy.
-- The trigger is the lock: authenticated and anon cannot change arbitrary columns.
-- See the comment on visa_applications_guard_appointment() for the exact rules.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'visa_applications'
      and policyname = 'Customers update own appointment'
  ) then
    create policy "Customers update own appointment"
      on public.visa_applications
      for update
      to authenticated
      using (lower(email) = lower((select auth.jwt() ->> 'email')))
      with check (lower(email) = lower((select auth.jwt() ->> 'email')));
  end if;
end $$;

-- Customer and anon updates. service_role (appointment API, download stamp, admin,
-- document upload, delete-account) returns new unchanged and is not limited here.
--
-- For authenticated and anon, every update starts from the old row. Only the
-- columns listed below are copied back, for every application_status:
--
-- 1. Appointment columns, and only when old.payment_status = 'paid' and
--    old.file_downloaded_at is not null. Otherwise they stay at the old values,
--    so the database itself enforces the paid and downloaded gate.
--    appointment_help_status may move from null to 'requested', or stay unchanged.
--    It cannot be set to contacted, booked or cancelled, and a staff value cannot
--    be cleared. appointment_help_requested_at changes only on that null -> requested
--    transition. appointment_lat and appointment_lng are never copied.
--
-- 2. Columns the signed-in customer already writes with their own JWT. This function
--    used to let every other column through (it only froze appointment_* and
--    document_reviews). The website draft sync, /api/continue-application, discard,
--    and the app's wizard / continue / upload updates all use that JWT, not the
--    service role, so dropping the columns would reject those saves. On every other
--    status, name, status and price stay as they are.
--      - discard: an authenticated user may set application_status to cancelled on
--        an unpaid draft or submitted row, and may keep the incoming notes.
--      - draft and submitted: the wizard columns (name, phone, nationality,
--        destination, date of birth, trip dates, purpose, passport number, duration,
--        previous visa, refusals, user agent, referrer, additional_notes) and the
--        four has_* document flags. application_status may move draft -> submitted.
--        A submitted row stays submitted.
--      - reviewing and awaiting_documents: continue-application columns (notes,
--        phone, date of birth, trip dates, purpose, passport number, duration,
--        previous visa, refusals) and the four has_* flags. Not the name, and not
--        the status.
--    Payment amount, payment status, payment id, email and file_downloaded_at are
--    never taken from the customer. document_reviews and the coordinates stay staff-only.
create or replace function public.visa_applications_guard_appointment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  incoming public.visa_applications%rowtype;
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;

  incoming := new;
  new := old;

  if auth.role() = 'authenticated'
     and coalesce(incoming.application_status, '') = 'cancelled'
     and old.application_status in ('draft', 'submitted')
     and coalesce(old.payment_status, '') not in ('paid', 'completed') then
    new.application_status := 'cancelled';
    new.additional_notes := incoming.additional_notes;
  elsif old.application_status in ('reviewing', 'awaiting_documents') then
    new.additional_notes := incoming.additional_notes;
    new.phone := incoming.phone;
    new.date_of_birth := incoming.date_of_birth;
    new.entry_date := incoming.entry_date;
    new.exit_date := incoming.exit_date;
    new.duration_days := incoming.duration_days;
    new.travel_purpose := incoming.travel_purpose;
    new.passport_number := incoming.passport_number;
    new.previous_schengen_visa := incoming.previous_schengen_visa;
    new.previous_rejections := incoming.previous_rejections;
    new.rejection_details := incoming.rejection_details;
    new.has_passport := incoming.has_passport;
    new.has_photos := incoming.has_photos;
    new.has_bank_statements := incoming.has_bank_statements;
    new.has_employment_proof := incoming.has_employment_proof;
  elsif coalesce(old.application_status, '') in ('draft', 'submitted') then
    new.full_name := incoming.full_name;
    new.phone := incoming.phone;
    new.nationality := incoming.nationality;
    new.destination_country := incoming.destination_country;
    new.date_of_birth := incoming.date_of_birth;
    new.entry_date := incoming.entry_date;
    new.exit_date := incoming.exit_date;
    new.travel_purpose := incoming.travel_purpose;
    new.passport_number := incoming.passport_number;
    new.duration_days := incoming.duration_days;
    new.previous_schengen_visa := incoming.previous_schengen_visa;
    new.previous_rejections := incoming.previous_rejections;
    new.rejection_details := incoming.rejection_details;
    new.user_agent := incoming.user_agent;
    new.referrer := incoming.referrer;
    new.additional_notes := incoming.additional_notes;
    new.has_passport := incoming.has_passport;
    new.has_photos := incoming.has_photos;
    new.has_bank_statements := incoming.has_bank_statements;
    new.has_employment_proof := incoming.has_employment_proof;
    if old.application_status = 'draft' and incoming.application_status = 'submitted' then
      new.application_status := 'submitted';
    end if;
  end if;

  -- Paid and downloaded: appointment fields only, with the help-status rule.
  -- Any other row keeps the appointment values it already had.
  if old.payment_status = 'paid' and old.file_downloaded_at is not null then
    new.appointment_choice := incoming.appointment_choice;
    new.appointment_at := incoming.appointment_at;
    new.appointment_centre := incoming.appointment_centre;
    new.appointment_address := incoming.appointment_address;
    new.appointment_reference := incoming.appointment_reference;
    if incoming.appointment_help_status is not distinct from old.appointment_help_status then
      new.appointment_help_status := old.appointment_help_status;
      new.appointment_help_requested_at := old.appointment_help_requested_at;
    elsif old.appointment_help_status is null and incoming.appointment_help_status = 'requested' then
      new.appointment_help_status := 'requested';
      new.appointment_help_requested_at := coalesce(incoming.appointment_help_requested_at, now());
    else
      new.appointment_help_status := old.appointment_help_status;
      new.appointment_help_requested_at := old.appointment_help_requested_at;
    end if;
  else
    new.appointment_choice := old.appointment_choice;
    new.appointment_at := old.appointment_at;
    new.appointment_centre := old.appointment_centre;
    new.appointment_address := old.appointment_address;
    new.appointment_reference := old.appointment_reference;
    new.appointment_help_status := old.appointment_help_status;
    new.appointment_help_requested_at := old.appointment_help_requested_at;
  end if;

  new.payment_status := old.payment_status;
  new.payment_amount := old.payment_amount;
  new.payment_id := old.payment_id;
  new.email := old.email;
  new.file_downloaded_at := old.file_downloaded_at;
  new.document_reviews := old.document_reviews;
  new.appointment_lat := old.appointment_lat;
  new.appointment_lng := old.appointment_lng;
  new.updated_at := now();
  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'visa_applications_guard_appointment'
  ) then
    create trigger visa_applications_guard_appointment
      before update on public.visa_applications
      for each row execute function public.visa_applications_guard_appointment();
  end if;
end $$;
