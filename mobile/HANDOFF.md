# EZvisa mobile app: handoff

Expo SDK 57 · expo-router · TypeScript · iOS / Android (web works for testing).
This lives in `mobile/` of the website repo `kirolosedward1/EZvisa-anitgravity`. App work lands on `mobile-app` (every push
there publishes to Expo Go); it reaches `main` (Vercel production) through reviewed PRs.

## 0. Current status (2026-10-23, status audit): the single source of truth
**Read this first. Where anything below §0, in `docs/qa-report.md`, `docs/mobile-audit.md` (repo root) or a migration header
disagrees with §0, §0 wins.** Older notes that §0 overrides are marked *Superseded (§0)*. Evidence, commands and the branch
table: `docs/mobile-audit.md` §14. Re-check before relying on anything marked UNVERIFIED.

### 0.1 What is live
| Surface | State | How it was checked |
|---|---|---|
| Website www.ezvisa.net | Vercel project `e-zvisa-anitgravity`, Production = `main` **`7be29de`** (PR #30), READY | Vercel API (deployments, domains) |
| Website routes | `/api/check-payment?applicationId=` is live (unknown id → 404 "Application not found", not the old 400); `/app-return` serves; upload route needs the session + own paid case (B2); webhook checks the HMAC when `ZIINA_WEBHOOK_SECRET` is set; create-payment prices on the server and reuses an open intent | live GET via Vercel + code on `main` |
| Website env (Production, names only) | `NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY`, `NEXT_PUBLIC_ezvisaSUPABASE_URL/_ANON_KEY/_PUBLISHABLE_KEY`, `SUPABASE_URL/_ANON_KEY/_PUBLISHABLE_KEY/_SECRET_KEY/_SERVICE_ROLE_KEY/_JWT_SECRET`, `ZIINA_API_KEY`, `ZIINA_WEBHOOK_SECRET`, `ZIINA_TEST_MODE`, `HUBSPOT_*`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `KV_*`, `REDIS_URL`, `POSTGRES_*`, `CRON_SECRET` | Vercel API. **Values not read**: which Supabase project the URLs point at and the value of `ZIINA_TEST_MODE` are UNVERIFIED (owner) |
| App in Expo Go | EAS branch `preview`, published by `.github/workflows/eas-update.yml` on every push to `mobile-app` that touches `mobile/`. Latest finished: update group **`5a2c2adf-d73c-404d-b7f6-a567db092f02`** = `mobile-app` `2137710` (v10.7), 2026-10-23 00:13 UTC; v10.8 `de95dcf` was publishing at the time of writing | GitHub Actions logs |
| App bundle → database | The workflow bakes `dravvaykssrbktztmrlj` + `https://www.ezvisa.net` into the bundle, refuses to publish if the bundle lacks `dravvaykssrbktztmrlj` or contains `rjbgteqgqaxalcfnksjc`, and publishes with `--skip-bundler`, so the EAS "preview" environment variables no longer reach the bundle | workflow file + successful runs |
| Database ezvisa-uae (`dravvaykssrbktztmrlj`) | **UNVERIFIED.** No tool in these chats can reach it. Run `docs/live-state-check.sql` (one read-only query) and paste the result into §0.3. Claims in migration headers: 0002-0006 applied 2026-10-21; 0007 applied 2026-10-22 (its header says NOT APPLIED, its footer says applied); 0008, 0009, 0013 approved, not run; 0001, 0010 B1, 0011, 0012 proposed | migration headers only |
| Edge functions | `delete-account`, `notify-status` v1 "deployed 2026-10-21" per their headers; `notify-status` v2 not deployed | UNVERIFIED (owner: Supabase › Edge Functions) |
| Supabase Auth | Site URL last seen `http://localhost:3000`; app redirect URLs not on the allow list; "Confirm email" unknown | UNVERIFIED (owner: Auth › URL Configuration and Providers) |

### 0.2 What is merged where
- `main` (`7be29de`) = `mobile-app` up to `cd6a94e` + all website work + leftovers of de75fd8 that nothing imports
  (`mobile/lib/search.ts`, `mobile/metro.config.js`, `mobile/scripts/ts-hooks.mjs`, failing `mobile/scripts/wizard-rules.test.ts`).
  The de75fd8 "empty first question" bug is **gone** on `main` (the first question renders all 29 destinations).
- `mobile-app` (`de95dcf`) = `main`'s app + v10.2 … v10.8 (app only). **The two differ**; the next `mobile-app` → `main` PR
  syncs them (it does not delete the de75fd8 leftovers by itself).
- Unmerged work worth keeping (not on `main` or `mobile-app`), see the branch table in `docs/mobile-audit.md` §14:
  - `claude/vibrant-wright-ez44ch` (chat 15): document "No" never blocks + "To get later" + `missingDocuments`,
    Arabic restores, no Emirates-ID prefill. **The owner rule in `PRODUCT.md` about "To get later" is not in any
    deployed code**; the chat 15 notes that called it done are superseded.
  - `claude/nice-faraday-r722ry`: website draft sync with the app (15 commits, merges into `main` without conflicts).
  - `claude/trusting-bell-9yvqmh` (open PR #19): a competing website rewrite (auth pages, continue API). Its title says
    "Ziina", but that part is already on `main`. Choose it or nice-faraday, not both.
  - `claude/bold-feynman-ssk2ur` (prefill only pre-payment answers) and `claude/lucid-noether-l06cin` (app lock for
    passcode-only phones, Arabic gaps): port by hand. bold-feynman renames `0012_customer_profiles` to 0013, which now
    clashes with `0013_claim_device_token`; keep today's numbering.
- Migrations are numbered `0012_customer_profiles.sql`, `0013_claim_device_token.sql` on both branches.

### 0.3 Open blockers (owner = who must act)
| # | Status 2026-10-23 | Owner / next step |
|---|---|---|
| B1 RLS / storage open to every signed-in user | UNVERIFIED. `scripts/006` + `0011` exist; not confirmed applied | Owner: run `docs/live-state-check.sql` (section "2 risk") |
| B2 upload route without auth | **Closed**: auth + own case + paid on `main`, live | – |
| B3 webhook unauthenticated | **Closed while the env var stays**: `ZIINA_WEBHOOK_SECRET` set (Production + Preview), code verifies HMAC. Residual: the route accepts unsigned calls if the variable is ever removed | Dev (later): fail closed in production |
| B4 preview bundle on the old DB | **Closed**: CI bundle guard, update `5a2c2adf…` | – |
| B5 client can insert a row as paid | UNVERIFIED (needs the INSERT policies, grants and triggers) | Owner: SQL result; then approve an insert guard |
| H1 website copy on `mobile-app` older than `main` | **Closed**: no website changes on `mobile-app` since its merge base | – |
| H2 payment intent overwrite | **Closed**: create-payment reuses an open intent; app keeps one per application | – |
| H3 receipt from computed data | **Fixed on `mobile-app`** (v10.6 `lib/receipt.ts`, payment row only); not on `main` yet | Next sync PR |
| H4 synthesised dossier row | **Closed** | – |
| H5 PII after sign-out | **Closed** (SecureStore, wipe on sign-out) | – |
| H6 guest rows under any email | UNVERIFIED (anon INSERT policy) | Owner: SQL result |
| H7 no "submitted" email / HubSpot lead for app cases | **Open** (payment emails now come from the webhook for every row, app rows included) | Dev: small authenticated route or DB webhook |
| H8 docs disagree | **Closed by this section**; DB facts stay UNVERIFIED until §0 gets the SQL result | Owner: paste SQL result |
| H9 check-payment validation | **Mostly closed**: `applicationId` is UUID-checked and rate limited; the `id` path is rate limited and URL-encoded but still unauthenticated (status only) | Low |
| N1 v10.2 `me()` uses `getSession()` | **Regression on `mobile-app`**: offline with an expired access token, autosave gets "Please sign in first" instead of a retryable error (the bug the drafts QA pass fixed). `drafts-check.ts` still stubs `getUser`, so it fails on `mobile-app` | Dev: keep `getSession()` but rethrow its retryable error; update the check |
| N2 `avatars` storage bucket (v10.6) | No migration in the repo creates it or its policies | Owner/dev: confirm in the SQL result (section "7 buckets"), write the migration |
| N3 `ZIINA_TEST_MODE` value | Unknown; if it is `"true"` in Production, live checkouts are test intents | Owner |
| N4 Google button always on Welcome (PR #26) | §2g says hidden until enabled. If Google is offered on iOS, Sign in with Apple is required (App Review 4.8) | Owner decision |
| N5 website `pnpm lint` (`tsc`) | 2 errors hidden by `ignoreBuildErrors`: `app/documents/[slug]/page.tsx:93` (`provider` prop), `lib/blog.ts` (`createBuildClient` import, unused) | Dev |
| N6 outdated tests | `auth-e2e-web.mjs` 27/29 (email moved to Account details; icon-only tab bar), `e2e-prefill-web.mjs` stalls, `wizard-rules.test.ts` on `main`; `passport-later-check.ts` cited below does not exist | Dev |

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
- Push: `public.device_tokens` (migration 0006, applied 2026-10-21) holds Expo push tokens per user; the `notify-status` edge function sends them. See §2k. There is no requirements or notifications table: the app uses a static checklist (`lib/data.ts` `REQS`, the same doc types as the website upload page) and an inbox derived from application rows.

## 2. Flows (code map)
- **Auth**: see §2g (chat 03). Same Supabase accounts as the website: email + password, magic link, sign-up, forgot password. Email links open the app (`/auth/callback`).
- **Wizard** (`app/apply/*`, `components/wizard/*`, `lib/wizard.ts`): a 1:1 port of web `/apply` (same steps, fields, validation). `lib/form.tsx` autosaves to AsyncStorage (like the website's localStorage). Once signed in **and** the personal step is valid, it also autosaves to `visa_applications` as `application_status='draft'` (debounced 1.5 s) and resumes the latest draft for that email on any device.
- **Submit** (`lib/data.ts submitApplication`): the same draft row becomes `submitted` / `payment_status='pending'` with the website's column mapping. Note: the website's "application.submitted" email is sent only by the web API route, not by this path.
- **Documents** (`lib/data.ts uploadDocument`, `lib/uploads.ts` offline queue): (1) `POST https://www.ezvisa.net/api/upload-document` (multipart `file, applicationId, documentType, uploadId`), exactly like web `/dashboard/upload`. If that route is unavailable, (2) the app uploads directly to bucket `visa_documents` at `<applicationId>/<documentType>_<uploadId>.<ext>` with the user's session and sets the matching `has_*` flag. `uploadId` is the queue job's stable UUID (see 2d). Doc types: `passportCopy, residencyCopy, photo, bankStatement, nocCertificate, salaryCertificate`.
- **Payments** (`lib/payments.ts`, `app/payment/[id].tsx`, chat 08): `POST https://www.ezvisa.net/api/create-payment` with `{applicationId, success_url, cancel_url}` only (no amount: the server prices the row, 249 AED, x2 with spouse). success/cancel = `https://www.ezvisa.net/app-return?r=…&appId=…&to=<ezvisa://payment-return | exp://…>`; Ziina opens in `WebBrowser.openAuthSessionAsync`. The returned `{id, redirect_url, amount}` is kept in AsyncStorage `ezvisa.payments.v1` (reopened for 1 h instead of creating a second payment, kept 7 days for verification). The result screen never trusts URL params: paid/failed come from `visa_applications.payment_status`, `GET /api/check-payment?applicationId=` (*Superseded (§0)*: that server change is merged and live on `main`) or `GET /api/check-payment?id=<this device's payment id>`. No price is computed in the app (`PRICE_AED` removed). Tests: `scripts/pay-e2e.cjs`, screenshots `docs/screenshots/chat08/`.
- **Dashboard / status** (`app/(tabs)/applications/*`, `app/(tabs)/(home)`): `select * from visa_applications where email = <me>`, mapped by `toApplication()` into the UI's shape.

## 2b. v8 additions (2026-10-19)
- **Wizard**: one question per screen (`lib/questions.ts`, `app/apply/index.tsx`, `components/wizard/answers.tsx`). Same fields, labels, options, order and validation as web `lib/wizard.ts`. Auto-advance + haptics, searchable country lists, native dates, skip logic, grouped progress, Reanimated transitions, autosave (local + DB draft) with resume at the exact question, Review with edit-and-return, idempotent double-submit-safe submit.
- **Loading**: `components/Boot.tsx`. The splash is held until session, fonts, i18n, appearance and draft have loaded, then fades out (280 ms).
- **Trip plan**: `lib/itinerary.ts` + `app/trip/[id].tsx`. Optional questions (cities, budget, who, interests) produce a deterministic plan labelled "Ideas, not bookings" with no venues, prices or hours. Days and items are editable; PDF via expo-print + expo-sharing. It is saved locally and in `additional_notes.itinerary` while the row is draft/submitted (RLS blocks it later; the UI says "saved on this phone"). AI version + `trip_plans` table: `db/proposed-itinerary-ai.md` (not deployed).
- **Extras**:
  - status timeline with real timestamps only; Home next action + countdown chip
  - capture quality checks (`lib/capture.ts`)
  - Face ID lock (`lib/lock.tsx`)
  - local passport-expiry reminder (Account)
  - Sign in with Apple (`lib/apple.ts`), hidden while the provider is disabled. In Expo Go the token audience is `host.exp.Exponent`, so add it to the Apple client IDs for testing.
  - EN/AR with RTL (`lib/i18n.tsx`, `lib/ar.ts`, switch in Account)
- **Native build only (not faked)**: home-screen widget, MRZ reading, edge-detect document scanning. (Push for status changes now exists, §2k.)
- Tests:
  - `scripts/run-e2e-v8.mjs`: live data layer, no new rows
  - `scripts/plan-v82.ts`: deterministic plan/PDF
  - Playwright scripts in /tmp/shot (v8.js wizard, v82.js trip/detail/account)
  - screenshots in `screenshots/v8/`

## 2c. v9 design system and polish (2026-10-19)
- Tokens live in `theme/` (re-exported by `lib/theme.ts`); screens must not hand-code numbers. Full reference: `docs/design-system.md` (chat 02).
  - Spacing: `S` = 0/4/8/12/16/24/32/40/48/64/80 on an 8pt grid (`S.gutter` = 16 screen margin; `S.lg` is a deprecated alias of 16).
  - Radius: `R` = 4/8/12/16/20/24/32/round.
  - Elevation: `elevation(0-3)`, plus `card()` = background + hairline + layered boxShadow (light mode only).
  - Type: `T` + `TYPE_SCALE` (Dynamic Type caps per role).
  - Colour: semantic names (`background`, `surface`, `text`, `textSecondary`, `border`, `accent`, `success`, `warning`, `danger`, …), light and dark; old names are aliases.
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
  Sent to `public.wizard_events`. **Analytics = Supabase, approved 2026-10-22.** The funnel events need **`migrations/0008_wizard_events_funnel.sql`** (approved; applied or not: see §0.1, UNVERIFIED). Until then the server rejects them and the app falls back by itself: it keeps sending the 4 original events and retries the funnel every 24 h (`ezvisa.funnel.v1`), so no app update is needed after 0008 runs.
- **Crash capture** (`lib/crash.ts` + `lib/scrub.ts`): reports are scrubbed before they are stored (patterns + the exact names/passport/email typed in the wizard + the signed-in account's name/email). The handler is installed at module load in `app/_layout.tsx`.
- **Crash service = Sentry, approved 2026-10-22** (`lib/sentry.ts`): a built-in envelope client (no SDK), because `@sentry/react-native` measured +1.4 MB bundle and +160-260 ms cold start and only reports JS errors in Expo Go. Off until `EXPO_PUBLIC_SENTRY_DSN` is set (`.env` + EAS preview environment). Queue `ezvisa.crashq.v1` (offline / app killed). Account › Privacy › long-press Version › "Send test error" sends a scrubbed test report. **With the first development build**, switch to `@sentry/react-native` (`npx expo install`) for native crashes and source maps.
- **Opt-out** (`lib/privacy.ts`, Account › Privacy "Share usage data", on by default): off = no events, no crash reports leave the phone, queued data deleted.
- **Diagnostics**: Account › Privacy › long-press "Version" = last 5 cold-start times, queued events, last scrubbed error.
- **Performance**: see `docs/PERFORMANCE-CHAT14.md`. Audit M12 fixed (one applications query per focus), Home story thumbnails, expo-image, memoised Flag, FlatList batch settings, quantized PNGs.
- **Tooling**: `npx tsc --noEmit` passes (Deno functions excluded); ESLint = eslint-config-expo 57 (`npx eslint .`, 0 errors, React Compiler rules as warnings); `node scripts/run-test-privacy.mjs` (41 checks: scrubbing, allowlist, test session, offline outbox, 0008 fallback, Sentry envelope + queue, forced crash, opt-out); `scripts/bench-web.mjs`.
- **Launch screen**: unchanged config (`expo-splash-screen` plugin: 180 pt mark, #FFFFFF / #000000, light + dark images). In Expo Go the native launch screen is Expo Go's own; the app's boot overlay (`components/Boot.tsx`) then shows the same mark. The real native launch screen appears only in a development/production build.
## 2g. Auth and session (chat 03, 2026-10-22)
- **Website methods (verified in web code):** `app/login` (password + "Email Magic Link"), `app/signup`, `app/forgot-password`, `app/reset-password`. No Apple or Google button on the website, so the app adds neither. The existing Google/Apple code stays dormant: it shows only if the provider is enabled on the project (`/auth/v1/settings`). *Superseded (§0) for Google on Welcome: shown always since PR #26 (§0.3 N4).*
- **Session storage:** `lib/secureStorage.ts` (expo-secure-store ~57.0.4, Keychain `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`). Values are chunked to ≤1800 bytes with a generation header written last (a crash mid-write keeps the old session). A session left in AsyncStorage by older builds moves over on first read and is deleted there. A Keychain session left by a previous install is forgotten on first launch. Web uses localStorage (testing only). Auto refresh starts and stops with AppState (`lib/supabase.ts`).
- **Session checks** (`lib/auth.tsx`): on launch and on foreground (at most once a minute) the app calls `getUser()`. If the server rejects the session (user deleted, session revoked, password changed elsewhere), it refreshes once, then signs out locally with "Your session ended. Please sign in again." Offline and 5xx errors never sign out. `session_not_found` is cleared by supabase-js itself, since a revoked session can't be refreshed.
- **Sign out** is local scope (the website stays signed in) and works offline. It also unregisters the push token and runs `lib/userData.ts clearUserData()`: the upload queue and its file copies (`clearQueue`), drafts, discarded ids, inbox read state, push token, reminders, passport expiry, crash report and trip plans. Device preferences (appearance, language, Face ID lock, usage-data choice) and anonymous diagnostics stay. The wizard state in memory resets through `epoch`. A session that ends on its own (expired or revoked) wipes the same data.
- **Screens** (`app/auth/*`): `index` (sign in / create account), `magic-link`, `forgot`, `callback` (code exchange; errors for expired/used link, link opened on another phone, offline), `reset` (new password). Shared parts are in `components/auth/AuthShell.tsx`. Messages are in `lib/authErrors.ts` (Arabic in `lib/ar.ts`). Double taps are guarded by a ref. Resend waits 60 s.
- **Route protection** (`app/_layout.tsx`, `Stack.Protected`): signed out → `welcome` (Sign in / Create account / Continue without an account). Signed in or guest → the app. `/auth/*` and `/payment-return` are always reachable. The splash (`components/Boot.tsx`) stays until the session is known, so no wrong screen flashes. Guest mode lives only in memory: every cold start without a session shows Welcome. A Ziina return on a cold start continues as guest.
- **Deep links:** `authRedirect()` in `lib/authLinks.ts` gives `ezvisa://auth/callback?type=signup|magiclink|recovery` in a build and `exp://<host>/--/auth/callback?...` in Expo Go. **These must be on the Supabase redirect allow list** (state: §0.1, UNVERIFIED). Otherwise Supabase sends people to the Site URL (last seen `http://localhost:3000`). *Superseded (§0) for Welcome:* since PR #26 the Google button is always shown there (§0.3 N4). PKCE: only the phone that asked for a link can use it.
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
  nothing until `migrations/0009` (approved 2026-10-22; applied or not: §0.1) adds the table to `supabase_realtime`.
- **Calendar** (`lib/appointment.ts`): `expo-calendar/legacy` `createEventInCalendarAsync` (SDK 57.0.6). iOS 17+ shows the
  system sheet without permission; older iOS requests access and explains a denial (Open Settings).
- **Checks**: `bun scripts/run-check.ts scripts/timeline-check.ts` (53 checks, live row shape, no network) and
  `bun scripts/run-check.ts scripts/appointment-check.ts` (18: appointment rows, Apple Maps URL, add to calendar on iOS 17+,
  iOS 16 granted/denied, Android, web, sheet error).
- **QA pass (2026-10-22, chat 11)** fixed, each with a check that failed first:
  - Non-employed applicants whose row came from the website were asked for a NOC on Home and the application page:
    `employmentOf()` reads the wizard or the website's top-level `employmentStatus` (checks P, Q).
  - Staff reviews of documents known only from the website's `has_*` flags were dropped, because those documents took
    `updated_at` as their upload time and the review write moves `updated_at`. They now have no upload time (check R).
  - Upload / Re-upload was offered when uploads are closed (status ready etc.); now only in `UPLOAD_STATUSES` (check S).
  - Refunded / part-refunded cases were asked to pay again (check T).
  - "Continue application" relabelled website rows as `source: "mobile-app"`, which dropped their real Submitted time and
    asked Continue a second time with the app's full question set. `keepOrigin()` keeps them website rows (check U).
- **Known gaps (not fixed, need a decision or data)**: website rows can never show the residency copy as uploaded (no
  `has_*` flag for it), so Documents stays open for them until staff move the file on; an app `residencyCopy` upload hides a
  website `has_passport` flag; Paid and Decision have no time until 0009; after a failed refresh the last loaded data stays
  on screen without a notice.
  `npm run lint` (eslint-config-expo 57) and `npx tsc --noEmit` pass. Screenshots: `docs/screenshots/v11/` (fixture rows
  in a Playwright harness against a fake Supabase host, not production data).
## 2h. Drafts & autosave (chat 06, 2026-10-22)
- **One row per application** in `visa_applications` (`application_status='draft'`), shared by the app and the website. No new columns: the answers live in `additional_notes.wizard`, the position in `wizardStep` (+ `wizardQuestion` in the app), `lastEditedOn` = `app` | `website`.
- **Version = `updated_at`** (there is no version column). Every write is `update … where id = … and updated_at = <last confirmed>` and the new value is read back from the server, never compared with a device clock. 0 rows means the copy changed elsewhere → `conflict`, autosave pauses, the user chooses (*Load newer version* / *Keep this version*). Nothing is overwritten without that choice. Content fingerprints recognise our own writes (e.g. a reply lost after the insert landed), so they don't cause false prompts.
- **Ids are made on the device** (`expo-crypto` / `crypto.randomUUID`) and stored before the first insert, so a save cut off by a kill retries into the same row. Before the first insert the app looks for an open draft of the same destination and offers it (*Continue it* / *Start a separate one*).
- **App** (`lib/form.tsx`, `lib/data.ts` `saveDraft/getDraft/findOpenDraft/submitApplication`, `components/wizard/sync.tsx`): debounce 800 ms + immediate save when the question changes; saves on background, checks for a newer copy on launch / foreground / draft open; NetInfo + web `online` events flush on reconnect; retries with backoff (`lib/uploads.ts backoffMs`). Indicator: *Saving… / Saved* (server-confirmed only) / *Saved on this phone* (signed out or nothing answered) / *Not saved · Offline | Retrying | Tap to retry*. Saved to the account once signed in and the first question is answered. Local drafts carry `owner` (email): another account on the same phone never sees or syncs them. Sign-out (which wipes the phone, section 2g) tries to save first and warns if answers would be lost. Home opens a server draft from another device in the wizard (`openServerDraft`). Submit only goes ahead after the server confirmed the exact answers, and is version-checked.
- **Website** (branch `claude/nice-faraday-r722ry`, based on `main`, **not merged anywhere yet**, §0.2): `lib/draft-sync.ts` (same rules), `components/apply/draft-status.tsx`, `/apply` wiring, `/api/submit-application` turns the signed-in user's draft row into the application (token-verified, version-checked, idempotent) instead of inserting a second row, Supabase browser/server clients also read `NEXT_PUBLIC_ezvisaSUPABASE_*`.
- **Tests (no live DB):** `scripts/mock-supabase.mjs` (REST + Auth stand-in with updated_at trigger, RLS by email, 23505), `scripts/e2e-drafts-web.mjs` (17 checks, app web build), `scripts/e2e-drafts-cross.mjs` (10 checks, website ↔ app). Screenshots: `docs/screenshots/drafts/`. Read-only SQL checks + optional trigger: `migrations/0010_draft_autosave_checks.sql` (not applied).
- **QA pass (2026-10-22)** fixed, each with a check that failed on the code before: *Keep this version* now writes the phone's copy (it only said Saved); a save whose reply was lost no longer counts as confirmed (Back to the last screen saves again before Saved); a network error while checking the session retries instead of "Please sign in first"; guest submit reuses one id per application (no second row on retry); discarding a local draft cancels its server draft; sign-out waits at most 4 s for a last save and also warns about other unsaved drafts. Checks: `scripts/e2e-drafts-qa.mjs` (7, app web build + mock DB) and `bun scripts/run-check.ts scripts/drafts-check.ts`. Website fixes are on its branch (`mobile/scripts/e2e-web-qa.mjs` there, 15 checks): server-side wizard rules and draft ownership in `/api/submit-application`, Pay twice → one application, account switch clears answers, open-redirect in `/login?next=`.
- **Open (need a decision):** client inserts can still set any column (needs an RLS/BEFORE INSERT guard — approval); the Ziina price comes from editable notes; email matching is case-sensitive; `/apply/continue` has no version check; the website still asks trip details before payment while the app asks them after (parity choice for the owner).

## 2i. Chat 09: document checklist and uploads (2026-10-22)
- **Checklist** (`lib/data.ts` `REQS` + `lib/checklist.ts`): unchanged rules. Shown only when `payment_status` is paid/completed (from the DB); NOC hidden unless `employmentStatus` is `employed`; states from `additional_notes.uploads`, `has_*` flags and staff `document_reviews` (uploaded · under review · approved · rejected + reason). Rows and alerts are now translated (Arabic).
- **No made-up dossier** (audit H4): EZvisa's own items show Ready only from `application_status = 'ready'`, with nothing to open.
- **Upload rules in the app**: only the website's doc types (`DOC_FLAG` keys) and PDF/JPG/PNG; refused before queueing. `uploadDocument` re-reads the row and refuses unpaid cases or cases outside `UPLOAD_STATUSES` (draft, submitted, reviewing, awaiting_documents).
- **Authenticated upload** (audit B2): the app sends `Authorization: Bearer <access token>` to `/api/upload-document`. The route on this branch (`app/api/upload-document/route.ts`) now requires it for application-id uploads, checks the case's email = the user's email and that it is paid, allow-lists `documentType`, and takes the extension from the checked content type. Tracking-token uploads (website) unchanged. **Not deployed: needs a PR to `main`.**
- **Progress**: website uploads go through XHR; real byte progress per job (memory only, 5% steps); bar fills with a percentage, sweep until the first bytes.
- **Viewing**: `openDocumentUrl` = Storage signed URL, 60 s, opened in the in-app browser. Works only after `migrations/0011` (own-folder read policy) is applied; until then Storage refuses and the "Stored securely" message stays.
- **Replace / delete**: same as the website: no delete; a rejected or missing item can be uploaded again; approved/under review items only open.
- **Live status**: the detail screen reloads every 30 s while visible and on return to the foreground; background reloads keep the last data if they fail. Chat 11's proposed `migrations/0009` adds the table to the realtime publication (Home uses it); the detail screen keeps polling until then.
- **Proposed** (applied or not: §0.1): `migrations/0011_document_storage_policies.sql` (+ `0011_check_document_access.sql`, a rolled-back two-user check).
- Tests: `node scripts/run-upload-tests.mjs` (24 checks, incl. type allow-list). Screenshots: `docs/screenshots/chat09/` (Expo web with intercepted fixtures, 390/430, light/dark, Arabic).

## 2j. Passport number after payment (2026-10-22)
- The pre-payment wizard asks "Do you have a valid passport?" and the expiry date, but **not the number**. The number is the first field of **Continue application** (`app/continue/[id].tsx`), with the employment answers.
- Rules: `validatePassportNumber` (required unless the answer was "no"), `continueComplete` = passport number + employment (`lib/wizard.ts`). `needsContinue(a)` / `continueForm(a)` in `lib/data.ts` drive Home, the application screen, the next action and the payment result. The number counts as present if it is in `additional_notes.wizard` or in the `passport_number` column (website rows).
- Saving: `saveContinueAnswers` writes `additional_notes` and `passport_number` in one update. While the case is `reviewing`, the guard trigger (0002) keeps only the notes, so the number is then only in `additional_notes.wizard`.
- Old drafts saved on the removed screen resume at Passport Expiry. The website (`main`) still asks the number before payment; only the app changed.
- Checks: `passport-later-check.ts` (10; *superseded (§0): the file is not in the repo*), `bun scripts/run-check.ts scripts/timeline-check.ts` (incl. 4 new cases). Screenshots: `docs/screenshots/passport-later/`.

## 2k. Push notifications and deep links (chat 12, 2026-10-22)
- **Flow**: staff change `visa_applications.application_status` or reject a document in `document_reviews` → trigger `visa_applications_notify` (0006) → `pg_net` POST with the Vault secret → edge function `notify-status` → Expo Push API → the owner's phones (`device_tokens` by email).
- **App** (`lib/push.ts`):
  - `notifications()` is the only loader of expo-notifications and sets the single foreground handler (banner + list, no sound, no badge). Reminders use it too.
  - `setupPush(ask)`: `ask=false` at sign-in (registers only if already granted); `ask=true` after payment (`app/payment/[id].tsx`). Never re-asks once denied, on either platform (Android 13+ would allow a second prompt). `addPushTokenListener` re-saves a rotated token using the token the event carries (`getExpoPushTokenAsync({ devicePushToken })`): the event fires on every device-token fetch, so fetching again inside the listener loops forever.
  - `useNotificationRouting` in `app/_layout.tsx` (`NotificationRouter`): warm start via `addNotificationResponseReceivedListener`, cold start via `getLastNotificationResponse()` (the SDK 57 sync API; the Async one is deprecated). It waits until the stored session has loaded and the app side of `Routes` exists (signed in or guest; a guest restarted on Welcome gets the screen after "Continue without an account"), and application taps also wait for sign-in. Each delivery (identifier + date) is handled once, then `clearLastNotificationResponse()`; a reminder rescheduled under the same identifier (`ezvisa-rem-draft`) opens again. It opens `router.push(url, { withAnchor: true })`, so Back goes to Applications.
  - `lib/notifyRoute.ts` allows only `/applications/<uuid>`, `/account` and `/apply`.
- **Token storage** (`lib/data.ts`): `registerPushToken` calls RPC `claim_device_token` (0013, approved; applied or not: §0.1). On PGRST202 it falls back to insert, or bumps `updated_at` if the row exists. A rotated token's old row is deleted only after the new one is saved, and `ezvisa.push.token` holds the last token saved to the server. `unregisterPushToken` waits for any save in flight and blocks later saves for the same session (so a save racing sign-out cannot re-create the row); it returns false when offline. Sign-out still completes (`lib/auth.tsx`, 3 s timeout), and Account › Sign out says when the phone is offline that it may still get the account's notifications. `clearUserData` drops the stored token key.
- **Server v2** (`migrations/functions/notify-status/index.ts` + `messages.ts`, NOT deployed; v1 is live):
  - lock-screen text is only "There's an update on your application." or "A document needs your attention.";
  - data is `{ type, applicationId, url }`;
  - no push for the customer's own draft/submit/discard;
  - a token shared by two accounts goes to its latest owner only.
- **Expo Go**:
  - Android Expo Go can't receive remote push (SDK 53+), and `setupPush` returns `unsupported-expo-go-android` there.
  - iOS Expo Go only warns in the SDK 57 code, but Expo does not support push there. Real delivery must be tested on an installed build: `eas device:create` (register the iPhone), then `eas build --profile preview --platform ios` (internal distribution, channel `preview`, so it gets the same EAS updates as Expo Go). The APNs key is created and kept by EAS credentials, never in the repo. `eas.json` has no `development` profile (that would need `expo-dev-client`).
  - Tap routing and the permission prompt can be tested in Expo Go with a local reminder.
- **Reminders** (`lib/reminders.ts`): lock-screen text is generic too ("Your trip is in one week", "A passport on your application expires in 6 months"), with no destination or names.
- **Known limits**: a session that ends on its own (revoked on the website) cannot delete its row (RLS needs the session), so that phone keeps the account's pushes until someone signs in on it (0013 then moves the token). The same applies to an offline sign-out. Lock-screen text is generic, and a tap needs that account's session to open anything.
- Checks:
  - `node scripts/check-push.mjs`: route allow-list, message text and data, token ownership.
  - `node scripts/run-push-tests.mjs`: 29 checks; fakes in `scripts/push-fakes.ts`.
  - `node scripts/push-server/run-fn.mjs`: the v2 edge function with a fake client, 9 checks.
  - `bash scripts/push-server/run-sql.sh`: 0006 + 0013 on a throwaway local Postgres, 21 checks.
  - Device test steps: QA-CHECKLIST §11.

## 3. Status on 2026-10-19 (verified against the live DB, `scripts/e2e-live.mjs`)
> *Superseded (§0).* Historical. Since then the Vercel env names exist (§0.1), the upload and payment routes changed, and the DB state must be re-read with `docs/live-state-check.sql`.
Working: sign-up and confirm, sign-in, draft create, autosave, resume from DB, submit, list by email.
Not working, because of server config outside the app:
1. `www.ezvisa.net/api/upload-document` → 500 "Storage not configured", and `/api/create-payment` → 500 "Payment service configuration error". The Vercel project serving the domain has **no `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` and no `ZIINA_API_KEY`**. Its browser bundle also has no `NEXT_PUBLIC_SUPABASE_URL` (it falls back to `placeholder-project.supabase.co`), so website login/signup cannot work. That is why the live DB had 0 auth users and no submissions since June.
2. Direct upload: bucket `visa_documents` missing; `visa-documents` rejects non-service-role uploads (RLS).
3. Supabase Auth Site URL is `http://localhost:3000`, and ezvisa.net is not in the redirect allowlist, so confirmation links land on localhost.
Fixes: `db/proposed-live-changes.sql` (bucket + own-folder storage policies, `tracking_token`/`preferred_language` columns, **RLS security fix**: today any signed-in user can read and update every application) plus the env/dashboard items listed at its end. **None of this has been applied. It needs the owner's approval.**

### EAS Update status (important)
> *Superseded (§0).* The GitHub workflow publishes every `mobile-app` push with a bundle guard; `e866e894…` is long replaced (latest: §0.1).
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
The token is not in the repo. *Superseded (§0):* publishing is done by `.github/workflows/eas-update.yml` (push to `mobile-app`); don't publish by hand.

## 5. Constraints (keep these)
- Never use or commit a service-role/secret key; the app uses the publishable key only. `.env` and `.expo-token` are git-ignored.
- **No schema, RLS or storage changes on the live DB (`dravvaykssrbktztmrlj`) without explicit owner approval.** Write proposals to `db/proposed-live-changes.sql`.
- Don't touch the other Supabase projects on that account (BrokersConnect/brokerconnect, brokerscareers, openmatsae, topsuite_tracker, supabase-*).
- Don't push to `main` or change Vercel settings from this work; use the `mobile-app` branch and PRs.
- Keep test data minimal and labelled (`+ezvisa-app-test` emails).
- **Owner rule (2026-10-22): deploy and merge after every edit.** Once type-check, lint and the checks pass, fast-forward the
  work into `mobile-app` right away (never into `main`). That push is the deploy: `.github/workflows/eas-update.yml` publishes
  it to the Expo Go `preview` channel. Confirm the workflow run succeeded before reporting the edit as done.

## 6. Next tasks
> *Superseded (§0).* The open list with owners is §0.3; the items below are kept for their detail.
1. Owner: set the Vercel env vars (Supabase URL/anon/service role, Ziina key and webhook secret), fix the Supabase Auth URL config, approve `proposed-live-changes.sql`. Then re-run `scripts/e2e-live.mjs`: upload, payment and `payment_id` should pass.
2. Send the "application submitted" email for app submissions (e.g. a small authenticated web route that sends it for an existing row id, or a DB webhook).
3. Customer document viewing: signed URLs are in the app (chat 09); needs `migrations/0011` applied.
4. Push: apply `migrations/0013_claim_device_token.sql` (approved), deploy `notify-status` v2, then run QA §11 on a physical iPhone.
5. Supabase Auth URL configuration (owner): add the app redirect URLs from §2g and set the Site URL to https://www.ezvisa.net. Google sign-in additionally needs the provider enabled (not used by the website today).
6. Development build (`eas build --profile development`) for push and native testing; App Store / Play listings.
