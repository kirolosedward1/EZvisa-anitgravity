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

## 2d. Chat 13: profile, settings, Arabic, security (2026-10-22)
- **Language** (`lib/i18n.tsx`): first launch uses the phone language (`expo-localization` `getLocales()`); the Account choice wins after that. If the RTL direction doesn't match, the app reloads once while the splash is still up (a flag stops reload loops). The English-keyed layer was kept instead of i18next (about 790 strings are keyed by their English text; no plurals or namespaces yet).
- **RTL**: directional icons (chevrons, arrows, sign-out, open-external) are mirrored once in `Icon` (`components/ui/core.tsx`, `DIRECTIONAL`), and the per-screen `scaleX` wrappers were removed. The tab-bar lens sits in a `direction: "ltr"` layer, because RN swaps `left` under RTL while slot x values are physical. Latin runs in Arabic text (references, emails, amounts) go through `ltr()` (Unicode LRI…PDI).
  If a chevron points the wrong way on a device, check whether an Arabic `.lproj`/`locales` entry was added to app.json: then UIKit is RTL too, SF Symbols flip on their own, and `DIRECTIONAL` must skip iOS.
- **Lock** (`lib/lock.tsx`): Face ID / Touch ID / fingerprint, with the device passcode as fallback. Phones with only a passcode can turn it on. Nothing personal is drawn until the lock state is known. An opaque cover hides the screen in the app switcher while the lock is on. If biometrics and passcode were both removed, the lock screen offers Sign out (then sign in with the password). It cannot detect "a new face/finger was enrolled" in Expo Go (iOS `evaluatedPolicyDomainState` isn't exposed), see open issues.
- **Receipts** (Account): built from the Ziina payment intent (`GET /api/check-payment`) when Ziina says completed; otherwise from the `payment_amount` the Ziina webhook stored. With neither, no receipt is made and the user is offered WhatsApp. The receipt is in the current language, without a computed price or a tax/VAT claim.
- **Support**: every WhatsApp hand-off names the application as `EZ-XXXXXXXX (ID <uuid>)` (`appTag` in `lib/api.ts`), and never includes passport or personal data.
- **Deletion**: before calling `delete-account`, the app asks Ziina about every unpaid application that has a `payment_id`, and refuses while a payment may still complete (or, if Ziina can't be reached, when the link is < 2 h old). After a successful deletion it wipes local data (`lib/account.ts`: drafts, upload queue, reminders, lock, read state) and restarts the JS. Proposed server v2: `db/proposed-delete-account-v2.ts` (**not deployed**, needs approval).
- Notifications screen and the derived inbox items are translated (`Notification.title` is now an English key + `place`/`reference`).
- `tsconfig.json` excludes `migrations/functions` and `db` (Deno code), so `npx tsc --noEmit` is clean.
- Screenshots (web build, signed out): `docs/screenshots/chat13/`.

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
