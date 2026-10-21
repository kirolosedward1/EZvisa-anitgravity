-- NOT APPLIED. Needs [DB] approval.
-- Lets a customer save post-payment employment answers (additional_notes) even after staff move the
-- application past 'submitted'. The guard trigger still protects payment/status/email columns.
drop policy if exists "Customers update own unpaid applications" on public.visa_applications;
create policy "Customers update own applications" on public.visa_applications for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') and coalesce(application_status,'submitted') in ('draft','submitted','reviewing','documents_requested'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));
