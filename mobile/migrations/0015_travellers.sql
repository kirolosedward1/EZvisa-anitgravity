-- 0015 (= website scripts/007_travellers.sql): saved travellers. One row per person a customer applied for (themselves, their spouse, someone else), used by
-- the "Who is travelling?" drop-down in the wizard (website + app) and by Account → Saved travellers.
-- Applied on ezvisa-uae (dravvaykssrbktztmrlj) on 2026-10-23. Source of truth: scripts/007_travellers.sql in the website repo; keep this copy identical.
--
-- Ownership is by account email, the same rule as visa_applications (lib/applications.ts, mobile/lib/data.ts): a guest
-- who pays first gets their traveller once they sign up with that email. The server (service role, lib/travellers.ts)
-- upserts rows when a case becomes paid; the clients read and edit their own rows through RLS.
-- Passport numbers live only here: never in auth user_metadata (it is copied into every access token).
-- Additive only: no existing table, column or policy is changed.

create table if not exists public.travellers (
  id uuid primary key default gen_random_uuid(),
  email text not null,                                   -- owner (lower-cased account email)
  relationship text not null default 'other' check (relationship in ('self', 'spouse', 'other')),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  nationality text,                                      -- English country name (lib/shared/wizard-contract.ts SCHENGEN_VISA_REQUIRED)
  passport_number text,                                  -- upper-case, A-Z0-9 only (normalizePassport)
  passport_expiry date,
  phone text,
  phone_country text,
  city_of_residence text,
  dedupe_key text not null,                              -- travellerKey(): "p:<passport>" or "n:<last>|<first>|<dob>"
  source text not null default 'application' check (source in ('application', 'backfill', 'manual')),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travellers_email_lower check (email = lower(email)),
  constraint travellers_email_dedupe unique (email, dedupe_key)
);
comment on table public.travellers is 'Saved travellers of a customer (owner = account email) for prefilling applications. Website lib/travellers.ts, app mobile/lib/travellers.ts.';

create index if not exists idx_travellers_email on public.travellers (email);

alter table public.travellers enable row level security;
revoke all on public.travellers from anon;
grant select, insert, update, delete on public.travellers to authenticated;

-- Owner-only: the signed-in email sees and changes its own rows. Staff and the website server use the service role.
drop policy if exists "travellers own select" on public.travellers;
create policy "travellers own select" on public.travellers for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "travellers own insert" on public.travellers;
create policy "travellers own insert" on public.travellers for insert to authenticated
  with check (email = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "travellers own update" on public.travellers;
create policy "travellers own update" on public.travellers for update to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (email = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "travellers own delete" on public.travellers;
create policy "travellers own delete" on public.travellers for delete to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace function public.travellers_touch() returns trigger language plpgsql set search_path to 'public' as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists travellers_touch on public.travellers;
create trigger travellers_touch before update on public.travellers for each row execute function public.travellers_touch();

-- Account deletion (the delete-account edge function calls auth.admin.deleteUser): the rows go with the account, so a
-- later sign-up with the same address never sees them. Belt and braces with the function's own delete.
create or replace function public.travellers_on_user_deleted() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if old.email is not null then delete from public.travellers where email = lower(old.email); end if;
  return old;
end $$;
drop trigger if exists travellers_on_user_deleted on auth.users;
create trigger travellers_on_user_deleted after delete on auth.users for each row execute function public.travellers_on_user_deleted();
