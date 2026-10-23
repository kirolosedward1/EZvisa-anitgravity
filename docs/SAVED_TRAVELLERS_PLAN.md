# Saved travellers: plan + implementation prompt

> Feature: when a signed-in customer already has traveller data saved, the wizard shows a drop-down to pick a traveller
> and fills the traveller step from it. Same behaviour on the website (`/apply`) and in the app (`mobile/`).
> Status: PLAN (nothing implemented yet). Section 6 is the ready-to-paste prompt.

---

## 1. What exists today (findings, 2026-10-23)

| Where | What is saved | Used for |
|---|---|---|
| Supabase Auth `user_metadata` | `full_name` / `first_name` / `last_name`, `phone`, `phone_country`, `citizenship` (ISO), `date_of_birth` (app only) | Website prefills name/phone/email (`app/apply/page.tsx` `loadAuthenticatedUser`) and nationality (`lib/remembered-nationality.ts`). App prefills the same plus DOB (`mobile/lib/profile.ts`). Account pages on both platforms edit these. |
| `public.visa_applications.additional_notes.wizard` | Every wizard answer of every case, incl. `firstName`, `lastName`, `dateOfBirth`, `nationality`, `passportNumber`, `passportExpiry`, `phone`, `cityOfResidence`, and `spouseFirstName`, `spouseLastName`, `spouseHasValidPassport`, `spouseOccupation` | App `loadProfile()` reads the latest non-draft case for passport number/expiry and offers "Use details from your last application?" (`PrefillOffer`, keys in `PREFILL_KEYS`). Website reads only `nationality` from the latest row. |
| `mobile/migrations/0012_customer_profiles.sql` | Proposed one-row-per-user profile table. **Not applied** on the live project (`ezvisa-uae`, ref `dravvaykssrbktztmrlj`): public tables there are `blog_posts`, `visa_applications`, `wizard_events`, `device_tokens` only. | Nothing yet. |

Consequences:

- There is **no list of travellers anywhere**. "Saved traveller data" today means one implicit person: the account holder,
  reconstructed from `user_metadata` plus the latest application. A customer who applied for themselves and later wants
  to apply for their spouse (or vice versa) gets nothing reusable.
- Passport numbers are deliberately kept **out** of `user_metadata` (it is copied into every access token). Any saved
  traveller record that carries a passport number must live in a table with owner-only RLS, not in auth metadata.
- Ownership of application rows is **by email** (`lib/applications.ts`, `mobile/lib/data.ts`): the row's `email` equals
  the signed-in email. Guest checkout in the app pays first and signs up with the same email afterwards.
- The website traveller step (`components/apply/nationality-step.tsx`, "Who is travelling?") asks first name, last name,
  passport number, phone, "Just me / With my spouse", email, date of birth. Nationality is chosen on the destination
  step (`components/apply/destination-step.tsx`). The app asks one question per screen (`mobile/lib/questions.ts`:
  `destination` → `nationality` → `cityOfResidence` → `name` → `contact` → `maritalStatus` → `spouseAccompanying`).
- Spouse details are asked **after payment** on both platforms (`app/continue/[id]/continue-form.tsx`,
  `mobile/app/continue/[id].tsx`), so a spouse is also a candidate for "pick a saved traveller".
- The single point where a row becomes paid on the server is `applyIntentStatus()` in `lib/ziina.ts` (called by the
  Ziina webhook and by `/api/check-payment`). The after-payment answers land in `/api/continue-application`.
- The contract (`lib/shared/wizard-contract.ts`) must stay import-free and mirrored in `mobile/lib/wizard.ts`;
  `pnpm sync:check` (`scripts/check-app-sync.mts`) fails CI on drift. `mobile/` is tracked on `main` in this checkout.

## 2. Decision: a `travellers` table, backfilled from past applications

Two ways to get "saved traveller data":

