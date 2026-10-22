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
- **Auth**: see §2g (chat 03). Same Supabase accounts as the website: email + password, magic link, sign-up, forgot password. Email links open the app (`/auth/callback`).
- **Wizard** (`app/apply/*`, `components/wizard/*`, `lib/wizard.ts`): a 1:1 port of web `/apply` (same steps, fields, validation). `lib/form.tsx` autosaves to AsyncStorage (like the website's localStorage). Once signed in **and** the personal step is valid, it also autosaves to `visa_applications` as `application_status='draft'` (debounced 1.5 s) and resumes the latest draft for that email on any device.
- **Submit** (`lib/data.ts submitApplication`): the same draft row becomes `submitted` / `payment_status='pending'` with the website's column mapping. Note: the website's "application.submitted" email is sent only by the web API route, not by this path.
- **Documents** (`lib/data.ts uploadDocument`, `lib/uploads.ts` offline queue): (1) `POST https://www.ezvisa.net/api/upload-document` (multipart `file, applicationId, documentType, uploadId`), exactly like web `/dashboard/upload`. If that route is unavailable, (2) the app uploads directly to bucket `visa_documents` at `<applicationId>/<documentType>_<uploadId>.<ext>` with the user's session and sets the matching `has_*` flag. `uploadId` is the queue job's stable UUID (see 2d). Doc types: `passportCopy, residencyCopy, photo, bankStatement, nocCertificate, salaryCertificate`.
- **Payments** (`lib/payments.ts`, `app/payment/[id].tsx`, chat 08): `POST https://www.ezvisa.net/api/create-payment` with `{applicationId, success_url, cancel_url}` only (no amount: the server prices the row, 249 AED, x2 with spouse). success/cancel = `https://www.ezvisa.net/app-return?r=…&appId=…&to=<ezvisa://payment-return | exp://…>`; Ziina opens in `WebBrowser.openAuthSessionAsync`. The returned `{id, redirect_url, amount}` is kept in AsyncStorage `ezvisa.payments.v1` (reopened for 1 h instead of creating a second payment, kept 7 days for verification). The result screen never trusts URL params: paid/failed come from `visa_applications.payment_status`, `GET /api/check-payment?applicationId=` (needs the server change on branch `claude/blissful-babbage-1u96lk`; returns 400 on today's production, which the app treats as "not available") or `GET /api/check-payment?id=<this device's payment id>`. No price is computed in the app (`PRICE_AED` removed). Tests: `scripts/pay-e2e.cjs`, screenshots `docs/screenshots/chat08/`.
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
- **Performance**: see `docs/PERFORMANCE-CHAT14.md`. Audit M12 fixed (one applications query per focus), Home story thumbnails, expo-image, memoised Flag, FlatList batch settings, quantized PNGs.
- **Tooling**: `npx tsc --noEmit` passes (Deno functions excluded); ESLint = eslint-config-expo 57 (`npx eslint .`, 0 errors, React Compiler rules as warnings); `node scripts/run-test-privacy.mjs` (24 checks); `scripts/bench-web.mjs`.
- **Launch screen**: unchanged config (`expo-splash-screen` plugin: 180 pt mark, #FFFFFF / #000000, light + dark images). In Expo Go the native launch screen is Expo Go's own; the app's boot overlay (`components/Boot.tsx`) then shows the same mark. The real native launch screen appears only in a development/production build.
## 2g. Auth and session (chat 03, 2026-10-22)
- **Website methods (verified in web code):** `app/login` (password + "Email Magic Link"), `app/signup`, `app/forgot-password`, `app/reset-password`. No Apple or Google button on the website, so the app adds neither. The existing Google/Apple code stays dormant: it shows only if the provider is enabled on the project (`/auth/v1/settings`).
- **Session storage:** `lib/secureStorage.ts` (expo-secure-store ~57.0.4, Keychain `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`). Values are chunked to ≤1800 bytes with a generation header written last (a crash mid-write keeps the old session). A session left in AsyncStorage by older builds moves over on first read and is deleted there. A Keychain session left by a previous install is forgotten on first launch. Web uses localStorage (testing only). Auto refresh starts and stops with AppState (`lib/supabase.ts`).
- **Session checks** (`lib/auth.tsx`): on launch and on foreground (at most once a minute) the app calls `getUser()`. If the server rejects the session (user deleted, session revoked, password changed elsewhere), it refreshes once, then signs out locally with "Your session ended. Please sign in again." Offline and 5xx errors never sign out. `session_not_found` is cleared by supabase-js itself, since a revoked session can't be refreshed.
- **Sign out** is local scope (the website stays signed in) and works offline. It also unregisters the push token and runs `lib/userData.ts clearUserData()`: the upload queue and its file copies (`clearQueue`), drafts, discarded ids, inbox read state, push token, reminders, passport expiry, crash report and trip plans. Device preferences (appearance, language, Face ID lock, usage-data choice) and anonymous diagnostics stay. The wizard state in memory resets through `epoch`. A session that ends on its own (expired or revoked) wipes the same data.
- **Screens** (`app/auth/*`): `index` (sign in / create account), `magic-link`, `forgot`, `callback` (code exchange; errors for expired/used link, link opened on another phone, offline), `reset` (new password). Shared parts are in `components/auth/AuthShell.tsx`. Messages are in `lib/authErrors.ts` (Arabic in `lib/ar.ts`). Double taps are guarded by a ref. Resend waits 60 s.
- **Route protection** (`app/_layout.tsx`, `Stack.Protected`): signed out → `welcome` (Sign in / Create account / Continue without an account). Signed in or guest → the app. `/auth/*` and `/payment-return` are always reachable. The splash (`components/Boot.tsx`) stays until the session is known, so no wrong screen flashes. Guest mode lives only in memory: every cold start without a session shows Welcome. A Ziina return on a cold start continues as guest.
- **Deep links:** `authRedirect()` in `lib/authLinks.ts` gives `ezvisa://auth/callback?type=signup|magiclink|recovery` in a build and `exp://<host>/--/auth/callback?...` in Expo Go. **These must be on the Supabase redirect allow list (not done, needs the owner).** Otherwise Supabase sends people to the Site URL, which is still `http://localhost:3000`. PKCE: only the phone that asked for a link can use it.
- **Tests:** `node scripts/secure-storage-test.cjs` (12 checks). `scripts/auth-e2e-web.mjs` (29 checks, mocked Supabase, needs `npx expo start --web`). Screenshots are in `docs/screenshots/chat03-auth/`.
- **Dev note:** `CI=1 npx expo start` doesn't watch files. Restart it after edits, or the web build serves stale code.

## 2f. v11 Home dashboard and timeline (2026-10-22, chat 11)
- **Home** (`app/(tabs)/(home)/index.tsx`): hero = most recent active application (destination, trip dates, status,
  5-segment progress), else the newest draft (`Continue draft`), else the latest finished case; the rest under
  "Other applications". One next action (`lib/nextAction.ts`). Appointment card under the hero only when staff entered one.
  Skeleton while loading, error card with Try again, empty state, pull to refresh.
- **Timeline** (`lib/timeline.ts`, `Timeline` in `components/ui/data.tsx`, also on the application page):
  Submitted, Paid, Documents, Appointment, Decision. Data sources (live `visa_applications`, verified from the code + types):
  | Step | Done when | Time shown |
  |---|---|---|
  | Submitted | status is not draft (cancelled only with evidence) | `additional_notes.submittedAt` (new, written at submit) or `created_at` for website rows; none for older app rows |
  | Paid | `payment_status` paid/completed (Ziina webhook); refunded shows "Refunded" | none: no paid-at column |
  | Documents | every mandatory customer document in and none rejected, or status ready/approved/completed | latest `additional_notes.uploads[].at` |
  | Appointment | `appointment_at` set (migrations/0003) | the appointment time |
  | Decision | status `completed` (granted) / `rejected` (refused) / `cancelled` | none: no decision time column |
  `updated_at` is never used as a step time. The website admin can only set submitted/reviewing/ready/cancelled, so
  "Visa granted/refused" appear only if staff set `completed`/`rejected` some other way.
- **Live updates** (`lib/useApps.ts`, `useApps(true, true)` on Home): reload on focus, on app foreground, on pull to refresh,
  and on Supabase Realtime `postgres_changes` for `visa_applications` filtered `email=eq.<own email>`. Realtime delivers
  nothing until `migrations/0009` (waiting for approval) adds the table to `supabase_realtime`.
- **Calendar** (`lib/appointment.ts`): `expo-calendar/legacy` `createEventInCalendarAsync` (SDK 57.0.6). iOS 17+ shows the
  system sheet without permission; older iOS requests access and explains a denial (Open Settings).
- **Checks**: `bun scripts/run-check.ts scripts/timeline-check.ts` (34 checks, live row shape, no network).
  `npm run lint` (eslint-config-expo 57) and `npx tsc --noEmit` pass. Screenshots: `docs/screenshots/v11/` (fixture rows
  in a Playwright harness against a fake Supabase host, not production data).
## 2h. Drafts & autosave (chat 06, 2026-10-22)
- **One row per application** in `visa_applications` (`application_status='draft'`), shared by the app and the website. No new columns: the answers live in `additional_notes.wizard`, the position in `wizardStep` (+ `wizardQuestion` in the app), `lastEditedOn` = `app` | `website`.
- **Version = `updated_at`** (there is no version column). Every write is `update … where id = … and updated_at = <last confirmed>` and the new value is read back from the server, never compared with a device clock. 0 rows means the copy changed elsewhere → `conflict`, autosave pauses, the user chooses (*Load newer version* / *Keep this version*). Nothing is overwritten without that choice. Content fingerprints recognise our own writes (e.g. a reply lost after the insert landed), so they don't cause false prompts.
- **Ids are made on the device** (`expo-crypto` / `crypto.randomUUID`) and stored before the first insert, so a save cut off by a kill retries into the same row. Before the first insert the app looks for an open draft of the same destination and offers it (*Continue it* / *Start a separate one*).
- **App** (`lib/form.tsx`, `lib/data.ts` `saveDraft/getDraft/findOpenDraft/submitApplication`, `components/wizard/sync.tsx`): debounce 800 ms + immediate save when the question changes; saves on background, checks for a newer copy on launch / foreground / draft open; NetInfo + web `online` events flush on reconnect; retries with backoff (`lib/uploads.ts backoffMs`). Indicator: *Saving… / Saved* (server-confirmed only) / *Saved on this phone* (signed out or nothing answered) / *Not saved · Offline | Retrying | Tap to retry*. Saved to the account once signed in and the first question is answered. Local drafts carry `owner` (email): another account on the same phone never sees or syncs them. Sign-out (which wipes the phone, section 2g) tries to save first and warns if answers would be lost. Home opens a server draft from another device in the wizard (`openServerDraft`). Submit only goes ahead after the server confirmed the exact answers, and is version-checked.
- **Website** (branch `claude/nice-faraday-r722ry`, based on `main`, NOT on mobile-app): `lib/draft-sync.ts` (same rules), `components/apply/draft-status.tsx`, `/apply` wiring, `/api/submit-application` turns the signed-in user's draft row into the application (token-verified, version-checked, idempotent) instead of inserting a second row, Supabase browser/server clients also read `NEXT_PUBLIC_ezvisaSUPABASE_*`.
- **Tests (no live DB):** `scripts/mock-supabase.mjs` (REST + Auth stand-in with updated_at trigger, RLS by email, 23505), `scripts/e2e-drafts-web.mjs` (17 checks, app web build), `scripts/e2e-drafts-cross.mjs` (10 checks, website ↔ app). Screenshots: `docs/screenshots/drafts/`. Read-only SQL checks + optional trigger: `migrations/0010_draft_autosave_checks.sql` (not applied).

## 2f. Chat 09: document checklist and uploads (2026-10-22)
- **Checklist** (`lib/data.ts` `REQS` + `lib/checklist.ts`): unchanged rules. Shown only when `payment_status` is paid/completed (from the DB); NOC hidden unless `employmentStatus` is `employed`; states from `additional_notes.uploads`, `has_*` flags and staff `document_reviews` (uploaded · under review · approved · rejected + reason). Rows and alerts are now translated (Arabic).
- **No made-up dossier** (audit H4): EZvisa's own items show Ready only from `application_status = 'ready'`, with nothing to open.
- **Upload rules in the app**: only the website's doc types (`DOC_FLAG` keys) and PDF/JPG/PNG; refused before queueing. `uploadDocument` re-reads the row and refuses unpaid cases or cases outside `UPLOAD_STATUSES` (draft, submitted, reviewing, awaiting_documents).
- **Authenticated upload** (audit B2): the app sends `Authorization: Bearer <access token>` to `/api/upload-document`. The route on this branch (`app/api/upload-document/route.ts`) now requires it for application-id uploads, checks the case's email = the user's email and that it is paid, allow-lists `documentType`, and takes the extension from the checked content type. Tracking-token uploads (website) unchanged. **Not deployed: needs a PR to `main`.**
- **Progress**: website uploads go through XHR; real byte progress per job (memory only, 5% steps); bar fills with a percentage, sweep until the first bytes.
- **Viewing**: `openDocumentUrl` = Storage signed URL, 60 s, opened in the in-app browser. Works only after `migrations/0009` (own-folder read policy) is applied; until then Storage refuses and the "Stored securely" message stays.
- **Replace / delete**: same as the website: no delete; a rejected or missing item can be uploaded again; approved/under review items only open.
- **Live status**: the detail screen reloads every 30 s while visible and on return to the foreground; background reloads keep the last data if they fail. Realtime would need the table in the realtime publication (DB change, not proposed yet).
- **Proposed, not applied**: `migrations/0009_document_storage_policies.sql` (+ `0009_check_document_access.sql`, a rolled-back two-user check).
- Tests: `node scripts/run-upload-tests.mjs` (24 checks, incl. type allow-list). Screenshots: `docs/screenshots/chat09/` (Expo web with intercepted fixtures, 390/430, light/dark, Arabic).

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
3. Customer document viewing: signed URLs are in the app (chat 09); needs `migrations/0009` applied.
4. Push notifications need a `push_tokens` table (optional block 5) and a sender.
5. Supabase Auth URL configuration (owner): add the app redirect URLs from §2g and set the Site URL to https://www.ezvisa.net. Google sign-in additionally needs the provider enabled (not used by the website today).
6. Development build (`eas build --profile development`) for push and native testing; App Store / Play listings.
