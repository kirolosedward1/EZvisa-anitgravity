-- Behaviour checks for the visa_applications_notify trigger from 0006 (run by run-sql.sh).
\set ON_ERROR_STOP 1
create or replace function pg_temp.ok(cond boolean, name text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FAIL %', name; end if; raise notice 'PASS %', name; end $$;
truncate net.calls;
insert into public.visa_applications (id, email, application_status, document_reviews) values ('3f2b8c1e-9a4d-4c2b-8f1e-0a1b2c3d4e5f', 'a@x.com', 'submitted', '{}');
select pg_temp.ok((select count(*) = 0 from net.calls), 'insert sends nothing (trigger is AFTER UPDATE)');
update public.visa_applications set email = email where true;
select pg_temp.ok((select count(*) = 0 from net.calls), 'edit without status/document change sends nothing');
update public.visa_applications set application_status = 'reviewing';
select pg_temp.ok((select count(*) = 1 and bool_and(body->>'old_status' = 'submitted' and body->>'new_status' = 'reviewing' and headers ? 'x-ezvisa-hook' and url like '%/functions/v1/notify-status') from net.calls), 'status change -> one call with old/new status and hook header');
update public.visa_applications set document_reviews = '{"passportCopy":{"status":"rejected"},"photo":{"status":"approved"}}';
select pg_temp.ok((select count(*) = 2 and (array_agg(body->'rejected' order by id))[2] = '["passportCopy"]'::jsonb from net.calls), 'newly rejected document -> call listing only that document');
update public.visa_applications set document_reviews = '{"passportCopy":{"status":"rejected"},"photo":{"status":"approved"}}';
select pg_temp.ok((select count(*) = 2 from net.calls), 'same rejection again sends nothing');
select pg_temp.ok((select bool_and(not (body::text ~* 'passport_number|full_name|@')) from net.calls), 'trigger body has no email or names');