| | A. Derive from past applications only (no schema change) | B. `public.travellers` table + backfill (recommended) |
|---|---|---|
| Works for existing customers on day one | Yes | Yes (first load backfills from paid/submitted cases) |
| Spouse entries | Name only, from the spouse fields | Same at first; becomes a full record once the spouse has their own case or the customer edits it |
| Edit / delete a traveller (typo in a passport number) | No, it is a historical row | Yes, Account → Saved travellers |
| Consent and privacy | Implicit | Explicit list the customer can see and remove; owner-only RLS; passport numbers never in auth metadata |
| Cost | Small | One additive migration (owner must apply it), one API, one contract addition, UI on both platforms |

**Go with B.** A derived-only list cannot be corrected and would grow stale. Keep A's value by backfilling once.

Design rules:

1. **Ownership by email**, like `visa_applications`: `travellers.email` = the signed-in email, RLS `lower(email) =
   lower(auth.jwt() ->> 'email')`. The server (service role) can then upsert travellers straight from a paid row without
   looking up an auth user id, and a guest who paid first gets their traveller when they sign up with that email.
   (Trade-off accepted already for applications: changing the account email moves the data out of view.)
2. **Save automatically at payment**, server-side, in `applyIntentStatus()`: the main applicant of every newly paid case is
   upserted. `/api/continue-application` then updates the passport number and upserts the spouse (relationship
   `spouse`). Drafts and unpaid submissions never create travellers. No extra "save this traveller?" question.
3. **Dedupe key** (shared rule in the contract): passport number (upper-cased, non-alphanumerics removed) when present,
   else `lastname|firstname|dateOfBirth` lower-cased. Upsert = update the matching row, else insert.
4. **Relationship**: `self` | `spouse` | `other`. The first traveller saved for an email is `self`; a spouse saved from the
   continue step is `spouse`; anything else is `other`. Editable in Account.
5. **The wizard only fills, never silently overwrites**: picking a traveller fills the traveller fields and every field
   stays editable. If the customer edits a filled field, the record is updated at payment through the dedupe key (same
   passport number → same row), so the next pick shows the corrected values.
6. **Fallbacks stay**: no travellers → today's behaviour (user_metadata prefill on the website; `loadProfile` +
   `PrefillOffer` in the app). The employment/city "Use details from your last application?" offer in the app is kept
   as is; it covers answers that are not traveller attributes.

## 3. Data model and contract

### 3.1 SQL (`scripts/007_travellers.sql`, mirrored as `mobile/migrations/0015_travellers.sql`)

```sql
create table if not exists public.travellers (
  id uuid primary key default gen_random_uuid(),
  email text not null,                                   -- owner, lower-cased (same rule as visa_applications)
  relationship text not null default 'other' check (relationship in ('self','spouse','other')),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  nationality text,                                      -- English country name as in SCHENGEN_VISA_REQUIRED
  passport_number text,                                  -- upper-case, A-Z0-9 only
  passport_expiry date,
  phone text, phone_country text,
  city_of_residence text,
  dedupe_key text not null,                              -- see contract travellerKey()
  source text not null default 'application' check (source in ('application','backfill','manual')),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, dedupe_key)
);
create index if not exists idx_travellers_email on public.travellers (email);
alter table public.travellers enable row level security;
revoke all on public.travellers from anon;
grant select, insert, update, delete on public.travellers to authenticated;
create policy "travellers own select" on public.travellers for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "travellers own insert" on public.travellers for insert to authenticated with check (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "travellers own update" on public.travellers for update to authenticated using (lower(email) = lower(auth.jwt() ->> 'email')) with check (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "travellers own delete" on public.travellers for delete to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));
-- updated_at trigger: reuse update_visa_applications_updated_at() or add travellers_touch() like 0012.
```

The app's delete-account function (`mobile/migrations/functions/delete-account`) must also delete `travellers` rows for
the account email (no FK cascade with an email key). The website's delete-account path does the same.

### 3.2 Contract additions (`lib/shared/wizard-contract.ts` ↔ `mobile/lib/wizard.ts`, bump `CONTRACT_VERSION`)

