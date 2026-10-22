-- 0007: let a signed-in customer discard their own UNPAID draft/submitted application.  NOT APPLIED (review first).
-- application_status is plain text (no enum / check constraint), so 'cancelled' needs no type change.
-- Today: no DELETE policy for customers, and visa_applications_guard_customer_update() reverts any
-- application_status other than draft/submitted, so the app can only hide discarded cases locally
-- (AsyncStorage) and set additional_notes.discarded_at (allowed by "Customers update own applications").
-- This makes the discard real and visible to staff: draft/submitted + unpaid -> 'cancelled'.

create or replace function public.visa_applications_guard_customer_update()
returns trigger language plpgsql set search_path to 'public' as $function$
declare keep_notes text; f1 boolean; f2 boolean; f3 boolean; f4 boolean; discard boolean;
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    discard := auth.role() = 'authenticated' and coalesce(new.application_status, '') = 'cancelled' and old.application_status in ('draft', 'submitted')
               and coalesce(old.payment_status, '') not in ('paid', 'completed');
    new.payment_status := old.payment_status;
    new.payment_amount := old.payment_amount;
    new.payment_id     := old.payment_id;
    new.email          := old.email;
    if discard then
      -- A discard changes nothing but the status (and the notes flag): every other column keeps its old value.
      keep_notes := new.additional_notes;
      new := old;
      new.application_status := 'cancelled'; new.additional_notes := keep_notes; new.updated_at := now();
      return new;
    end if;
    if true then
      if old.application_status = 'submitted' and new.application_status <> 'submitted' then
        new.application_status := old.application_status;
      end if;
      if new.application_status not in ('draft', 'submitted') then
        new.application_status := old.application_status;
      end if;
    end if;
    if old.application_status = 'reviewing' then
      keep_notes := new.additional_notes; f1 := new.has_passport; f2 := new.has_photos; f3 := new.has_bank_statements; f4 := new.has_employment_proof;
      new := old;
      new.additional_notes := keep_notes; new.has_passport := f1; new.has_photos := f2; new.has_bank_statements := f3; new.has_employment_proof := f4;
      new.updated_at := now();
    end if;
  end if;
  return new;
end $function$;

-- The UPDATE policy's WITH CHECK must also accept the new 'cancelled' row (USING still limits it to draft/submitted/reviewing).
drop policy if exists "Customers update own applications" on public.visa_applications;
create policy "Customers update own applications" on public.visa_applications for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status, 'submitted') in ('draft', 'submitted', 'reviewing'))
  with check (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status, 'submitted') in ('draft', 'submitted', 'reviewing', 'cancelled'));
-- Applied 2026-10-22. lib/discard.ts sends { application_status: 'cancelled' } for unpaid draft/submitted rows.
