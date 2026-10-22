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
- **Documents** (`lib/data.ts uploadDocument`, `lib/uploads.ts` offline queue): (1) `POST https://www.ezvisa.net/api/upload-document` (multipart `file, applicationId, documentType, uploadId`), exactly like web `/dashboard/upload`. If that route is unavailable, (2) the app uploads directly to bucket `visa_documents` at `<applicationId>/<documentType>_<uploadId>.<ext>` with the user's session and sets the matching `has_*` flag. `uploadId` is the queue job's stable UUID (see 2d). Doc types: `passportCopy, residencyCopy, photo, bankStatement, nocCertificate, salaryCertificate`.
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

## 2d. v10 scanner + offline upload queue (2026-10-22, chat 10)
- **Flow**: document row → source sheet (Take photo · Scan pages (PDF) · Choose photo · Choose file) → `validateFile` (wrong types rejected on the detail screen) → **preview** `app/upload/[id].tsx` (full-screen modal) → Upload → `enqueueUpload`.
- **Photos** (`lib/capture.ts`): camera/library via expo-image-picker at full quality; the preview decodes once with expo-image-manipulator (HEIC/WebP → JPEG working copy, orientation baked in); draggable crop box `components/CropBox.tsx` (corners + move, min 15 %, LTR maths in RTL too) and Rotate 90°. `prepareImage` = crop → JPEG, long edge 2400/2000/1600 × quality 0.85/0.75/0.65 until ≤ 2.5 MB (`TARGET_BYTES`; bucket limit 5 MB, Vercel request limit 4.5 MB). Low-resolution note when the crop's short side < 1000 px.
- **PDFs**: expo-document-picker; `%PDF-` header check; > 5 MB rejected with "scan with the camera instead". iOS preview in WKWebView (react-native-webview); Android/web show a file card. Multi-page scan: each page resized to 1800 px / q 0.6 before expo-print.
- **Permissions** (`ensureCamera`): reason alert before the first system prompt; no nagging right after a "Don't Allow"; on the next try an "Open Settings" alert (`Linking.openSettings`). In Expo Go the camera permission belongs to Expo Go, so Settings opens Expo Go's page. Photo library uses the iOS picker (no permission needed).
- **Queue** (`lib/uploads.ts`): states `queued` (with `offline` / `nextAt` backoff sub-state) → `uploading` → `done` | `failed`. Saved in AsyncStorage + a private copy of the file in `Paths.document/uploads`; a killed app restores `uploading` → `queued` (`restore()`). Offline = NetInfo `isConnected === false` or `isInternetReachable === false`; back online retries at once; 90 s timeout per request; 6 attempts while online, then `failed` (Retry/Remove). Done rows stay 24 h (Clear). **Sign-out (and account deletion) empties the queue and deletes the copies**; orphan copies are deleted on start.
- **No duplicates**: each job's UUID is the object name, so a retry (lost response, airplane mode, app killed) writes the same object; storage "already exists" = success; `additional_notes.uploads` is not appended twice; the same file (MD5) for the same document can't be queued twice. The website route accepts `uploadId` too (`app/api/upload-document/route.ts`, UUID only) but only after it is deployed from `main`.
- **Tests**: `ESBUILD=… node scripts/run-upload-tests.mjs` (23 checks: types, crop maths, offline, mid-upload loss, duplicate, kill + restart in a new process, sign-out wipe). Screenshots + web checks: `docs/screenshots/v10/` (Playwright on Expo web with intercepted test fixtures; script kept outside the repo).
- **Not in Expo Go (not installed)**: edge-detecting document scanners (VisionKit `VNDocumentCameraViewController`, `react-native-document-scanner-plugin`, ML Kit) need a development build; ask before adding.

## 2e. Chat 14: analytics, crashes, performance (2026-10-22)
- **Events** (`lib/analytics.ts`): typed catalogue + runtime allowlist (ids, enums, numbers, booleans; no free text). Wizard step viewed/completed, wizard finished (`wizard_submit`), payment started/finished (outcome from the DB-verified result screen), upload done (doc type + ok), app_start (ms). Offline outbox in AsyncStorage, one batched insert per flush, retried on reconnect/foreground.
  Sent to `public.wizard_events` (0004, live): only `wizard_open/page/submit/close` today. The other events stay on the phone until **`migrations/0008_wizard_events_funnel.sql` (PROPOSED, not applied)** is approved; then add them to `SERVER_EVENTS`.
- **Crash capture** (`lib/crash.ts` + `lib/scrub.ts`): reports are scrubbed before they are stored (patterns + the exact names/passport/email typed in the wizard). `setCrashSink()` is the hook for a crash service (Sentry proposed, **not added**, waiting for approval and a DSN).
- **Opt-out** (`lib/privacy.ts`, Account › Privacy "Share usage data", on by default): off = no events, no crash reports leave the phone, queued data deleted.
- **Diagnostics**: Account › Privacy › long-press "Version" = last 5 cold-start times, queued events, last scrubbed error.
- **Performance**: see `docs/PERFORMANCE-CHAT14.md`. Home story thumbnails, expo-image, memoised Flag, FlatList batch settings, quantized PNGs.
- **Tooling**: `npx tsc --noEmit` passes (Deno functions excluded); ESLint = eslint-config-expo 57 (`npx eslint .`, 0 errors, React Compiler rules as warnings); `node scripts/run-test-privacy.mjs` (24 checks); `scripts/bench-web.mjs`.
- **Launch screen**: unchanged config (`expo-splash-screen` plugin: 180 pt mark, #FFFFFF / #000000, light + dark images). In Expo Go the native launch screen is Expo Go's own; the app's boot overlay (`components/Boot.tsx`) then shows the same mark. The real native launch screen appears only in a development/production build.

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