```ts
export const TRAVELLER_RELATIONSHIPS = ["self", "spouse", "other"] as const
export type TravellerRelationship = (typeof TRAVELLER_RELATIONSHIPS)[number]
/** Wizard answers a saved traveller carries. Email is the account's, marital status drives the price: neither is one. */
export const TRAVELLER_KEYS = ["firstName", "lastName", "dateOfBirth", "nationality", "passportNumber", "passportExpiry",
  "hasValidPassport", "phone", "phoneCountry", "phoneLocal", "cityOfResidence"] as const
export type Traveller = { id: string; relationship: TravellerRelationship; lastUsedAt?: string | null } & Partial<Pick<WizardAnswers, (typeof TRAVELLER_KEYS)[number]>>
export const normalizePassport = (v?: string | null) => (v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")
/** Dedupe key: passport number when known, else last|first|dob. */
export function travellerKey(t: Pick<Traveller, "firstName" | "lastName" | "dateOfBirth" | "passportNumber">): string
/** The traveller a set of answers describes (main applicant). */
export function travellerFromAnswers(f: Partial<WizardAnswers>): Omit<Traveller, "id" | "relationship"> | null
/** The spouse a set of answers describes (name + passport validity only). */
export function spouseFromAnswers(f: Partial<WizardAnswers>): Omit<Traveller, "id" | "relationship"> | null
/** Fill the traveller fields from a saved traveller. Nationality is applied only when visa-required; expired passports are applied and left to validation. */
export function applyTraveller(f: WizardAnswers, t: Traveller): WizardAnswers
/** "Kirolos Edward · Egypt · ••4567" (passport masked to its last 4). */
export function travellerLabel(t: Traveller): string
/** Row ↔ Traveller mapping (snake_case columns). */
export function travellerFromRow(row: Record<string, unknown>): Traveller
export function travellerToRow(t: Omit<Traveller, "id">, email: string): Record<string, unknown>
```

`ApplicationNotes` gains `travellerId?: string` (the saved traveller picked in the wizard, if any) and
`spouseTravellerId?: string`. `contractJson()` gains `travellers: { keys: TRAVELLER_KEYS, relationships: TRAVELLER_RELATIONSHIPS }`.

`scripts/check-app-sync.mts` gets fixtures for `travellerKey`, `travellerFromAnswers`, `spouseFromAnswers`,
`applyTraveller`, `travellerLabel` on both sides, and compares `TRAVELLER_KEYS` / `TRAVELLER_RELATIONSHIPS`.

### 3.3 API (website, used by both clients)

| Route | Auth | Does |
|---|---|---|
| `GET /api/travellers` | Supabase session cookie (web) or `Authorization: Bearer <access token>` (app), same as `/api/upload-document` | Lists the caller's travellers, most recently used first. If the table has none for this email, backfills once from the caller's paid or submitted (not draft/cancelled) `visa_applications` rows via `travellerFromAnswers` + `spouseFromAnswers`, `source: "backfill"`, then returns them. Demo accounts (`lib/demo-data.ts`) get fixed demo travellers. |
| `POST /api/travellers` | same | Create (manual). Validates with the contract rules (`validatePersonal`-style checks on the traveller keys). |
| `PATCH /api/travellers/[id]` / `DELETE /api/travellers/[id]` | same | Edit / remove, scoped to the caller's email. |
| `lib/travellers.ts` (server helper) | service role | `rememberTravellersFromApplication(row, { travellerId?, spouseTravellerId? })`: upsert main applicant + spouse by dedupe key; called from `applyIntentStatus()` on the transition to paid and from `/api/continue-application` after a successful save. `touchTravellerUsed(id)` sets `last_used_at`. |

Rate-limit the write routes with `lib/rate-limit.ts`, sanitise strings with `lib/sanitize.ts`, keep CORS as the
existing app-facing routes do (`lib/cors.ts`). The app may alternatively read the table directly through RLS
(`supabase.from("travellers")`) for offline-friendly caching, but the backfill must go through the API so both
platforms share it.

## 4. UX

### 4.1 Website wizard (`components/apply/nationality-step.tsx`)

- Signed out or no travellers: unchanged.
- Signed in with ≥1 traveller: a **"Traveller" select** (shadcn `Select`, semantic tokens, pill-style trigger) at the top of
  "Who is travelling?", above the name fields. Options: one row per saved traveller (`travellerLabel`, round
  `CountryFlag` of the nationality, relationship chip "You" / "Spouse"), then **"Someone else"**.
