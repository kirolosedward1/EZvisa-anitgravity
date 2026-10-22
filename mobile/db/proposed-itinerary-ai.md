# Proposal: AI itinerary + status push (NOT deployed)

Status: proposal only. Nothing here has been applied to the live project `dravvaykssrbktztmrlj`.
The app ships today with a **deterministic, on-device** plan (`mobile/lib/itinerary.ts`), labelled "Ideas, not bookings",
saved locally and in `visa_applications.additional_notes.itinerary` (only while the row is `draft`/`submitted`; RLS blocks later edits).

## 1. Itinerary in its own table (so it stays editable after review starts)

```sql
create table public.trip_plans (
  application_id uuid primary key references public.visa_applications(id) on delete cascade,
  email text not null,
  plan jsonb not null,               -- same shape as mobile Plan {v:1,label,lang,prefs,days[]}
  source text not null default 'device' check (source in ('device','ai')),
  updated_at timestamptz not null default now()
);
alter table public.trip_plans enable row level security;
create policy "own plans read"   on public.trip_plans for select using (lower(email) = lower(auth.jwt()->>'email'));
create policy "own plans write"  on public.trip_plans for insert with check (lower(email) = lower(auth.jwt()->>'email')
  and exists (select 1 from public.visa_applications a where a.id = application_id and lower(a.email) = lower(auth.jwt()->>'email')));
create policy "own plans update" on public.trip_plans for update using (lower(email) = lower(auth.jwt()->>'email'));
```
App change after this lands: `savePlan` upserts `trip_plans` instead of `patchNotes`.

## 2. Edge function `itinerary-ai` (optional AI rewrite)

- `POST /functions/v1/itinerary-ai` with the user JWT, body `{ application_id, prefs, lang }`.
- Reads the application with the caller's JWT (RLS enforces ownership), takes destination, extra countries, entry/exit dates.
- Calls the LLM server-side (key in function secrets, never in the app) with a strict JSON schema identical to `Plan.days`.
- Prompt rules: generic ideas only, no prices, opening hours, visa/eligibility claims or bookings; max 3 items/day; output in `lang`.
- Validates the JSON (day count = trip length, ≤ 3 items, text ≤ 140 chars), falls back to the deterministic plan on any error,
  upserts `trip_plans` with `source='ai'`, rate-limit 5/day per email.

```ts
// supabase/functions/itinerary-ai/index.ts (sketch)
Deno.serve(async (req) => {
  const supa = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization")! } } });
  const { application_id, prefs, lang } = await req.json();
  const { data: a } = await supa.from("visa_applications").select("id,email,destination_country,additional_countries,entry_date,exit_date").eq("id", application_id).single();
  if (!a) return new Response("not found", { status: 404 });
  const plan = validate(await llm(a, prefs, lang)) ?? deterministic(a, prefs, lang);
  await supa.from("trip_plans").upsert({ application_id, email: a.email, plan, source: "ai" });
  return Response.json(plan);
});
```

## 3. Push notifications for status changes (native build only)

Expo Go on SDK 53+ cannot receive remote push on Android, and iOS needs the real bundle id, so this needs an EAS build.

```sql
create table public.push_tokens (
  token text primary key, email text not null, platform text check (platform in ('ios','android')),
  created_at timestamptz default now(), last_seen timestamptz default now()
);
alter table public.push_tokens enable row level security;
create policy "own tokens" on public.push_tokens for all using (lower(email) = lower(auth.jwt()->>'email')) with check (lower(email) = lower(auth.jwt()->>'email'));
```
- App: after sign-in, `Notifications.getExpoPushTokenAsync({ projectId })` → upsert `push_tokens`.
- Database Webhook on `visa_applications` UPDATE when `status` or `payment_status` changes → Edge Function `notify-status`
  (service role inside the function only) → looks up tokens by `email` → `POST https://exp.host/--/api/v2/push/send`
  with `{ title: "Application EZ-XXXX", body: "<new status>", data: { url: "/applications/<id>" } }`.
- Also insert into the existing `notifications` table so the in-app inbox matches. Remove tokens on `DeviceNotRegistered`.
