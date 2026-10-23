-- 0012: a real customer profile (one row per account) for prefilling new applications.  NOT APPLIED (needs owner approval).
-- Today the app (lib/profile.ts) reads the profile from Supabase Auth user_metadata (name, phone, nationality, date of
-- birth; the same place the website prefills from) and the passport number/expiry from the user's latest
-- visa_applications row. Passport details are deliberately NOT written to user_metadata, because user_metadata is
-- copied into every access token. With this table the "Update your profile too?" step on Review could also save
-- passport details, and the profile would no longer depend on past applications.
-- Additive only: no existing table, column or policy is changed.

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text, last_name text, nationality text, date_of_birth date,
  phone text, phone_country text,
  passport_number text, passport_expiry date,
  updated_at timestamptz not null default now()
);
comment on table public.customer_profiles is 'Signed-in customer''s own saved details for prefilling applications (app: lib/profile.ts). Owner-only RLS.';

alter table public.customer_profiles enable row level security;
revoke all on public.customer_profiles from anon;
grant select, insert, update, delete on public.customer_profiles to authenticated;

-- Owner-only: a user can see and change exactly one row, their own. Staff use the service role (bypasses RLS).
drop policy if exists "customer_profiles own select" on public.customer_profiles;
create policy "customer_profiles own select" on public.customer_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "customer_profiles own insert" on public.customer_profiles;
create policy "customer_profiles own insert" on public.customer_profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "customer_profiles own update" on public.customer_profiles;
create policy "customer_profiles own update" on public.customer_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "customer_profiles own delete" on public.customer_profiles;
create policy "customer_profiles own delete" on public.customer_profiles for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.customer_profiles_touch() returns trigger language plpgsql set search_path to 'public' as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists customer_profiles_touch on public.customer_profiles;
create trigger customer_profiles_touch before update on public.customer_profiles for each row execute function public.customer_profiles_touch();

-- App change after this is applied (small, lib/profile.ts only): loadProfile() reads
--   supabase.from("customer_profiles").select("*").eq("user_id", uid).maybeSingle()
-- first (then user_metadata, then the latest application), and saveProfile() upserts the confirmed fields there,
-- passport number/expiry included. The delete-account function should also delete the row (on delete cascade covers it).
