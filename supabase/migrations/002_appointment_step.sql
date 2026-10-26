-- Appointment step (owner approved, NOT applied by the app). Additive only: new nullable
-- columns and checks. No drops, no data changes. Apply once in the SQL editor after review.
--
-- appointment_at, appointment_centre, appointment_address and appointment_reference already
-- exist (staff-set). This adds the customer's choice, the help-request status, and the
-- stamp that the prepared file was downloaded at least once. lat/lng columns are left as they are.
--
-- Customers may update their own row. A trigger lets them set appointment details and
-- appointment_help_status = 'requested' only. contacted / booked / cancelled stay with the
-- service role (admin API). file_downloaded_at is service-role only.
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
-- The trigger below is what keeps payment fields, the download stamp, and staff help
-- statuses from being changed by a signed-in customer.
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

create or replace function public.visa_applications_guard_appointment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  choice text;
  help_status text;
  help_at timestamptz;
  at timestamptz;
  centre text;
  address text;
  reference text;
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;

  new.payment_status := old.payment_status;
  new.payment_amount := old.payment_amount;
  new.payment_id := old.payment_id;
  new.email := old.email;
  new.file_downloaded_at := old.file_downloaded_at;

  choice := new.appointment_choice;
  at := new.appointment_at;
  centre := new.appointment_centre;
  address := new.appointment_address;
  reference := new.appointment_reference;
  help_status := new.appointment_help_status;
  help_at := new.appointment_help_requested_at;

  -- Customers may set 'requested' from null or 'requested'. Staff states stay put.
  if old.appointment_help_status in ('contacted', 'booked', 'cancelled') then
    help_status := old.appointment_help_status;
    help_at := old.appointment_help_requested_at;
  elsif help_status is not null and help_status <> 'requested' then
    help_status := old.appointment_help_status;
  end if;

  -- Ready and later rows: appointment fields only. Drafts keep the existing edit path.
  if coalesce(old.application_status, '') not in ('draft', 'submitted', 'reviewing', 'awaiting_documents') then
    new := old;
    new.appointment_choice := choice;
    new.appointment_at := at;
    new.appointment_centre := centre;
    new.appointment_address := address;
    new.appointment_reference := reference;
    new.appointment_help_status := help_status;
    new.appointment_help_requested_at := help_at;
  else
    new.appointment_help_status := help_status;
    new.appointment_help_requested_at := help_at;
  end if;

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
