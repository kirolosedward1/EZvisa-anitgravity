# EZvisa mobile app: handoff

Expo SDK 57 · expo-router · TypeScript · iOS / Android (web works for testing).
This lives in `mobile/` of the website repo `kirolosedward1/EZvisa-anitgravity`, on the branch `mobile-app`.
**Never merge to `main` without review.** Vercel builds `main`.

## 1. What the app talks to

| Thing | Value |
|---|---|
| Website / official domain | **https://www.ezvisa.net**. It is the only base URL the app uses (`lib/config.ts` → `SITE_URL`, `siteUrl()`). The env override `EXPO_PUBLIC_SITE_URL` is accepted only if it is ezvisa.net. No localhost or vercel.app anywhere. |
| Database | Supabase project **ezvisa-uae**, ref **`dravvaykssrbktztmrlj`** (`https://dravvaykssrbktztmrlj.supabase.co`). This is the website's DB: the web repo code (`visa_applications`, `blog_posts`) matches it, and it holds the website's 19 submissions from Feb to Jun 2026. |
| Key | Only the **publishable/anon** key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`). **Never** put a service-role or secret key in the app. |
| Old DB | `rjbgteqgqaxalcfnksjc` (a new schema in `/db`, separate repo/workspace) is **not** used by the website and **not** used by the app any more. |

### Tables used (live DB)
- `public.visa_applications`: one row per case. The app uses the same columns and values as web `app/api/submit-application/route.ts`:
  `full_name, email, phone, nationality, destination_country, date_of_birth, entry_date, exit_date, travel_purpose, passport_number, duration_days, has_passport/has_photos/has_bank_statements/has_employment_proof, payment_status ('pending'|'paid'|…), application_status, payment_id, payment_amount, additional_notes (JSON text)`.
  - `application_status`: website/admin uses `submitted → reviewing → ready | cancelled`. The app adds **`draft`** for server-saved, unsubmitted drafts.
  - `additional_notes` JSON: the website's keys (`maritalStatus, employmentStatus, jobTitle, companyName, monthlySalary, spouseAccompanying`) plus the app's keys (`source:"mobile-app", platform, wizardStep, wizard:{full form}, uploads:[{type,path,name,at}], contactEmail?`).
  - Ownership = `email` equals the signed-in user's email (the same query the website dashboard runs). There is no `user_id` column and **no `tracking_token` column** (the web code expects one, see the proposed SQL). The reference shown is `EZ-` + the first 8 hex characters of the id.
- Storage: the live project has a private bucket `visa-documents` (hyphen) with **service-role-only** policies. The website code uses `visa_documents` (underscore), which does not exist. See below.
- No requirements, notifications or push_tokens tables exist live. The app uses a static checklist (`lib/data.ts` `REQS`, the same doc types as the website upload page), an inbox derived from application rows, and a push token kept on the device.

## 2. Flows (code map)
- **Auth** (`components/AuthForm.tsx`, `lib/auth.tsx`, `lib/supabase.ts`): email + password on the live project (`signUp` / `signInWithPassword`). Confirmation and reset emails redirect to `https://www.ezvisa.net/auth/callback…`, as the website does; the user then signs in in the app. **Google** is hidden automatically while the provider is disabled on the live project (`googleEnabled()` reads `/auth/v1/settings`). The magic-link button was removed because a website redirect cannot sign in the app.
- **Wizard** (`app/apply/*`, `components/wizard/*`, `lib/wizard.ts`): a 1:1 port of web `/apply` (same steps, fields, validation). `lib/form.tsx` autosaves to AsyncStorage (like the website's localStorage). Once signed in **and** the personal step is valid, it also autosaves to `visa_applications` as `application_status='draft'` (debounced 1.5 s) and resumes the latest draft for that email on any device.
- **Submit** (`lib/data.ts submitApplication`): the same draft row becomes `submitted` / `payment_status='pending'` with the website's column mapping. Note: the website's "application.submitted" email is sent only by the web API route, not by this path.
- **Documents** (`lib/data.ts uploadDocument`, `lib/uploads.ts` offline queue): (1) `POST https://www.ezvisa.net/api/upload-document` (multipart `file, applicationId, documentType`), exactly like web `/dashboard/upload`. If that route is unavailable, (2) the app uploads directly to bucket `visa_documents` at `<applicationId>/<documentType>_<rand8>.<ext>` (the website's path scheme) with the user's session and sets the matching `has_*` flag. Doc types: `passportCopy, residencyCopy, photo, bankStatement, nocCertificate, salaryCertificate`.
- **Payments** (`lib/api.ts startPayment/checkPayment`): `POST https://www.ezvisa.net/api/create-payment` with `{applicationId, amount: 249 AED (×2 with spouse), currency:'AED', success_url: https://www.ezvisa.net/payment-success?appId&dest, cancel_url: …/payment-failed, test:false}`. The `redirect_url` (Ziina) opens in the in-app browser, and the status comes from `GET /api/check-payment?id=`. The Ziina webhook (website) sets `payment_status`. If the route fails, the app offers WhatsApp.
- **Dashboard / status** (`app/(tabs)/applications/*`, `app/(tabs)/(home)`): `select * from visa_applications where email = <me>`, mapped by `toApplication()` into the UI's shape.

## 2b. v8 additions (2026-10-19)
- **Wizard**: one question per screen (`lib/questions.ts`, `app/apply/index.tsx`, `components/wizard/answers.tsx`). Same fields, labels, options, order and validation as web `lib/wizard.ts`. Auto-advance + haptics, searchable country lists, native dates, skip logic, grouped progress, Reanimated transitions, autosave (local + DB draft) with resume at the exact question, Review with edit-and-return, idempotent double-submit-safe submit.
- **Loading**: `components/Boot.tsx`. The splash is held until session, fonts, i18n, appearance and draft have loaded, then fades out (280 ms).
- **Trip plan**: `lib/itinerary.ts` + `app/trip/[id].tsx`. Optional questions (cities, budget, who, interests) produce a deterministic plan labelled "Ideas, not bookings" with no venues, prices or hours. Days and items are editable; PDF via expo-print + expo-sharing. It is saved locally and in `additional_notes.itinerary` while the row is draft/submitted (RLS blocks it later; the UI says "saved on this phone"). AI version + `trip_plans` table: `db/proposed-itinerary-ai.md` (not deployed).
- **Extras**:
  - status timeline with real timestamps only; Home next action + countdown chip
  - Quick facts for the 29 Schengen countries (`lib/facts.ts`, sources in the file)
  - capture quality checks (`lib/capture.ts`)
  - Face ID lock (`lib/lock.tsx`)
  - local passport-expiry reminder (Account)
  - Sign in with Apple (`lib/apple.ts`), hidden while the provider is disabled. In Expo Go the token audience is `host.exp.Exponent`, so add it to the Apple client IDs for testing.
  - EN/AR with RTL (`lib/i18n.tsx`, `lib/ar.ts`, switch in Account)
- **Native build only (not faked)**: home-screen widget, push for status changes (plan in `db/proposed-itinerary-ai.md` §3), MRZ reading, edge-detect document scanning.
- Tests:
  - `scripts/run-e2e-v8.mjs`: live data layer, no new rows
  - `scripts/plan-v82.ts`: deterministic plan/PDF
  - Playwright scripts in /tmp/shot (v8.js wizard, v82.js trip/detail/account)
  - screenshots in `screenshots/v8/`

## 2c. v9 design system and polish (2026-10-19)
- Tokens live in `lib/theme.ts`; screens must not hand-code numbers.
  - Spacing: `S` = 0/4/8/12/16/20/24/32/40/48/64/80.
  - Radius: `R` = 4/8/12/16/20/24/32/round.
  - Elevation: `elevation(0-3)`, plus `card()` = background + hairline + layered boxShadow (light mode only).
  - Type: `T` + `TYPE_SCALE` (Dynamic Type caps per role).
  - Colour: one accent `accent`/`accentFill` + neutrals + status colours.
  - Motion: `DUR`, `SPRING`, `PRESS`.
- Motion helpers are in `lib/motion.ts`: spring slides, Reduce Motion fallbacks, `useShake`.
- Primitives:
  - `PressScale`: scale 0.97 + dim, used by every tappable.
  - `Shake`, `SavedCheck`, shimmer `Skeleton`, animated `ProgressSegments`.
- Nationality (v8.3): `SCHENGEN_VISA_REQUIRED` in `lib/wizard.ts` (Reg. (EU) 2018/1806 Annex I). No free text.
- Performance: long lists stay FlatList (country pickers, nationality list) with flat E0 rows (no shadow/blur). Shadows only on short card stacks (Home hero, application cards, trip days) and the floating tab bar.

## 2d. v9.14 validation and trip dates (2026-10-22, chat 05)
- **One validation module**: `lib/wizard.ts` (`validatePersonal/Trip/Spouse/Employment`, `validateStep`). Question screens, Review, cloud-autosave gating and submit all use it. The date maths is in `lib/dates.ts`: pure `YYYY-MM-DD`, no `new Date("YYYY-MM-DD")`. Every rule takes an optional `today`.
- **Shared schema with the website: not done.** zod is installed on the website but no file imports it, and the app has no zod. The website's rules sit inline in `components/apply/*-step.tsx` and `app/api/submit-application/route.ts`. Sharing them would mean extracting a package and pointing Metro `watchFolders` at the web repo, which is website work.
- **Rules**:

  | Rule | Detail | Source |
  |---|---|---|
  | Required fields | as before | website |
  | Passport number | required only, uppercased; no format | website |
  | Departure | at least today + 15, which also rules out past dates | web client |
  | Return | after departure; same day rejected | web server |
  | Trip length | at most 90 days; same formula as the server | web server |
  | Passport expiry | at least return + 3 calendar months, clamped to month end (30 Nov → 28/29 Feb); exactly 3 months passes; today + 3 months while no return date | owner's spec |
  | Re-check | changing the return date re-checks the passport expiry on both the dates screen and the passport question | |
  | Age | 18+ | web client |
- **Errors**:
  - shown inline in short text once the field has a value and typing has paused (700 ms), never on first view
  - Continue stays disabled while the question is invalid
  - new strings are in `lib/ar.ts`
- **Date-range picker** (`components/wizard/DateRangePicker.tsx`, question `travelDates`): replaces the two date screens. Old drafts on `q:travelStartDate` / `q:travelEndDate` resume on it.
  - Built in pure React Native, with no library. `react-native-calendars` declares no React or RN peer range and pulls in lodash, xdate and recyclerlistview, so it isn't verified for RN 0.86 / React 19.2. This version works in Expo Go.
  - Layout: Departure and Return tiles; presets 1 / 2 / 3 weeks and 1 calendar month; month grid sized to width ÷ 7, so cells are 50 pt at 390 and 55 pt at 430.
  - Behaviour: RTL-aware; days before the minimum are disabled. If the passport no longer covers the return date, a "Change passport expiry" shortcut appears.
- **Locale**: `lib/locale.ts` (expo-localization) sets display order, month names and the first weekday. Stored values stay `YYYY-MM-DD`, as on the website.
- **Tests**: `npm test` runs `scripts/validation.test.ts` (node:test, no new packages) in Asia/Dubai, UTC and America/Los_Angeles: 18 tests.
- **Screenshots**: `docs/screenshots/v914/` (390 and 430, light and dark, Expo web, TZ Asia/Dubai, locale en-AE).
- **Website mismatches, owner to decide** (the app keeps the rule shown):
  1. The web server checks only return > departure and ≤ 90 days. The required fields and departure ≥ today + 15 are client-only, and the 15-day minimum is enforced only by the date picker, not by `isFormValid`.
  2. The website says "6 months validity from your travel date" (text only, no field). The app uses return + 3 months.
  3. The web client computes its departure minimum and date-of-birth maximum with `toISOString()` (UTC). Between 00:00 and 03:59 UAE time, both are one day earlier than intended. The app uses the phone's local date.
  4. On a 29 Feb "today", the web allows a birth date of 1 March 18 years earlier; the app allows up to 28 Feb.
  5. The web error banner says "8-15 digits" for phones, but the web check (and the app) accepts 7-15.
- Note: cloud autosave (lib/form.tsx) runs only while the personal step is valid. A return date that the passport no longer covers pauses it until fixed. Local autosave continues.

## 3. Status on 2026-10-19 (verified against the live DB, `scripts/e2e-live.mjs`)
Working: sign-up and confirm, sign-in, draft create, autosave, resume from DB, submit, list by email.
Not working, because of server config outside the app:
1. `www.ezvisa.net/api/upload-document` → 500 "Storage not configured", and `/api/create-payment` → 500 "Payment service configuration error". The Vercel project serving the domain has **no `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` and no `ZIINA_API_KEY`**. Its browser bundle also has no `NEXT_PUBLIC_SUPABASE_URL` (it falls back to `placeholder-project.supabase.co`), so website login/signup cannot work. That is why the live DB had 0 auth users and no submissions since June.
2. Direct upload: bucket `visa_documents` missing; `visa-documents` rejects non-service-role uploads (RLS).
3. Supabase Auth Site URL is `http://localhost:3000`, and ezvisa.net is not in the redirect allowlist, so confirmation links land on localhost.
Fixes: `db/proposed-live-changes.sql` (bucket + own-folder storage policies, `tracking_token`/`preferred_language` columns, **RLS security fix**: today any signed-in user can read and update every application) plus the env/dashboard items listed at its end. **None of this has been applied. It needs the owner's approval.**

### EAS Update status (important)
- Published to `preview`: update group `e866e894-4bdb-4c7a-9c6b-4147bf546652` (runtime exposdk:57.0.0). **That bundle still points at the OLD DB `rjbgteqgqaxalcfnksjc`**: `--environment preview` loaded the EAS "preview" env vars (`EXPO_PUBLIC_SUPABASE_URL/ANON_KEY/WEB_URL`, still the old values), and a stale Metro cache was involved too.
- A verified local export (`npx expo export --clear`; the bundle contains `dravvaykssrbktztmrlj` and `https://www.ezvisa.net`, not `rjbgte`) has **not** been published yet. To fix: update the EAS preview env vars to the `.env` values (and delete `EXPO_PUBLIC_WEB_URL`), then
  `npx expo export --clear --platform ios --platform android --output-dir dist && npx eas-cli@latest update --branch preview --environment preview --skip-bundler --input-dir dist --platform all`.
  Before publishing, grep the `.hbc` for `dravvaykssrbktztmrlj`.

## 4. Run / build
```bash
cp .env.example .env      # fill EXPO_PUBLIC_SUPABASE_ANON_KEY with the publishable key of dravvaykssrbktztmrlj
npm install
npx expo start            # Expo Go / web
npx tsc --noEmit && npx expo-doctor
TEST_EMAIL=you+ezvisa-app-test@gmail.com TEST_PASSWORD=… node scripts/e2e-live.mjs   # live check (creates/reuses ONE row)
```
EAS: project `@kirolosedward1/ezvisa` (projectId in app.json), runtime `exposdk:57.0.0` (policy sdkVersion), updates at u.expo.dev. Publish with
`EXPO_TOKEN=… npx eas-cli@latest update --branch preview --environment preview --platform all`.
The token is not in the repo. EAS environment variables (preview) must hold the same `EXPO_PUBLIC_*` values as `.env`.

## 5. Constraints (keep these)
- Never use or commit a service-role/secret key; the app uses the publishable key only. `.env` and `.expo-token` are git-ignored.
- **No schema, RLS or storage changes on the live DB (`dravvaykssrbktztmrlj`) without explicit owner approval.** Write proposals to `db/proposed-live-changes.sql`.
- Don't touch the other Supabase projects on that account (BrokersConnect/brokerconnect, brokerscareers, openmatsae, topsuite_tracker, supabase-*).
- Don't push to `main` or change Vercel settings from this work; use the `mobile-app` branch and PRs.
- Keep test data minimal and labelled (`+ezvisa-app-test` emails).

## 6. Next tasks
1. Owner: set the Vercel env vars (Supabase URL/anon/service role, Ziina key and webhook secret), fix the Supabase Auth URL config, approve `proposed-live-changes.sql`. Then re-run `scripts/e2e-live.mjs`: upload, payment and `payment_id` should pass.
2. Send the "application submitted" email for app submissions (e.g. a small authenticated web route that sends it for an existing row id, or a DB webhook).
3. Customer document viewing: needs the storage select policy (block 2) and signed URLs in `openDocumentUrl`.
4. Push notifications need a `push_tokens` table (optional block 5) and a sender.
5. Google sign-in: enable the provider and add `ezvisa://**` to the redirect URLs; the button then appears automatically.
6. Development build (`eas build --profile development`) for push and native testing; App Store / Play listings.
