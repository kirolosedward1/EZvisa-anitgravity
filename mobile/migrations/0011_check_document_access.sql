-- Check for 0011 (run AFTER 0011 is approved and applied). Everything is rolled back; nothing is kept.
-- Proves: another user can't read (so can't get a signed URL for) or upload into someone else's application folder,
-- the owner can read their file, and the owner can't upload into an unpaid application.
-- Expected: four NOTICE lines ending in "OK". Any failure raises an exception.
-- Uses two made-up rows with +ezvisa-app-test emails; no auth users are created (ownership is by JWT email).

begin;

insert into public.visa_applications (id, full_name, email, phone, nationality, destination_country, travel_purpose, application_status, payment_status)
values
  ('00000000-0000-4000-8000-0000000009a1', 'RLS Test Paid', 'owner+ezvisa-app-test@example.com', '0', 'India', 'France', 'tourism', 'submitted', 'paid'),
  ('00000000-0000-4000-8000-0000000009a2', 'RLS Test Unpaid', 'owner+ezvisa-app-test@example.com', '0', 'India', 'France', 'tourism', 'submitted', 'pending');

insert into storage.objects (bucket_id, name)
values ('visa_documents', '00000000-0000-4000-8000-0000000009a1/passportCopy_00000000-0000-4000-8000-00000000f001.jpg');

set local role authenticated;

-- Another user
select set_config('request.jwt.claims', '{"role":"authenticated","email":"other+ezvisa-app-test@example.com"}', true);
do $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'visa_documents' and name like '00000000-0000-4000-8000-0000000009a1/%') then
    raise exception 'FAIL: another user can read the owner''s file (and could sign a URL for it)';
  end if;
  raise notice 'Another user cannot read the owner''s file: OK';
  begin
    insert into storage.objects (bucket_id, name) values ('visa_documents', '00000000-0000-4000-8000-0000000009a1/passportCopy_intruder.jpg');
    raise exception 'FAIL: another user could upload into the owner''s folder';
  exception when insufficient_privilege then raise notice 'Another user cannot upload into the owner''s folder: OK';
  end;
end $$;

-- The owner
select set_config('request.jwt.claims', '{"role":"authenticated","email":"owner+ezvisa-app-test@example.com"}', true);
do $$
begin
  if not exists (select 1 from storage.objects where bucket_id = 'visa_documents' and name = '00000000-0000-4000-8000-0000000009a1/passportCopy_00000000-0000-4000-8000-00000000f001.jpg') then
    raise exception 'FAIL: the owner cannot read their own file';
  end if;
  raise notice 'Owner can read their own file: OK';
  begin
    insert into storage.objects (bucket_id, name) values ('visa_documents', '00000000-0000-4000-8000-0000000009a2/passportCopy_unpaid.jpg');
    raise exception 'FAIL: the owner could upload into an unpaid application';
  exception when insufficient_privilege then raise notice 'Owner cannot upload into an unpaid application: OK';
  end;
end $$;

rollback;