- Picking fills the traveller fields via `applyTraveller`, sets `travellerId` in the draft notes, and shows a small
  "Filled from your saved travellers" chip under the heading. "Someone else" clears nothing (keeps what is typed) and
  clears `travellerId`.
- Preselection on a fresh form (no identity answers yet, same rule as the app's `isFreshDraft`): exactly one traveller →
  preselect it; several → preselect `self` if present, else the most recently used; the select stays visible so the
  customer can switch. A resumed draft that already has a name is never changed.
- Nationality: if the traveller's nationality differs from the destination-step choice and is visa-required, apply it and
  show a one-line note "Nationality updated to {country} from the saved traveller"; otherwise keep the chosen one.
- Expired passport: fill it and show the existing validation message so the customer updates the expiry/number.
- The user_metadata prefill (`loadAuthenticatedUser`) runs only when there are no travellers.
- Review step (`components/apply/payment-step.tsx`): the Traveller row already shows name + passport; no change.
- Arabic: every new string through `LangText`; the select must work in RTL (`dir` is on `<html>`).

### 4.2 Website after payment (`app/continue/[id]/continue-form.tsx`, spouse step)

- Same select above the spouse fields, listing travellers other than the one used as main applicant (`travellerId`).
  Picking fills `spouseFirstName`, `spouseLastName`, `spouseHasValidPassport`, and sets `spouseTravellerId`.

### 4.3 Website account (`app/account/account-view.tsx`)

- New `Section` "Saved travellers" under "Account details": list rows (flag, name, relationship, masked passport,
  "last used {date}"), Edit (reuse the existing edit `Dialog`/sheet pattern with the traveller fields), Delete with
  confirm, "Add traveller". No new route, so no header-nav change.

### 4.4 App wizard (`mobile/lib/questions.ts`, `mobile/app/apply/index.tsx`, `mobile/components/wizard/QuestionView.tsx`)

- New question `traveller`, step `personal`, new `QKind "traveller"`, placed right after `destination` and before
  `nationality`. `applies` only when signed in and the loaded traveller list is non-empty (module-level setter like
  `setAccountEmail`: `setTravellers(list)`).
- Screen title "Who is travelling?" (same words as the website). Rows: flag + name + "Egypt · ••4567" + "You"/"Spouse"
  chip; last row "Someone else". Tap = `applyTraveller` + record `travellerId` in the draft + auto-advance to the first
  unanswered question (`firstUnanswered`, like `usePrefill`), so filled questions are skipped. Review still lists every
  answer for checking; the "From your saved travellers" chip replaces the "From your profile" chip on filled questions.
- When travellers exist, skip the silent `applyProfile` prefill; keep `PrefillOffer` for city/employment answers.
- Fetch the list once per wizard open through `GET /api/travellers` with the session's access token (`mobile/lib/api.ts`),
  cache in component state only (no personal data in AsyncStorage, same policy as `lib/profile.ts`).
- Continue flow (`mobile/app/continue/[id].tsx`): the spouse name question gets the same picker (travellers other than
  the main applicant) as a sheet above the fields.

### 4.5 App account (`mobile/app/(tabs)/account/`)

- New screen `account/travellers.tsx` (ListGroup/ListRow + Sheet editor, mirroring `details.tsx`), entry row "Saved
  travellers" in `account/index.tsx` next to "Account details". Add, edit, delete through the API.

### 4.6 Analytics

`lib/analytics.ts` / `mobile/lib/analytics.ts`: `traveller_picked` with `{ source: "saved" | "new", count }` only. Never
names or passport numbers.

## 5. Delivery, verification, open questions

**Order of work (ship the website first; the app falls back to `/api/app-config`):**

1. PR 1 (website, `main`): SQL migration file, contract additions + sync-check fixtures, `lib/travellers.ts`,
   `/api/travellers*`, hook in `applyIntentStatus()` and `/api/continue-application`, wizard select, continue-step spouse
   select, account section, demo data, docs (`docs/APP_WEB_SYNC.md` table + route list, `CLAUDE.md` section 10).
2. Owner applies `scripts/007_travellers.sql` on `ezvisa-uae` (schema changes need the owner; see `docs/APP_WEB_SYNC.md`).
3. PR 2 (app, `mobile/`): `mobile/lib/wizard.ts` mirror, `mobile/migrations/0015_travellers.sql` copy, delete-account
   function update, traveller question, continue-flow spouse picker, account screen, i18n strings (`mobile/lib/ar.ts`).

**Verification before each PR:** `pnpm sync:check`, `pnpm lint`, `pnpm build`; app: `npx tsc --noEmit`, `npx expo lint`.
Manual paths: new customer (no select shown), repeat customer with one traveller (preselected), with several (self
preselected, switch works), pick then edit a field then pay (record updated, not duplicated), spouse pick after payment,
account add/edit/delete, Arabic + RTL, 375 / 768 / 1280 px, app guest checkout then sign-up (traveller appears).

**Open questions (answer before implementation starts):**

1. Email-keyed ownership (recommended, matches applications) vs `user_id` as in the unapplied `0012` proposal?
2. Save automatically at payment (recommended) vs ask "Save this traveller for next time?" on the review step?
3. Scope of PR 1: include the account "Saved travellers" section (recommended, it is the only way to fix a typo) and
   the spouse picker, or wizard select only?
4. Who applies the migration on the live project, and when (PR 1 must be merged first; the API returns an empty list
   gracefully while the table is missing).

---

## 6. Implementation prompt (ready to paste)

```text
You are working in the EZvisa repository (Next.js 16 website at the root, Expo app in mobile/). Read CLAUDE.md,
docs/APP_WEB_SYNC.md and docs/SAVED_TRAVELLERS_PLAN.md first and follow them. Implement the "saved travellers" feature
described in docs/SAVED_TRAVELLERS_PLAN.md on BOTH the website and the mobile app.

Goal
When a signed-in customer has traveller data saved, the application wizard shows a drop-down ("Who is travelling?") to
pick a saved traveller and fills the traveller fields from it. Travellers are stored in a new public.travellers table
(owner = account email, owner-only RLS), saved automatically when a case becomes paid, backfilled once from the
customer's past paid/submitted applications, and manageable in Account → Saved travellers. The spouse step after payment
offers the same picker. No passport number may ever be written to Supabase Auth user_metadata.

Do it in this order and keep each step green before moving on
1. Contract: add TRAVELLER_RELATIONSHIPS, TRAVELLER_KEYS, Traveller type, normalizePassport, travellerKey,
   travellerFromAnswers, spouseFromAnswers, applyTraveller, travellerLabel, travellerFromRow, travellerToRow to
   lib/shared/wizard-contract.ts (zero imports, pure functions), add travellerId / spouseTravellerId to
   ApplicationNotes, expose travellers in contractJson(), bump CONTRACT_VERSION. Mirror everything 1:1 in
   mobile/lib/wizard.ts. Extend scripts/check-app-sync.mts with fixtures for every new function and list.
   `pnpm sync:check` must pass.
2. Database: write scripts/007_travellers.sql exactly as specified in the plan (table, unique (email, dedupe_key),
   RLS policies on lower(auth.jwt()->>'email'), updated_at trigger) and copy it to mobile/migrations/0015_travellers.sql.
   Update mobile/migrations/functions/delete-account to delete travellers rows for the account email, and the website's
   delete-account path likewise. Do NOT apply the migration yourself; note in the PR that the owner applies it.
3. Server: lib/travellers.ts with rememberTravellersFromApplication(row, ids) and touchTravellerUsed(id) using the
   service client (lib/applications.ts serviceClient). Call it in lib/ziina.ts applyIntentStatus() only on the stored
   transition to paid, and at the end of app/api/continue-application/route.ts. Add app/api/travellers/route.ts
   (GET list + one-time backfill, POST create) and app/api/travellers/[id]/route.ts (PATCH, DELETE). Auth: Supabase
   session cookie or Authorization: Bearer <access token>, the same way app/api/upload-document does it. Scope every
   query to the caller's email. Demo accounts (lib/demo-data.ts) return fixed demo travellers and never write. Rate-limit
   writes (lib/rate-limit.ts), sanitise strings (lib/sanitize.ts), CORS like the other app-facing routes. The API must
   return an empty list (not 500) while the table does not exist yet.
4. Website wizard: in components/apply/nationality-step.tsx add the "Traveller" select (shadcn Select from
   components/ui/select.tsx, semantic tokens, round CountryFlag, "You"/"Spouse" chip, last option "Someone else").
   Load travellers in app/apply/page.tsx once the session is known; run the existing user_metadata prefill only when
   there are none. Preselect on a fresh form (one traveller → it; several → self, else most recently used); never touch a
   resumed draft that already has a name. Picking calls applyTraveller, keeps every field editable, stores travellerId
   in the draft notes (lib/draft-sync.ts columns → applicationColumns extra), shows a "Filled from your saved travellers"
   chip, and applies the traveller's nationality with a one-line note when it differs and is visa-required. Arabic via
   LangText; verify RTL. In app/continue/[id]/continue-form.tsx add the same select above the spouse fields (excluding
   the main applicant's traveller) that fills spouseFirstName, spouseLastName, spouseHasValidPassport and stores
   spouseTravellerId.
5. Website account: add a "Saved travellers" Section to app/account/account-view.tsx (list, add, edit, delete with
   confirm) using the page's existing edit-dialog pattern. No new route (so no header change).
6. App: fetch GET /api/travellers with the session access token (mobile/lib/api.ts) when the wizard opens and when
   Account → Saved travellers opens; keep the list in component state only. Add question id "traveller" (step
   "personal", new QKind "traveller") in mobile/lib/questions.ts right after "destination", applying only when signed in
   and the list is non-empty (module-level setTravellers like setAccountEmail). Render it in
   mobile/components/wizard/QuestionView.tsx: rows with Flag, name, "Country · ••1234", relationship chip, last row
   "Someone else". Tap = applyTraveller + travellerId in the draft + auto-advance to firstUnanswered (as usePrefill does).
   Skip the silent applyProfile prefill when travellers exist; keep PrefillOffer. Add the spouse picker to the spouse name
   question in mobile/app/continue/[id].tsx. Add mobile/app/(tabs)/account/travellers.tsx (ListGroup/ListRow + Sheet
   editor like details.tsx) and its row in account/index.tsx. Add every new string to mobile/lib/ar.ts.
7. Analytics: track traveller_picked { source: "saved" | "new", count } on both platforms. Never log names or passports.
8. Docs: update docs/APP_WEB_SYNC.md (shared-rule table, route table) and CLAUDE.md section 10 with the travellers
   table, API and contract functions; mark docs/SAVED_TRAVELLERS_PLAN.md as implemented.

Rules
- Design: section 4 of CLAUDE.md (Poppins, semantic tokens, no raw bg-white/text-white, no purple, round flags only,
  Lucide icons, responsive at 375/768/1280). Server Components by default; "use client" only where needed.
- Never duplicate a list or rule in a component: import from the contract. Never store personal data in localStorage
  or AsyncStorage. Never put passport numbers in user_metadata.
- Keep the user_metadata and loadProfile fallbacks working when a customer has no travellers.
- Do not break guest checkout, draft resume, the conflict sheet, or the demo accounts.
- Website first, then the app; run `pnpm sync:check`, `pnpm lint`, `pnpm build` and, in mobile/, `npx tsc --noEmit` and
  `npx expo lint` before every commit. A passing build is not proof: walk the manual paths listed in section 5 of the
  plan and say which you exercised.
- Deliver as two PRs (website, then app) unless told otherwise, each with a short description of what was verified and
  the migration the owner must apply.

Acceptance
- Repeat customer signs in on the website, opens /apply: the traveller step shows the select, their own record is
  preselected, every field is editable, Review shows the right name and passport, payment marks the row paid and the
  travellers row is updated, not duplicated.
- Same customer in the app sees "Who is travelling?" after choosing the destination, picks a traveller, lands on the
  first unanswered question, and Review shows the filled answers.
- A customer with no past applications sees no select on either platform and the old prefill still works.
- Spouse picked after payment fills the spouse step on both platforms.
- Account → Saved travellers lists, edits and deletes on both platforms; a deleted traveller disappears from the select.
- `pnpm sync:check` passes; CI app-sync workflow is green.
```
