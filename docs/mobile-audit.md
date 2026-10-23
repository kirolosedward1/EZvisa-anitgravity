# EZvisa mobile app: codebase audit and plan (chat 01)

> **Superseded 2026-10-23 for status** (what is live, merged or still open, incl. §10 B1-B5/H1-H9, §12 and §13): see `mobile/HANDOFF.md` §0 and `docs/live-state-check.sql`. The code analysis below describes the commits it names.

Date: 2026-10-22. Branch: `mobile-app` (base `591aced`). Read-and-report only; the one build fix is listed in §9.
> *Current status lives in `mobile/HANDOFF.md` §0 (2026-10-23). §14 below holds that audit's evidence and branch table; §1-13 are historical.*

This describes the code at commit `0451206`. Later chats changed a lot (see §13 for what a QA pass found on `main` afterwards, and the corrections made to this document).

Contents
1. [Where the code lives](#1-where-the-code-lives)
2. [Config, SDK 57 and dependencies](#2-config-sdk-57-and-dependencies)
3. [Architecture map](#3-architecture-map)
4. [Supabase, secrets and session](#4-supabase-secrets-and-session)
5. [Data inventory (tables, columns, buckets, functions)](#5-data-inventory)
6. [Flows: auth, wizard, payment, documents](#6-flows)
7. [Wizard: app vs website, field by field](#7-wizard-app-vs-website)
8. [Duplicate logic and hard-coded / fake data](#8-duplicate-logic-and-hard-coded-data)
9. [Baseline: build, type-check, lint, screenshots](#9-baseline)
10. [Ranked issues](#10-ranked-issues)
11. [Plan for chats 02–15](#11-plan-for-chats-0215)
12. [Waiting for approval](#12-waiting-for-approval)
13. [QA review](#13-qa-review-2026-10-22-later-the-same-day)
14. [Status audit 2026-10-23](#14-status-audit-2026-10-23)

Evidence is quoted as `path:line` on the `mobile-app` branch. Website references are to **`main`** (what Vercel deploys), not the copy of the website on `mobile-app` (see §1).

---

## 1. Where the code lives

| What | Where |
|---|---|
| Mobile app (Expo) | `mobile/` on branch `mobile-app` of `kirolosedward1/EZvisa-anitgravity`. |
| Website (Next.js) | Repo root of the **same** repo. Production = branch `main` (Vercel builds `main`). |
| Website copy on `mobile-app` | The root of `mobile-app` holds an **older** website (merge-base `cae9f63`) plus its own edits (`lib/site-url.ts`, emails, `create-payment`). It is **behind `main` by 7 commits** (`9d53590` server-side price, `429c03d`/`2b1792f` wizard rules, `ab8d790` `/app-return`). Merging `mobile-app` into `main` would revert server-side pricing. The app itself only calls the deployed website (`main`). |
| Edge functions | Source copies in `mobile/migrations/functions/{delete-account,notify-status}/index.ts` (marked "DEPLOYED 2026-10-21"). |
| SQL | `mobile/migrations/0001–0007*.sql` (applied/not-applied notes in each header), `mobile/db/proposed-live-changes.sql` (not applied). Website: `scripts/*.sql`, `supabase/migrations/`. |
| Existing app docs | `mobile/HANDOFF.md`, `PRODUCT.md`, `AUDIT.md`, `AUDIT-V2.md`, `QA-CHECKLIST.md`, `UI-OVERHAUL-PLAN.md`, `WIZARD-IDEAS.md`, `POLISH-PLAN.md`, `DESIGN-V5.md`. |

Supabase project used by app and website: **ezvisa-uae, ref `dravvaykssrbktztmrlj`** (`mobile/.env.example:2`, `mobile/HANDOFF.md` §1). The Supabase connector available to this chat **cannot see that project** (it lists only `EZvisa` `rjbgteqgqaxalcfnksjc`, which the app no longer uses, and BrokersConnect projects, which were not touched). So nothing in §5 was verified against the live database; it comes from code and the migration headers.

---

## 2. Config, SDK 57 and dependencies

| File | Finding |
|---|---|
| `mobile/package.json` | `expo ^57.0.30` (installed 57.0.30) → **SDK 57 confirmed**. RN 0.86.3, React 19.2.3, TypeScript ~6.0.3. Package manager **npm** (`package-lock.json`). Scripts: start/android/ios/web only (no lint, no typecheck, no test script). |
| `mobile/app.json` | name EZvisa, slug `ezvisa`, scheme `ezvisa`, bundle/package `net.ezvisa.app`, `userInterfaceStyle: automatic`, `supportsTablet: true`, `runtimeVersion.policy: sdkVersion`, `updates.url` u.expo.dev, EAS projectId `a9cb0b0a-…`, owner `kirolosedward1`. Plugins: router, status-bar, web-browser, datetimepicker, font, image, splash (light/dark), sharing, localization (RTL), apple-authentication, local-authentication (Face ID string), image-picker (camera/photos strings), calendar. `primaryColor #0436DC`. No `expo-notifications` plugin entry (fine for Expo Go; needed for a dev build's icon/colour). |
| `eas.json` | **Missing.** No build profiles or channels. `eas update --branch preview` works without it, but `eas build` (dev build for push/native, store builds) needs one. |
| `app.config.*` | None. |
| `mobile/tsconfig.json` | `extends expo/tsconfig.base`, `strict: true`. Includes `migrations/functions/*.ts` (Deno), which is the only source of type errors (§9). |
| Lint config | **None** (no `eslint.config.js`, no `lint` script). `npx expo lint` would scaffold one; baseline was taken on a scratch copy (§9). |
| `.env.example` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable), `EXPO_PUBLIC_SITE_URL`. `.env` is git-ignored (`mobile/.gitignore`). |

### Dependency compatibility vs SDK 57

`npx expo install --check` could not reach `api.expo.dev` (blocked by this environment's network policy, HTTP 403). It was run offline (`EXPO_OFFLINE=1`, result "Dependencies are up to date", with Expo's warning that offline validation is unreliable) and every installed version was compared with the SDK's own table `node_modules/expo/bundledNativeModules.json`:

| Package | package.json | Installed | SDK 57 expects | Result |
|---|---|---|---|---|
| @expo/vector-icons | ^15.0.2 | 15.1.1 | ^15.0.2 | OK |
| @react-native-async-storage/async-storage | 2.2.0 | 2.2.0 | 2.2.0 | OK |
| @react-native-community/datetimepicker | 9.1.0 | 9.1.0 | 9.1.0 | OK |
| @react-native-community/netinfo | 12.0.1 | 12.0.1 | 12.0.1 | OK |
| @react-native-picker/picker | 2.11.4 | 2.11.4 | 2.11.4 | OK |
| expo-apple-authentication … expo-web-browser (27 `expo-*` modules) | ~57.0.x | 57.0.x | ~57.0.x | all OK (expo-calendar 57.0.6, expo-symbols 57.0.3 included) |
| react / react-dom | 19.2.3 | 19.2.3 | 19.2.3 | OK |
| react-native | 0.86.3 | 0.86.3 | 0.86.3 | OK |
| react-native-reanimated | 4.5.1 | 4.5.1 | 4.5.1 | OK |
| react-native-worklets | 0.10.1 | 0.10.1 | 0.10.1 | OK |
| react-native-safe-area-context | ~5.7.0 | 5.7.0 | ~5.7.0 | OK |
| react-native-screens | ~4.26.0 | 4.26.2 | ~4.26.0 | OK |
| react-native-svg | 15.15.4 | 15.15.4 | 15.15.4 | OK |
| react-native-web | ^0.21.4 | 0.21.4 | ~0.21.0 | OK (caret is wider than the SDK's tilde; pin to `~0.21.4` to be safe) |
| @supabase/supabase-js | ^2.109.0 | 2.109.0 | not an SDK module | JS only, OK |
| react-native-url-polyfill | ^4.0.0 | 4.0.0 | not an SDK module | JS only, OK |
| dev: typescript ~6.0.3, @types/react ~19.2.4, @expo/ngrok, qrcode | | | not SDK modules | OK |

**Mismatches found: none.** Watch items: `react-native-web` caret range; `expo` itself is `^57.0.30` (a caret allows any 57.x, which is fine inside SDK 57). Re-run `npx expo install --check` and `npx expo-doctor` from a machine that can reach `api.expo.dev` to confirm.

Expo Go note: every native module used is in the Expo Go SDK 57 runtime (glass-effect, symbols, blur, calendar, local-auth, apple-auth, image-picker, document-picker, print, sharing, notifications, updates). No custom native code, so no dev build is needed for current features. Remote push on **Android Expo Go is unsupported** (`mobile/lib/push.ts:5-6` handles it).

---

## 3. Architecture map

### 3.1 Routes (`mobile/app`, expo-router)

```
app/_layout.tsx                    Root: Appearance → I18n → Theme → Auth → Form providers; root Stack;
                                   NetworkBanner, LockGate, BootOverlay; starts crash handler, upload queue, reminder routing
├─ (tabs)/_layout.tsx              Tabs with custom TabBar (+ button opens /apply). Redirects to /welcome until welcomed or signed in
│  ├─ (home)/_layout.tsx           TabStack (initialRoute index)
│  │  ├─ index.tsx                 Home: hero for active application, drafts, popular countries   → "/"
│  │  └─ destination/[slug].tsx    re-exports components/CountryDetail                             → "/destination/:slug"
│  ├─ (countries)/_layout.tsx      TabStack (initialRoute countries)
│  │  ├─ countries.tsx             Searchable 29-country list                                     → "/countries"
│  │  └─ country/[slug].tsx        re-exports components/CountryDetail                             → "/country/:slug"
│  ├─ applications/_layout.tsx     TabStack
│  │  ├─ index.tsx                 Applications list (active / all)                                → "/applications"
│  │  └─ [id].tsx                  Application detail: timeline, pay, continue, checklist, uploads → "/applications/:id"
│  └─ account/_layout.tsx          TabStack
│     ├─ index.tsx                 Account, language, appearance, Face ID, reminders, receipts, delete → "/account"
│     └─ notifications.tsx         Inbox derived from application rows                            → "/account/notifications"
├─ welcome.tsx                     First-run screen (fade, no gesture)                             → "/welcome"
├─ auth.tsx                        Modal: sign in / sign up                                        → "/auth?mode&email"
├─ apply/_layout.tsx               Modal stack
│  ├─ index.tsx                    One-question-per-screen wizard + Review + Submitted/Pay        → "/apply?step&to&from&…"
│  └─ review.tsx                   Legacy route → Redirect /apply?step=payment&resume=1
├─ continue/[id].tsx               Modal: employment details after payment                        → "/continue/:id"
├─ payment/[id].tsx                Modal: payment result (polls DB / Ziina status)                → "/payment/:id?returned&pid"
├─ payment-return.tsx              Deep-link target from www.ezvisa.net/app-return → Redirect /payment/:id
└─ trip/[id].tsx                   Modal: trip plan ("Ideas, not bookings"), PDF                 → "/trip/:id"
```

Reachability check (every `router.push/replace/navigate`, `href`, push `data.url`, reminder `url` was traced):
- Every screen is reachable from inside the app except two redirect-only routes: `apply/review.tsx` (legacy; only a typed or old deep link reaches it) and `payment-return.tsx` (reached from `www.ezvisa.net/app-return`).
- No in-app link points to a route that doesn't exist (`/account`, `/applications`, `/countries`, `/apply`, `/applications/:id`, `/continue/:id`, `/trip/:id`, `/payment/:id`, `/destination/:slug`, `/country/:slug`, `/account/notifications`, `/auth`, `/welcome`). One redirect has no screen: Google sign-in returns to `ezvisa://auth/callback` (`lib/google.ts:18`) and there is no `app/auth/callback` route. It works only because `openAuthSessionAsync` catches the redirect; if the OS hands the link to the app instead, the router shows "not found".
- Deep links: scheme `ezvisa://` (`app.json`), `exp://…/--/payment-return` in Expo Go (`lib/api.ts:31`). Push taps open `/applications/:id` only (`lib/push.ts:16`). There is no handler for an auth email link: confirm/reset emails go to the website (`components/AuthForm.tsx:33`).

### 3.2 Folders

| Folder | Contents |
|---|---|
| `components/` | `AuthForm`, `Boot` (splash hold + fade), `CountryDetail`, `CountryPicker` (+ `PhoneField`), `Appointment`, `GoogleButton`, `Logo`, `NetworkBanner`, `Support`, `flow.tsx` (`CircleButton`), `nav/TabBar.tsx` (Liquid Glass tab bar), `ui/` (`core.tsx` Text/Button/Icon/PressScale/Skeleton…, `data.tsx` StatusPill/Timeline/app cards, `Text.tsx`, `index.ts`), `wizard/` (`answers.tsx` used; `fields.tsx` partly used; `extras.tsx` PrefillOffer; **`steps.tsx`, `payment.tsx` unused**). `DateRow.tsx` **unused**. |
| `lib/` | Data: `supabase.ts`, `config.ts`, `data.ts` (all DB access), `api.ts` (website API + Ziina), `uploads.ts` (offline queue), `capture.ts` (camera/files/scan-to-PDF), `discard.ts`, `useApps.ts`. Wizard: `wizard.ts` (form, lists, validation), `questions.ts` (question graph), `form.tsx` (state + autosave). Platform: `auth.tsx`, `google.ts`, `apple.ts`, `push.ts`, `reminders.ts`, `lock.tsx`, `i18n.tsx` + `ar.ts`, `appearance.tsx`, `theme.ts`, `motion.ts`, `haptics.ts`, `analytics.ts`, `crash.ts`, `onboarding.ts`, `stack.tsx`. Content: `countries.ts`, `world.ts` (ISO list + dial codes), `capitals.ts`, `facts.ts`, `photos.ts`, `itinerary.ts`, `checklist.ts`, `nextAction.ts`, `countdown.ts`. Types: `database.types.ts` (generated, see §5). |
| `hooks/` | None (hooks live in `lib/`). |
| `constants/` | None (tokens in `lib/theme.ts`; site/price/support constants in `lib/config.ts`). |
| `assets/` | icons, splash (light/dark), logos, `hero.jpg`, `countries/*.jpg` (29), `flags/index.ts` (SVG strings, MIT). |
| `scripts/` | `e2e-live.mjs` (live DB check, needs test credentials), `e2e-v8.ts`, `plan-v82.ts`, `run-e2e-v8.mjs`, stubs. No test runner in package.json. |
| `migrations/`, `db/` | SQL + edge function sources (§5). |

### 3.3 Data flow

```
 UI screens ──► lib/form.tsx (wizard state) ──► AsyncStorage  ezvisa.wizard.v1 / ezvisa.drafts.v2   (every change, 250 ms)
     │                    └──────────────────► lib/data.ts saveDraft ─► visa_applications (status 'draft')  (signed in + personal step valid, 1.5 s)
     │
     ├─► lib/data.ts ──► supabase-js (publishable key, user JWT) ──► visa_applications / device_tokens / storage visa_documents
     │                                                            └► functions/v1/delete-account (called from app/(tabs)/account/index.tsx)
     ├─► lib/analytics.ts ──► supabase-js ──► wizard_events (insert only)
     ├─► lib/api.ts ───► https://www.ezvisa.net/api/create-payment ─► Ziina checkout (in-app auth session)
     │                   https://www.ezvisa.net/api/check-payment, /api/upload-document, /app-return → ezvisa://payment-return
     ├─► lib/uploads.ts (queue in AsyncStorage + file copy in documents dir) ─► lib/data.ts uploadDocument
     └─► local only: reminders (expo-notifications), lock, language, appearance, analytics ring buffer, crash record, read-state
 Server side (not in the app): Ziina webhook (website) sets payment_status; trigger visa_applications_notify → edge fn notify-status → Expo push.
```

---

## 4. Supabase, secrets and session

| Check | Result | Evidence |
|---|---|---|
| Client setup | One client, `createClient<Database>(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)`, PKCE, `autoRefreshToken`, `persistSession`, `detectSessionInUrl:false`. Null when env is missing (UI shows "Sign-in isn't configured"). | `mobile/lib/supabase.ts:9-13`, `mobile/lib/config.ts:11-13` |
| Key type | Only the publishable/anon key is referenced. No service-role key anywhere in `mobile/` (code, history). Service role appears only in the edge-function sources (`Deno.env`, server side). | `git grep`, `git log -p` over `mobile/` |
| Bundle scan | iOS Hermes bundle exported here has no `service_role`, `sb_secret_`, JWT (`eyJhbGciOi`), `ZIINA_API_KEY`. (No `.env` in this container, so the real URL/key were not in this bundle.) | §9 |
| Env files | Only `.env.example` is committed (placeholder `sb_publishable_xxx`). `.env`, `.expo-token`, `*.p8/*.p12/*.key/*.jks` are git-ignored. | `mobile/.gitignore` |
| Session storage | **AsyncStorage (unencrypted)**, not SecureStore/Keychain. Refresh token readable on a jailbroken/backup-extracted device. | `mobile/lib/supabase.ts:11` |
| Other local PII | Full wizard form (name, DOB, passport number/expiry, phone) in AsyncStorage `ezvisa.wizard.v1` + `ezvisa.drafts.v2`; upload queue file copies in `Documents/uploads`; passport expiry `ezvisa.passportExpiry.v1`. **Not cleared on sign-out** (`app/(tabs)/account/index.tsx:126-128` only unregisters the push token and calls `signOut`). | `lib/form.tsx:13-14`, `lib/uploads.ts:15,43-53` |
| Published EAS update | `HANDOFF.md` §3 says the `preview` update group `e866e894…` was built with the **old** DB (`rjbgteqgqaxalcfnksjc`) from EAS env vars, and a corrected export had not been published. Later commits don't say it was fixed. Could not check from here (expo.dev blocked). | `mobile/HANDOFF.md` "EAS Update status" |

---

## 5. Data inventory

Not verified live (see §1). "Live status" comes from the migration headers in `mobile/migrations/*` and `mobile/AUDIT-V2.md` §2 (19 Oct, read-only checks). These sources **contradict each other** (see issue H8).

### 5.1 Mobile app

| Object | Kind | Columns / operations | File(s) |
|---|---|---|---|
| `public.visa_applications` | table | **select \*** by `email` (list) and by `id`+`email` (detail) | `lib/data.ts:124-135` |
| | | **insert** draft: `full_name, email, phone, nationality, destination_country, date_of_birth, entry_date, exit_date, travel_purpose, passport_number, duration_days, previous_schengen_visa, previous_rejections, rejection_details, user_agent, referrer, additional_notes, application_status='draft', payment_status='pending', has_passport/has_photos/has_bank_statements/has_employment_proof=false` | `lib/data.ts:139-158,176` |
| | | **update** draft (same columns) where `application_status='draft'` | `lib/data.ts:170` |
| | | **insert as guest (anon)** with client-generated `id`, `application_status='submitted'` | `lib/data.ts:184-190` |
| | | **update** draft→`submitted`, `payment_status='pending'` | `lib/data.ts:204-216` |
| | | **select** latest draft `id, additional_notes, updated_at` | `lib/data.ts:193-200` |
| | | **update** `additional_notes` (read-modify-write: employment, itinerary, uploads, `discarded_at`) | `lib/data.ts:220-228,269-272`; `app/continue/[id].tsx:48`; `lib/itinerary.ts`; `lib/discard.ts:39` |
| | | **update** one `has_*` flag after a direct upload | `lib/data.ts:266-267` |
| | | **update** `application_status='cancelled'` (unpaid draft/submitted only) | `lib/data.ts:322-328` |
| | | reads `payment_status, payment_amount, payment_id, application_status, created_at, updated_at, appointment_*` (6 cols), `document_reviews` | `lib/data.ts:77-121`, `components/Appointment.tsx:11-18`, `app/payment/[id].tsx:32-34` |
| `additional_notes` (JSON in a text column) | keys | website keys `maritalStatus, employmentStatus, jobTitle, companyName, monthlySalary, spouseAccompanying`, plus app keys `source, platform, wizardStep, wizardQuestion, contactEmail, wizard{full form}, uploads[{type,path,name,at}], itinerary, discarded_at, appointment` (fallback) | `lib/data.ts:23-27,150-157` |
| `public.device_tokens` | table (0006, "applied") | insert `token, platform` (user_id/email by default from JWT); delete by `token` | `lib/data.ts:308-317`, `lib/push.ts:37-38` |
| `public.wizard_events` | table (0004, "applied") | insert `session_id, event, page, destination, platform, app_version, signed_in` | `lib/analytics.ts:12-18` |
| `storage.visa_documents` | bucket | upload `<applicationId>/<documentType>_<rand8>.<ext>`, `upsert:true` (fallback when the website route fails) | `lib/data.ts:234,259-265` |
| `delete-account` | edge function (deployed) | `functions.invoke('delete-account', {confirm:'DELETE'})`; inside: service role, removes files under each app id, anonymises rows, deletes auth user | `app/(tabs)/account/index.tsx:29`; source `migrations/functions/delete-account/index.ts` |
| `notify-status` | edge function (deployed) | not called by the app; called by trigger `visa_applications_notify` via `pg_net` with a Vault secret; reads `visa_applications`, `device_tokens`, sends Expo push | `migrations/0006_push_notifications.sql`, `migrations/functions/notify-status/index.ts` |
| `ezvisa_notify_hook_ok(text)` | RPC (service role only) | used by `notify-status` | `0006:38-43` |
| Triggers/functions | DB | `visa_applications_guard_customer_update` (freezes payment/email/status for customers; allows discard), `visa_applications_guard_appointment` (freezes `appointment_*`, `document_reviews`), `visa_applications_notify` | `0002`, `0003`, `0005`, `0006`, `0007` |
| Auth | Supabase Auth | `getSession, onAuthStateChange, signUp, signInWithPassword, resetPasswordForEmail, exchangeCodeForSession, signInWithOAuth(google), signInWithIdToken(apple), updateUser, signOut, getUser`; `GET /auth/v1/settings` to detect providers | `lib/auth.tsx`, `components/AuthForm.tsx`, `lib/google.ts`, `lib/apple.ts` |
| Views / other RPCs | none | — | — |

Generated types `lib/database.types.ts` are **stale**: no `appointment_*`, `document_reviews`, `device_tokens`, `wizard_events` (hence the `as any` casts in `lib/data.ts:88,311` and `lib/analytics.ts:16`).

### 5.2 Website `/apply` flow and the routes the app calls (`main`)

| Object | Operation | Client | File (main) |
|---|---|---|---|
| `visa_applications` | **insert** at submit: `full_name, email, phone, nationality, destination_country, date_of_birth, entry_date, exit_date, travel_purpose, passport_number, duration_days, has_*=false, payment_status='pending', application_status='submitted', additional_notes{maritalStatus, employmentStatus, jobTitle, companyName, monthlySalary, spouseAccompanying}` | service role | `app/api/submit-application/route.ts:69-106` |
| `visa_applications` | select by `id`; update `payment_id` | service role | `app/api/create-payment/route.ts:71-75,135` |
| `visa_applications` | update `payment_status, payment_amount, updated_at` where `payment_id` | service role | `app/api/webhooks/ziina/route.ts:74-82` |
| `visa_applications` | select by `tracking_token` or `id`; update one `has_*` | service role | `app/api/upload-document/route.ts:72-80,105-121` |
| `visa_applications` | select by `tracking_token` (track, dossier, download) and by `email` (dashboard) | service role / anon+cookie | `app/track/[token]/page.tsx:30-46`, `app/dashboard/page.tsx:65-70` |
| `email_logs` | select/upsert | service role | `lib/email/service.ts:42-121` |
| `storage.visa_documents` | upload `{id}/{documentType}_{rand8}.{ext}`; signed URL for `{id}/final_package.pdf` | service role | `upload-document:85-97`, `download-document:92-96` |
| Auth | `getUser` (prefill), sign-in/up/OTP/reset/callback | browser/server anon | `app/apply/page.tsx:416`, `app/login`, `app/signup`, `app/auth/callback` |
| HubSpot | `POST /api/hubspot/create-lead` (non-blocking) | server | `components/apply/payment-step.tsx:77-92` |

Website reads `tracking_token` and `preferred_language` (only added by `supabase/migrations/001_email_logs.sql:22-26`); whether they exist live is unknown (proposed again in `mobile/db/proposed-live-changes.sql` block 3). The website never uses `user_id`; ownership is `email` or `tracking_token`. No RPCs or edge functions are called by the website.

### 5.3 Same field, different names or meaning

| Concept | App | Website | Note |
|---|---|---|---|
| Columns | same `visa_applications` columns | same | No column-name conflict. App also writes `previous_schengen_visa`, `previous_rejections`, `rejection_details`, `user_agent`, `referrer`, which the website route leaves empty. |
| Passport expiry | `additional_notes.wizard.passportExpiry` (app only) + device-only `ezvisa.passportExpiry.v1` (Account) + `Applicant.passport_expiry_date` (always null) | none | Three places, none a column (`0001` proposes `passport_expiry_date`, not applied). |
| Residence / city / Emirates ID | `additional_notes.wizard.*` | not stored | Website drops them (route keeps only 6 note keys). |
| Trip dates | `entry_date / exit_date` | same columns; website TS type also has `travel_start_date / travel_end_date` | Website-internal inconsistency only. |
| Photo doc type | `photo` | `photo` (track upload), `passportPhoto` (dashboard upload) | both map to `has_photos`. |
| NOC doc type | `nocCertificate` | `nocCertificate`; HubSpot uses `nocSalaryCertificate` | |
| Residency copy | `residencyCopy` → `has_passport` | same | No separate residency flag on either side. |
| Reference | `EZ-` + first 8 hex of `id` | `tracking_token` (UUID) in links/emails | Different identifiers for the same case. |
| Status | adds `draft`; reads `paid`/`completed`; labels for `awaiting_documents`, `appointment_booked` (never written by anyone) | `submitted → reviewing → ready / cancelled` (+`approved`) | |

---

## 6. Flows

### 6.1 Auth
- Email + password (`signUp` with `emailRedirectTo https://www.ezvisa.net/auth/callback?next=/dashboard`, `signInWithPassword`), reset via website (`components/AuthForm.tsx:33,62-63,97`). After confirming on the website the user returns to the app and signs in; the app never receives the email link.
- Google: hidden unless `/auth/v1/settings` says enabled; PKCE via `openAuthSessionAsync` to `ezvisa://auth/callback` (`lib/google.ts:10-38`). Apple: iOS only, hidden unless enabled; `signInWithIdToken` with nonce (`lib/apple.ts`).
- Session: AsyncStorage, auto-refresh (`lib/supabase.ts`). `AuthProvider` also exchanges any incoming deep link carrying `?code=` (`lib/auth.tsx:10-15`).
- Gate: tabs redirect to `/welcome` until welcomed or signed in (`app/(tabs)/_layout.tsx:12`). Most of the app works signed out; data screens show a sign-in empty state.
- Sign-out: unregister push token, `signOut` (`app/(tabs)/account/index.tsx:126-128`). Local drafts, upload queue and passport expiry stay on the device.
- Optional Face ID lock + blurred app-switcher cover (`lib/lock.tsx`). Delete account through the `delete-account` edge function, WhatsApp/email fallback.

### 6.2 Wizard (pre-payment)
`lib/questions.ts` (question graph) on top of `lib/wizard.ts` (lists, validation), rendered by `app/apply/index.tsx`. Steps: **Personal → [Spouse] → Trip Details → Review & Payment**. Employment moved **after payment** (`lib/wizard.ts:83-84`, `app/continue/[id].tsx`).
- Rules: destination required; nationality must be in `SCHENGEN_VISA_REQUIRED`; residence in `RESIDENCE_COUNTRIES` (UAE); city one of `UAE_EMIRATES`; Emirates ID yes/no; names; email regex + typo list; phone 7–15 digits, not repeated/ascending; DOB 18+; valid passport must be "yes"; passport number + expiry ≥ return + 3 months; marital; spouse accompanying if married. Spouse: names + valid passport yes/no. Trip: purpose; departure ≥ today + 15 days; return after departure, ≤ 90 days (`ceil(end−start)`); dates flexible; companions; hotel; funding; balance; first Schengen; refusals (+ details).
- Autosave: AsyncStorage every change (250 ms) + multiple local drafts; cloud draft row once signed in and the personal step is valid (1.5 s debounce, plus on every page change). Resume at the exact question, from local or the latest cloud draft (`lib/form.tsx`).
- Prefill offer from the latest application's `notes.wizard` (`app/apply/index.tsx:111-126`).
- Submit: signed in → same row `draft → submitted` (idempotent, in-flight guard); guest → anon insert with a phone-generated UUID, then "sign in with this email" (`lib/data.ts:184-216`). **No "application submitted" email** is sent for app submissions (only the website route sends it).

### 6.3 Payment handoff to Ziina
1. `POST https://www.ezvisa.net/api/create-payment` `{applicationId, amount, currency:'AED', success_url, cancel_url, test:false}`; `success_url`/`cancel_url` = `https://www.ezvisa.net/app-return?r=success|cancel&appId=…&to=<ezvisa:// or exp:// payment-return>` (`lib/api.ts:27-48`). On `main` the server **ignores amount/currency/test** and prices from the row (249 AED, ×2 with spouse).
2. `WebBrowser.openAuthSessionAsync(redirect_url, back)`. The return is not trusted.
3. `/payment/[id]` polls the row for `payment_status` (set by the Ziina webhook) for up to 30 s; guests can't read the row, so it polls `GET /api/check-payment?id=<intent>` instead (`app/payment/[id].tsx:26-44`).
4. Paid → ask for push permission → "Continue application" (employment) or "Upload documents". Failure → retry or WhatsApp.
- `/app-return` exists only on `main` (`app/app-return/page.tsx`), not in the `mobile-app` copy of the website.
- The amount the app **displays** is computed on the phone (`PRICE_AED × (spouse ? 2 : 1)`, `app/apply/index.tsx:240`; `lib/data.ts:110`) until `payment_amount` is set by the webhook.

### 6.4 Documents
- Locked until `isPaid(a)`; upload allowed while status in `draft, submitted, reviewing, awaiting_documents` (`app/(tabs)/applications/[id].tsx:27,101-102`).
- Checklist = static `REQS` (`lib/data.ts:62-69`). NOC is hidden only when an employment status is set and is not `employed` (`:72-74`); while the status is empty (every paid case before `/continue` is done, and website rows, whose status sits at top-level `notes.employmentStatus`, not `notes.wizard`, read at `app/(tabs)/applications/[id].tsx:41`) NOC shows as mandatory. States come from `additional_notes.uploads`, `has_*` flags and `document_reviews` (`lib/data.ts:77-100`).
- Capture: camera / library / files / multi-page scan → PDF via `expo-print`; 5 MB hard limit, resolution/size warnings (`lib/capture.ts`).
- Queue: AsyncStorage `ezvisa.uploads.v1`, file copied into `Documents/uploads`, backoff 2 s→60 s, 6 attempts, offline wait (`lib/uploads.ts`).
- Upload: (1) `POST https://www.ezvisa.net/api/upload-document` multipart `file, applicationId, documentType` (**no auth header**; the website route checks only that the id exists); (2) fallback: direct upload to `visa_documents/<appId>/<type>_<rand8>.<ext>` with the user JWT and set the `has_*` flag; then append to `additional_notes.uploads` (`lib/data.ts:242-277`).
- Viewing: `openDocumentUrl` always returns `null` (`lib/data.ts:281`); a "Your EZvisa dossier" row is **synthesised** when status is `ready` (`lib/data.ts:97-98`), with no check that the file exists.

---

## 7. Wizard: app vs website

Website = `main` `/apply` (`components/apply/*`). App = `mobile/lib/questions.ts` + `lib/wizard.ts`.

### 7.1 Field by field

| # | Field (key) | Website (main) | App | Same? |
|---|---|---|---|---|
| 1 | destination | Searchable list, 29 Schengen, required | Same list (`SCHENGEN`), searchable, required | Yes |
| 2 | nationality | Single select from **10 hard-coded** (Egypt, India, Jordan, Pakistan, Russian Federation, Syria, **UAE**, Saudi Arabia, Philippines, Bangladesh) (`nationality-step.tsx:22-33`); URL `from=` can set any value | Single choice: 35 top UAE nationalities + "Other nationality" → full **visa-required** list (Reg. 2018/1806 Annex I, 104 names); URL values outside the list are ignored | **No.** The website still offers UAE (visa-exempt) and only 10 options. |
| 3 | countryOfResidence | Read-only "United Arab Emirates" | Country list with one entry (UAE), auto-coerced | Yes (UI differs) |
| 4 | cityOfResidence | `<select>` of 7 emirates, no flags | Choice list of 7 emirates, no flags | Yes |
| 5 | hasEmiratesId | Yes/No, required | Yes/No, required | Yes (neither stores it as a column; app keeps it in `notes.wizard`) |
| 6 | firstName / lastName | Text, required | Text, required, "As on your passport." | Yes |
| 7 | email | Regex + typo list | Same rules; prefilled from session | Yes |
| 8 | phone | Free `tel`, 7–15 digits (error text says 8–15) | Country picker + local number, 7–15 digits | Rule yes; input differs |
| 9 | whatsappOptIn | Checkbox, default on; not stored | Checkbox, default on; stored in `additional_notes.wizard` (`lib/data.ts:156`) | UI yes; storage differs |
| 10 | dateOfBirth | Native date, `max` today−18y (browser only) | Wheel, `max` today−18y, validated | Yes (app stricter) |
| 11 | hasValidPassport | Before passport no.; "No" blocks Continue | Before passport no.; "No" blocks with note | Yes |
| 12 | passportNumber | Text, upper-case, required if valid | Same | Yes |
| 13 | passportExpiry | **Not asked** | Required; ≥ return date + 3 months | **App only** (hint still says "6 months from travel date", see M4) |
| 14 | maritalStatus | single/married/divorced/widowed | Same | Yes |
| 15 | spouseAccompanying | Yes/No if married | Same | Yes |
| 16 | spouseFirstName/LastName | Required | Required; "Use {lastName}" shortcut | Yes |
| 17 | spouseHasValidPassport | Yes/No; "No" passes | Yes/No; "No" shows note, passes | Yes |
| 18 | spouseOccupation | Optional | Optional | Yes |
| 19 | employmentStatus | **Step 3, before payment** | **After payment** (`/continue/[id]`) | **Order differs** (intentional per PRODUCT.md) |
| 20 | jobTitle + companyName | Employed: both required | Employed: both on one screen | Yes (after payment in app) |
| 21 | companyName (business/freelancer) | Required | Required | Yes |
| 22 | employmentStartDate | Employed, ≤ today | Same | Yes |
| 23 | monthlySalary | 4 ranges, employed | Same | Yes |
| 24 | hasNOC | Employed only, optional | Employed only, optional; cleared when not employed | Yes |
| 25 | averageMonthlyIncome | Business/freelancer, free text | Same | Yes |
| 26 | purposeOfTrip | 6 options | Same | Yes |
| 27 | travelStartDate | Picker `min` today+15 (not re-validated) | Validated ≥ today+15 | Yes (app stricter) |
| 28 | travelEndDate | > start, ≤ 90 (`ceil`) | Same + passport cover check; quick picks | Yes |
| 29 | datesFlexible / travelingWith / hotelCategory / fundingSource / balanceRange | Same option sets | Same | Yes |
| 30 | isFirstSchengenVisa / previousRefusals / refusalDetails | Same | Same; app also writes the 3 columns | Yes (storage differs) |
| 31 | willVisitOtherCountries / additionalCountries | Optional; arrival/departure within trip | Optional; same | Yes |
| 32 | itinerary | Optional textarea | Optional textarea | Yes |
| 33 | Price shown | 249 AED or **70 USD** (currency switch), ×2 if `spouseAccompanying=yes` even if no longer married | 249 AED ×2 only if married + accompanying | Mostly; the server charges AED either way |
| 34 | What gets stored | 6 note keys only; most answers dropped | Full form in `notes.wizard` + same columns | **App stores more** |

### 7.2 Wizard rules (shared context) — does the code follow them?

| Rule | App | Evidence | Website (`main`) |
|---|---|---|---|
| Nationality is a single choice from Schengen visa-required countries | **Yes** | `lib/questions.ts:41-42` (single `country` question, `allNames: SCHENGEN_VISA_REQUIRED`), `lib/wizard.ts:44-45,126` (`needsSchengenVisa`), `lib/form.tsx:18-21` (old drafts cleaned) | **No**: 10-item list includes UAE (`nationality-step.tsx:29`); URL `from=` accepts any string |
| Residence is UAE only | **Yes** | `lib/wizard.ts:49-50,57-62,127` | Yes (`lib/residence.ts:3-4`) |
| City is one of the 7 emirates, no flags | **Yes** | `lib/wizard.ts:52-53,128-129`; `lib/questions.ts:45` (no `flag`), `components/wizard/answers.tsx:38-44` (flag only when passed) | Yes |
| "Valid passport" comes before passport number | **Yes** | `lib/questions.ts:52-57` (`passportNumber.applies = hasValidPassport==='yes'`), `lib/wizard.ts:136-143` | Yes |
| No NOC question for self-employed | **Yes** | `lib/questions.ts:71,77` (`hasNOC` only for `employed`, cleared otherwise), `app/continue/[id].tsx:80,96-99`; checklist hides NOC (`lib/data.ts:72-74`) | Yes |
| (PRODUCT.md) Employment questions come after payment | **Yes** | `lib/wizard.ts:83-84`, `app/continue/[id].tsx` | No (step 3) |
| (PRODUCT.md) Price set by the server, app never decides the amount | **Partly**: the server decides the charge, but the app **sends** `amount` (ignored on `main`) and **displays** a phone-computed price before payment | `lib/api.ts:33,36`, `app/apply/index.tsx:240` | Server-side on `main` |
| (Hard rule) Documents only after payment | **Yes in the app UI** (`app/(tabs)/applications/[id].tsx:101-102`); **not enforced server-side** (website upload route accepts any existing id, `upload-document:72-80`) | | |

---

## 8. Duplicate logic and hard-coded data

### 8.1 Duplicated between app and website (should be one shared source)

| Data | App | Website (`main`) | Drift today |
|---|---|---|---|
| Schengen list (29) | `lib/wizard.ts:36` `SCHENGEN`, `lib/countries.ts:1` (emoji map, unused emoji), `lib/capitals.ts`, `lib/facts.ts`, `lib/photos.ts`, `assets/flags` | `lib/countries.ts:1-31`, `nationality-step.tsx:46-76`, `trip-details-step.tsx:28-58`, `hero-section.tsx`, `lib/destinations.ts`, carousel | Names match |
| Nationalities | `UAE_NATIONALITIES` (35) + `SCHENGEN_VISA_REQUIRED` (104) `lib/wizard.ts:44-48`; dead `NATIONALITIES` (10) `:37` | 10 in `nationality-step.tsx:22-33`; 6 in hero/doc pages; 15 in `start-application-box.tsx` | **Yes**: four different lists |
| Residence / emirates | `RESIDENCE_COUNTRIES`, `UAE_EMIRATES`, `matchEmirate`, `coerceResidence` `lib/wizard.ts:49-62`; dead `RESIDENCES` `:63` | `lib/residence.ts` (comment says it mirrors the app) | Same values |
| Option sets (marital, employment, salary, purposes, companions, funding, balance, hotels) | `lib/wizard.ts:64-71` | `components/apply/*` inline | Same today |
| Validation (email, phone, 18+, 15-day, 90-day) | `lib/wizard.ts:95-188` | inline in each step; server `lib/sanitize.ts` | Website phone error text says 8–15 |
| Price 249 / ×2 | `lib/config.ts:17`, `lib/api.ts:20`, `lib/data.ts:110`, `app/apply/index.tsx:240` | `lib/currency.ts:12-17`, `payment-step.tsx:50-52`, `create-payment:8-14`, many marketing pages | Same AED value |
| Document types → `has_*` | `lib/data.ts:51-59` `DOC_FLAG`, `DOC_TYPES`, `REQS`; edge fn `notify-status` `DOC` labels | `upload-document:105-116` (twice), track/dashboard/HubSpot upload pages | Same keys (dashboard adds `passportPhoto`) |
| Status labels | `lib/data.ts:319`, edge fn `LABEL`, `lib/nextAction.ts` | `app/track`, admin UI | App lists statuses nobody writes |
| Reference `EZ-xxxxxxxx` | `lib/data.ts:47`, edge fn `notify-status` | none (uses `tracking_token`) | |
| 5 MB + mime list | `lib/capture.ts:8` (5 MB); picker types `lib/capture.ts:49` include `image/heic`, `image/webp` | `upload-document:7-8` (pdf/jpeg/jpg/png only) | **Differs**: HEIC/WebP from Files is refused with 400, and a 400 is final in the app (`lib/data.ts:256`), so the upload fails with no fallback (M15) |

Recommendation (chat 02/04): one `mobile/lib/rules/` module (lists, options, validation, price display, doc types) with unit tests, and a script that checks the website copies for drift. A shared npm package is not needed yet.

### 8.2 Hard-coded or synthesised data in shipped screens (vs the "no fake data" rule)

| What | Where | Verdict |
|---|---|---|
| Pre-payment price `249 × (spouse?2:1)` shown as "Total Fee" and on the Pay button / Applications "Total" | `app/apply/index.tsx:240,345,271`; `lib/data.ts:110`; `app/(tabs)/applications/[id].tsx:123,134` | Computed on the phone, not read from the server. Matches the server rule today; must come from the server (e.g. a price field on the create-payment response or an RPC) to be rule-safe. |
| Receipt amount `payment_amount ?? total_amount` and date `updated_at` | `app/(tabs)/account/index.tsx:193-198` | **Breaks the rule**: if `payment_amount` is null the receipt shows the phone-computed price, and the date is the last row update, not the payment date. |
| "Your EZvisa dossier" document row when status = `ready` | `lib/data.ts:97-98` | **Synthesised**: no check that `final_package.pdf` exists, and tapping it shows "Stored securely" (no file). |
| Timeline timestamps | `components/ui/data.tsx:77-78`, `lib/data.ts:111-112` | Uses `updated_at` as the time of the latest step; any later update moves it. Labelled "real timestamps only" in code but is an approximation. |
| Notifications inbox | `lib/data.ts:287-299` | Derived from status, timestamps = `created_at`/`updated_at`; "Payment received" time is the last update time. |
| Static checklist `REQS` | `lib/data.ts:62-69` | Real website checklist, fine. |
| Quick facts, capitals, photos, flags | `lib/facts.ts`, `lib/capitals.ts`, `lib/photos.ts` | Static reference data with sources, fine. |
| Trip plan | `lib/itinerary.ts` | Deterministic template, labelled "Ideas, not bookings", no venues/prices. Fine. |
| "24–48h · processing" tile on every country page | `components/CountryDetail.tsx:13` | Same hard-coded value for all 29 countries. The website uses "24-48h **File Prep**" (EZvisa's preparation time); "processing" reads as the embassy's visa processing time, which is much longer. Misleading claim (M16); wording is a product decision. |
| Statuses `awaiting_documents`, `appointment_booked`, `completed` handled in UI | `lib/data.ts:319`, `lib/nextAction.ts:14,25,27` | No one writes them; dead branches. |
| Support numbers | `lib/config.ts:14-15` (`971547109533`, `support@ezvisa.net`) | Real contact data, keep in one place. |
| No mock timelines, sample receipts, placeholder applications or fake approval rates found in shipped screens. | | |

---

## 9. Baseline

All outputs are in `docs/mobile-audit/baseline/`.

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | **Failed** (`EUSAGE`: lock file missing `expo-calendar@57.0.6`). **Fixed** in `aa29cce` by `npm install` (lock file only, +11 lines). `npm ci` now passes. This is the only code/config change in chat 01. |
| SDK check | `EXPO_OFFLINE=1 npx expo install --check` | "Dependencies are up to date" (offline, unreliable); manual table in §2 shows no mismatch. Online check blocked (`api.expo.dev` 403 from this environment). |
| Type-check | `npx tsc --noEmit` | **12 errors, all in `migrations/functions/*/index.ts`** (Deno globals, `jsr:` import). App code: 0 errors. Fix: exclude `migrations/functions` in `tsconfig.json` (chat 02). |
| Lint | `npx expo lint` on a scratch copy (no config in repo) | 128 problems: **29 errors**, 99 warnings. Errors: React Compiler rules (`react-hooks/refs` "Cannot access refs during render", "This value cannot be modified" in `TabBar.tsx` ×13, `set-state-in-effect` ×6, reassigning a module variable in `applications/[id].tsx:31`), `react/no-unescaped-entities` ×5, use-before-declare `AuthForm.tsx:35`. Warnings: unused vars 44, duplicate imports 31, exhaustive-deps 24. |
| iOS bundle | `npx expo export --platform ios` | **OK**, 5.3 MB Hermes bundle, no secrets in it. |
| Web bundle | `npx expo export --platform web` | OK; used for screenshots. |
| Expo Go on a real iPhone | `npx expo start` + Expo Go | **Not done here**: this is a cloud container with no device, and `exp.host`/`api.expo.dev` are blocked. To do on your phone: `cd mobile && cp .env.example .env` (fill the publishable key) → `npx expo start --tunnel` → scan in Expo Go; walk `mobile/QA-CHECKLIST.md`. Expected first-launch risk is low: the iOS bundle compiles and all native modules are in Expo Go 57. Check first that the published `preview` update does not still point at the old DB (§4). |
| Screenshots | Playwright on the web export, 390×844 and 430×932, @2x, light + dark, signed out, no `.env` | 32 files in `docs/mobile-audit/screenshots/` (welcome, home, countries, country detail, wizard Q1, auth, applications, account). 0 page errors. They are the **web** rendering (no native glass/blur, SF Symbols fallback), and sign-in shows "isn't configured" because no keys are present. Signed-in screens need a test account + `.env`. |

---

## 10. Ranked issues

Severity: **Blocker** = stops release or exposes customer data; **High** = wrong money/data or a broken core path; **Medium** = correctness/UX/maintainability that will bite soon; **Low** = cleanup.

### Blocker
| # | Issue | Evidence | Area |
|---|---|---|---|
| B1 | **Live RLS/storage state is unverified and the repo's own notes disagree.** The website's `scripts/003` policies let *any* signed-in user read and update *every* application (incl. `payment_status`), and `scripts/005` gives *any* authenticated user full access to `visa_documents` (passports). `mobile/HANDOFF.md` §3 says the fix is "not applied"; `AUDIT-V2.md` §2 and `migrations/0002` imply it was. Sign-up is public, so if 003/005 are live, any user can read every passport. | `scripts/003_create_visa_applications_table.sql:68-83`, `scripts/005_setup_storage.sql:10-14` (main); `mobile/db/proposed-live-changes.sql` block 2/4; `mobile/AUDIT-V2.md` §2 | Security (needs owner check) |
| B2 | **Upload route accepts files for any application id without auth or payment check** (the app relies on it). Anyone with an application UUID can write into that case's folder and flip `has_*` flags; `documentType` and extension go unvalidated into the object key. | `app/api/upload-document/route.ts:23-121` (main); app call `mobile/lib/data.ts:249-256` | Security / data integrity |
| B3 | **Ziina webhook is unauthenticated unless `ZIINA_WEBHOOK_SECRET` is set**, and create-payment returns the intent id to any caller: a user could mark their own case paid. Whether the secret is set is unknown. | `app/api/webhooks/ziina/route.ts:16-34`, `create-payment/route.ts:139` (main) | Payments |
| B4 | **The published EAS `preview` update may still point at the old DB** (`rjbgteqgqaxalcfnksjc`) per `HANDOFF.md`; nothing later says it was republished. Testers in Expo Go would write to the wrong project. | `mobile/HANDOFF.md` §3 "EAS Update status" | Build / data |
| B5 | **Any client can insert an application that is already "paid" or "ready".** Inserts carry client-built columns (`lib/data.ts:176,187`); the insert policy checks only the email (`db/proposed-live-changes.sql:108-112`; website `scripts/003:71-72` is `WITH CHECK (true)`); the guard trigger runs `before update` only (`proposed-live-changes.sql:104-105`). A modified client can insert `payment_status:'paid'`, which unlocks documents and receipts in the app and shows as paid in the admin. (Found in the QA review; `main`'s later `scripts/006_tighten_visa_applications_rls.sql` explicitly leaves INSERT policies out.) | `lib/data.ts:176,187`; `db/proposed-live-changes.sql:104-112` | Security / payments (needs owner check) |

### High
| # | Issue | Evidence | Area |
|---|---|---|---|
| H1 | `mobile-app` carries an older website copy. Its own website edits are limited to `create-payment/route.ts`, `lib/email-templates.tsx`, `lib/email/templates/index.ts`, `lib/site-url.ts`, `tsconfig.json` (`git diff --stat cae9f63 591aced -- . ':!mobile'`). A merge keeps `main`'s wizard rules and `/app-return` (only `main` changed them), but `create-payment` was edited on both sides, so a careless conflict resolution there could drop the server-side price. | §1; `git diff cae9f63 591aced -- app/api/create-payment/route.ts` | Build / process |
| H2 | Each create-payment call overwrites `payment_id`; paying an earlier checkout (two taps, retry, two devices) is then never matched by the webhook, so a real payment stays "pending". The app opens new intents on retry. | `create-payment/route.ts:135`, `webhooks/ziina/route.ts:74-82` (main); `mobile/app/payment/[id].tsx:46-51` | Payments |
| H3 | Receipt shows `payment_amount ?? phone-computed total` and `updated_at` as the date. | `mobile/app/(tabs)/account/index.tsx:193-198` | No-fake-data rule |
| H4 | Synthesised "Your EZvisa dossier" document when status = `ready`; no file check, can't be opened. | `mobile/lib/data.ts:97-98,281` | No-fake-data rule |
| H5 | Session in AsyncStorage (unencrypted) and **sign-out leaves PII on the device**: wizard drafts (passport number, DOB), upload file copies, passport expiry. | `lib/supabase.ts:11`, `lib/form.tsx:13-14`, `lib/uploads.ts:43-53`, `app/(tabs)/account/index.tsx:126-128` | Security / privacy |
| H6 | Guest checkout lets anyone insert a row under **any email**; when that person signs in, it appears in their list. Spam/phishing vector, and the anon insert policy is unverified. | `lib/data.ts:184-190`; `proposed-live-changes.sql` "Allow public submissions" | Data integrity |
| H7 | App submissions send **no "application submitted" email** and no HubSpot lead (website path does both). Staff only see app cases by looking at the table. | `lib/data.ts:202-216` vs `components/apply/payment-step.tsx:61-92` (main) | Operations |
| H8 | Docs contradict each other on what is live: `proposed-live-changes.sql` header "NOT APPLIED", `0007` header "NOT APPLIED" but footer "Applied 2026-10-22", `HANDOFF.md` §3 vs `AUDIT-V2.md` §2; `lib/discard.ts:2` comment. Nobody can tell the real schema. | files named | Process |
| H9 | `check-payment` takes an unvalidated `id` into the Ziina URL, unauthenticated, no rate limit (the app's guest flow depends on it). | `app/api/check-payment/route.ts:5-17` (main) | Security |

### Medium
| # | Issue | Evidence | Area |
|---|---|---|---|
| M1 | No ESLint config, no lint/typecheck/test scripts, no test runner; `tsc` fails on Deno files. 29 lint errors at baseline. | §9 | Build |
| M2 | No `eas.json`; dev/preview/production builds, channels and env per profile undefined. Needed for push on Android, store builds. | `mobile/` | Build |
| M3 | Stale generated types (`database.types.ts`) → `as any` around `device_tokens`, `wizard_events`, `document_reviews`. | §5.1 | Maintainability |
| M4 | Passport rule text says "6 months from travel date" but validation is "3 months after return". Pick one (Schengen Code: 3 months after departure) and align the hint and note. | `lib/questions.ts:53,55` vs `lib/wizard.ts:113-119,141` | UX / correctness |
| M5 | 90-day check counts nights (`ceil(end−start)`), Schengen counts days inclusive (entry+exit), so a 91-day stay passes. Same on the website. | `lib/wizard.ts:120,177`; website `trip-details-step.tsx:187` | Validation |
| M6 | Displayed price computed on the phone (also sent as `amount`, ignored by `main`). Must come from the server to meet "app never decides the amount". | §6.3 | Payments / rule |
| M7 | Timeline/inbox times use `updated_at`; there is no status history. | `components/ui/data.tsx:77-78`, `lib/data.ts:287-299` | Rule / UX |
| M8 | Passport expiry lives in three places (wizard notes, device-only Account field, always-null applicant field); reminders never use the wizard value. | §5.3, `lib/reminders.ts:13-16,57-63` | Data integrity |
| M9 | i18n gaps: many hard-coded English strings (Alerts, checklist labels, receipt, auth info messages, `AuthForm.tsx:63,97`, `applications/[id].tsx:61,65,74,193-205`, `notifications.tsx:23`, `capture.ts:36`). | files named | Arabic |
| M10 | Cloud draft rows are created as soon as the personal step is valid → many `draft` rows in the staff table; discard sets `cancelled` but abandoned drafts accumulate. | `lib/form.tsx:101-108` | Data hygiene |
| M11 | Dark mode: style brief requires light + dark, `PRODUCT.md` says "Dark mode is dropped for now", code supports both. Decide. | `mobile/PRODUCT.md` §Capabilities | Design |
| M12 | `useApps(true)` runs `listApplications` twice per focus (once directly, once inside `listNotifications`). | `lib/useApps.ts:19`, `lib/data.ts:288` | Performance |
| M13 | Website nationality list (10, incl. UAE) disagrees with the app (visa-required only); website stores almost none of the wizard answers. App/website cases look different to staff. | §7 | Parity |
| M14 | `/app-return` allows `exp://` / `exps://` in production (needed for Expo Go testing, but lets an ezvisa.net link open any Expo Go project). | `app/app-return/page.tsx:6` (main) | Security (low impact) |
| M15 | File picker offers HEIC/WebP but the website upload route accepts only PDF/JPEG/PNG; the app treats the 400 as final, so those uploads always fail. | `lib/capture.ts:49`, `lib/data.ts:256`; website `upload-document/route.ts:8` | Uploads |
| M16 | Hard-coded "24–48h processing" on every country page (see §8.2). | `components/CountryDetail.tsx:13` | No-fake-data rule |

### Low
| # | Issue | Evidence |
|---|---|---|
| L1 | Dead code: `components/DateRow.tsx`, `components/wizard/steps.tsx`, `components/wizard/payment.tsx`, `lib/wizard.ts` `NATIONALITIES`/`RESIDENCES`, `lib/countries.ts` emoji values, `lib/config.ts` `WEB_URL`, `lib/api.ts` `openWeb/shareUrl`, `STEP_ORDER` dup. | `grep` in §3.2 |
| L2 | `react-native-web` uses `^` instead of the SDK's `~0.21`. | `package.json` |
| L3 | `supportsTablet: true` with a phone-only layout. | `app.json` |
| L4 | Comments out of date (`lib/push.ts:11` "push_tokens", `lib/data.ts:306`, `lib/discard.ts:1-4`). | files named |
| L5 | Lots of planning docs in `mobile/` (9 Markdown files) with overlapping/contradicting content; keep `HANDOFF.md` + `PRODUCT.md` + this audit, archive the rest. | `mobile/*.md` |
| L6 | `AuthForm` uses `setApple` before its `useState` line (works at runtime because it runs in an effect). | `components/AuthForm.tsx:35-36` |

Edge cases asked for:
- **Builds but crashes on first launch in Expo Go?** Could not run on a device. The iOS bundle compiles; all native modules are in Expo Go 57; providers guard a missing `.env` (`SUPABASE_ENABLED`) so the app opens signed-out instead of crashing; the web build renders every tab with 0 page errors. Main risk is configuration (wrong DB in the published update, B4), not a crash.
- **Unreachable routes / dead links:** none (§3.1).
- **Different column names for the same field:** none at column level; differences are in JSON keys, doc-type keys and identifiers (§5.3).

---

## 11. Plan for chats 02–15

The code is further along than the plan's titles suggest: the wizard is already one question per screen, drafts/autosave, prefill, Ziina handoff, uploads + offline queue, timeline, push (server side deployed), Arabic/RTL, Face ID, analytics events and delete-account all exist. Most chats are **hardening and verification**, not builds. Proposed changes in **bold**.

| Chat | Title (proposed) | Scope from this audit |
|---|---|---|
| 02 | Design System & Foundations **+ Tooling** | ESLint (`eslint-config-expo`), `lint`/`typecheck` scripts, exclude `migrations/functions` from tsconfig, fix the 29 lint errors, `eas.json` (development/preview/production), pin `react-native-web ~0.21`, remove dead code (L1), regenerate `database.types.ts` (needs read access to `ezvisa-uae`), **decide dark mode (M11)**, **bring `mobile-app`'s website files in line with `main` (merge `main` into `mobile-app`, H1)**, consolidate docs (L5). Test runner (`jest-expo`, via `npx expo install`) so later chats can add rule tests. |
| 03 | Authentication & Session | Session in SecureStore (chunked adapter, Expo Go-safe), wipe local PII on sign-out (H5), handle confirm/reset deep links (needs the Supabase redirect allow-list: owner), Google/Apple readiness, email-change edge cases. |
| 04 | Wizard **Hardening & Parity** (was "Rebuild") | No rebuild needed. Shared rules module (§8.1), fix passport text (M4), i18n gaps in the wizard, decide whether the website should adopt the app's nationality list (M13; website change = separate PR to `main`, your call). **Swap with 05** or merge them: validation is the core of this chat. |
| 05 | Validation & Dates | Date-only handling (local vs UTC), 90-day inclusive count (M5), 15-day rule, 18+, unit tests for every rule. |
| 06 | Drafts & Autosave | Draft-row hygiene (M10), conflict between local and cloud drafts, encrypt/limit local PII, resume edge cases. |
| 07 | Prefill & Profile Data | Today prefill reads the last application. A real profile needs a table (approval). Passport expiry single source (M8, maybe the `passport_expiry_date` column from `0001`, approval). |
| 08 | Ziina Payment Handoff | Server-provided price for display (M6), stop sending `amount`, single active intent / reuse (H2, website change), webhook secret check (B3, owner/Vercel), `check-payment` validation (H9), receipt from real payment data only (H3), submitted email + HubSpot for app cases (H7). **Needs website (main) PRs.** |
| 09 | Document Checklist & Uploads | Authenticated upload path (B2: website route checks the user's JWT and payment, or direct storage with own-folder policy), remove the synthesised dossier row (H4), signed-URL viewing, doc-type allow-list. **Depends on B1 answer.** |
| 10 | Scanner & Offline Queue | Keep `expo-print` scan-to-PDF (Expo Go). Native edge detection/MRZ need a dev build: **decide whether chat 10 includes the first dev build** or stays Expo Go. Queue: PII file copies cleanup, size check after PDF build. |
| 11 | Home Dashboard & Timeline | Real timestamps need a status-history table or trigger (M7, approval); remove dead statuses; skeletons already in place. |
| 12 | Push Notifications & Deep Links | Server side exists (`device_tokens`, trigger, `notify-status`). Verify end to end on iOS Expo Go; Android needs a dev build (Expo Go has no remote push). Deep links: `ezvisa://` vs `exp://`, `/app-return` scheme policy (M14). |
| 13 | Profile, Settings, Arabic & Security | Arabic completeness (M9), Face ID, delete-account verification, privacy screen. |
| 14 | Analytics, Crashes & Performance | `wizard_events` exists; crash reporting needs a service (e.g. Sentry, new service = approval); double fetch (M12); list performance. |
| 15 | QA & Release Readiness | Real-device pass on 390/430 using `QA-CHECKLIST.md`, EAS build/submit, store metadata, privacy labels, `ITSAppUsesNonExemptEncryption`, `supportsTablet` (L3). |

**Proposed additions:**
- **Before chat 02 (or as its first step): a "Backend truth" check you run or grant access for.** This chat could not reach the live project. Without it, B1/B3/B4/H8 can't be closed and chats 08/09/12 build on guesses. Needed: read-only SQL access to `ezvisa-uae` (or run the queries in §12 and paste results), Vercel env var *names* for the production project, and the EAS `preview` update's env.
- **Website work is part of chats 08 and 09.** Several fixes are in `main` routes (upload auth, webhook, payment intent reuse, check-payment). The rules say never merge `mobile-app` into `main`; these need separate small PRs to `main`, which you review.

---

## 12. Waiting for approval

Nothing below was changed. Each item needs your decision.

1. **Verify live security (B1)**: run read-only in the `ezvisa-uae` SQL editor and share the output:
   ```sql
   select policyname, cmd, roles, qual, with_check from pg_policies where schemaname in ('public','storage') order by tablename, policyname;
   select id, public, file_size_limit, allowed_mime_types from storage.buckets;
   select column_name from information_schema.columns where table_schema='public' and table_name='visa_applications' order by 1;
   select tgname from pg_trigger where tgrelid = 'public.visa_applications'::regclass and not tgisinternal;
   ```
   If the `scripts/003`/`005` policies are live, apply `mobile/db/proposed-live-changes.sql` blocks 2 and 4 (own-row / own-folder policies) and drop the `005` "full access to authenticated" storage policy. **RLS + storage change: approval needed.**
2. **Supabase access for this project's chats**: the connected Supabase account doesn't include `ezvisa-uae`; add it (read-only is enough for audits) or keep pasting query results.
3. **Vercel env (B3)**: confirm `ZIINA_WEBHOOK_SECRET` is set on the production project; confirm which Supabase env names are set (the website reads `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, while CLAUDE.md lists `NEXT_PUBLIC_ezvisaSUPABASE_*`).
4. **EAS preview update (B4)**: confirm the EAS `preview` environment variables hold the `ezvisa-uae` URL + publishable key, then republish. Needs your Expo token.
5. **Website PRs to `main`** for B2, B3, H2, H7, H9 (upload auth, webhook strictness, intent reuse, submitted email/lead for app cases, check-payment validation).
6. **Possible schema additions later** (proposals only, written when their chat comes): status history (M7), `passport_expiry_date` (`0001`, M8), profile table (chat 07).
7. **Network access for this environment**: `api.expo.dev`, `exp.host`, `www.ezvisa.net` are blocked here, so online `expo install --check`, `expo-doctor` and live API checks can't run from the cloud session.
8. **B5 (insert as paid)**: an insert-side guard (column grants, or a `before insert` trigger forcing `payment_status='pending'`, `application_status in ('draft','submitted')`, null `payment_*`/`appointment_*`/`document_reviews`). **RLS/trigger change: approval needed.**

---

## 13. QA review (2026-10-22, later the same day)

A second pass checked this document against the audited code (`0451206`) and the website (`main@45bf6e0`) with an independent reviewer, re-ran every check, and looked at `main` after the merges (PRs #7, #9, #15, #18, #20).

**Corrections made to this document:** `expo-*` count 29 → 27 (§2); route reachability wording and the missing `ezvisa://auth/callback` screen (§3.1); `wizard_events` is written by `lib/analytics.ts` (§3.3); `0006:44-49` → `0006:38-43` (§5.1); NOC shows while employment status is empty (§6.4); the app does store `whatsappOptIn` (§7.1); upload type lists differ, HEIC/WebP fail (§8.1, M15); hard-coded "24–48h processing" (§8.2, M16); H1 was overstated (a merge keeps `main`'s wizard rules and `/app-return`; only `create-payment` conflicts); new blocker B5 (client can insert a row as paid).

**Checks re-run** (outputs in the QA session, not committed):

| Check | `0451206` (audited) | `main` `1934aee` | `mobile-app` `8651059` |
|---|---|---|---|
| `npm ci` | pass | pass | pass |
| `npx tsc --noEmit` | 12 errors (Deno files only) | **28 errors** (14 in `app/apply/index.tsx`, 14 in `scripts/wizard-rules.test.ts`) | **0** |
| `npm run lint` | no config | 0 errors, 111 warnings | not run |
| `expo export` iOS / web | pass / pass | pass / pass | not run |
| Website `pnpm build` (`main`) | — | pass (2 pre-existing `tsc` errors, `ignoreBuildErrors`) | — |
| `scripts/wizard-rules.test.ts` (`node --test`) | — | **fails**: `'../lib/wizard' does not provide an export named 'NATIONALITY_OPTIONS'` | not present |

Re-checked in a second QA pass: `main` unchanged at `1934aee` (same 28 errors, same empty first wizard question in the browser); `mobile-app` moved to `fc47e6e` and still type-checks with 0 errors (lint 0 errors / 105 warnings); the fix branch below passes `npm test` 14/14.

**Regression found on `main` (not from this chat's commits):** commit `de75fd8` (PR #15, "wizard rebuild") changed `mobile/app/apply/index.tsx` to import `SheetAnswer`, `FixedValue`, `cleanForm`, `NATIONALITY_OPTIONS`, `reviewQuestions`, `answer`, `employmentQuestions`, but the files that export them were not in the commit. Metro still bundles it, but in the browser the first wizard question renders **no answers and a disabled Continue**: nobody can start an application from `main`'s mobile code. A fix exists on branch `claude/festive-goodall-8qekxb` (`c87580f`, no PR yet): 0 type errors, and the wizard renders its destination picker. `mobile-app` (which CI publishes to the EAS `preview` channel) does not contain `de75fd8` and type-checks clean. `main` and `mobile-app` have diverged; neither contains the other.

**Resolved on `main` (2026-10-23, `e2e7340`):** PRs #49 (`mobile-app` merged into `main`) and #50 replaced the broken wizard. Re-checked: `npx tsc --noEmit` 0 errors; in the web build the wizard runs destination → nationality (visa-required list) → city (7 emirates) → name with no page errors. The fix branch `claude/festive-goodall-8qekxb` is now obsolete: it conflicts with `main` and must not be merged.

**Still open from §10 on `main`:** B3 (webhook secret optional), B4 (EAS preview DB), B5, H3 (receipt fallback), M15, M16. Fixed on `main` by later chats: B2 (upload auth + paid check), H4 (synthesised dossier row removed), H5 (SecureStore session + wipe on sign-out), M1 (ESLint), M2 (`eas.json`); B1 has a script (`scripts/006_tighten_visa_applications_rls.sql`), not confirmed applied.

---

## 14. Status audit (2026-10-23)

Goal: one accurate picture of what exists and what is live. The summary and the blocker table are in `mobile/HANDOFF.md` §0;
this section keeps the evidence. Read-only except docs: no app behaviour was changed.

### 14.1 Branches (origin, fetched 2026-10-23 ~00:20 UTC)
Judged by content, not SHA (several PRs were rebase-merged). "Into main" = what `git merge-tree` says a merge would do.

| Branch | Verdict | Notes / commits worth keeping |
|---|---|---|
| `app-return`, `pay-server-price`, `wizard-ux` | merged (PRs #5, #4, #3) | – |
| `claude/blissful-babbage-1u96lk` | merged (PR #14) | check-payment by applicationId is live |
| `claude/exciting-knuth-7tbcir` | merged (PR #15, de75fd8) | its leftovers remain on `main` only |
| `claude/sweet-wozniak-fqxk36` | merged (PR #22 into `mobile-app`, then `main`) | – |
| `claude/ezvisa-mobile-dev-e9zw25`, `trusting-bardeen-54koiu`, `upbeat-cori-re61og`, `vibrant-dijkstra-rrtz3m`, `awesome-goodall-nt66td`, `dreamy-babbage-wrfbwx`, `hopeful-fermi-kt6hbd`, `inspiring-turing-breyok`, `trusting-turing-pgtmb3` | merged | – |
| `claude/festive-goodall-8qekxb` | superseded | its fix for de75fd8 is no longer needed (`main`'s `apply/index.tsx` is `mobile-app`'s); the v10 features it completes would need a re-port (5 conflicts) |
| `claude/nifty-meitner-gtmztg` | superseded | only the date-range picker idea |
| `claude/ios-expo-app` | superseded | – |
| `claude/vibrant-wright-ez44ch` | **unmerged, keep** | 18718cd, 8a05aab, 10b873a, 783d202, 17b6d52, ed2d51d, 508d08b + e2e part of 2d6911d (manual merge) |
| `claude/nice-faraday-r722ry` | **unmerged, keep** | all 15 (website draft sync); merges into `main` cleanly, reverts nothing |
| `claude/trusting-bell-9yvqmh` (PR #19) | **unmerged, competing** | e4a0620 already on `main`; b26e583/3ce66d9/b7ecc5a = nice-faraday's first three; 271c89a + 431f9d1 = separate website rewrite |
| `claude/bold-feynman-ssk2ur` | **unmerged, keep** | fedc1a0, 1664e54 (port; don't take its 0012 → 0013 rename) |
| `claude/lucid-noether-l06cin` | **unmerged, partly** | 836b046 (applies cleanly), bd9ff69, 9a33639, parts of c5785c9 / 683495a, 7644a05 (proposal) |

### 14.2 Checks run (cloud container, no device, no live DB)
| Check | `main` 7be29de | `mobile-app` aad5052 |
|---|---|---|
| `npm ci`, `npx tsc --noEmit` | pass, 0 errors | pass, 0 errors |
| `npx eslint .` | 0 errors, 160 warnings | 0 errors, 165 warnings |
| upload 24, privacy 41, secure storage 12, check-push 12, push tests 29, timeline 53, appointment 18, payment split 25, profile 31 | pass | pass |
| `run-test-after-payment.mjs` | 37 pass | crash (stub without `getSession`; v10.7 says it updated the stub) |
| `drafts-check.ts` (with its documented env) | 6 pass | **1 FAIL**: real regression, HANDOFF §0.3 N1 |
| `wizard-rules.test.ts` | FAIL (imports exports that don't exist) | not present |
| web e2e (mock DB): drafts 17, drafts QA 7, continue 32, nav 9, UI 19, pay 20 | pass | pass |
| `auth-e2e-web.mjs`, `e2e-prefill-web.mjs` (on `ebc4f9a`) | 27/29 and stalls: outdated assertions | not run |
| first wizard question in Expo web (de75fd8 bug) | renders 29 destinations; tapping one opens Nationality | – |
| website `pnpm install`, `pnpm build` | pass | – |
| website `pnpm lint` (= `tsc --noEmit`) | 2 errors (§0.3 N5) | – |

### 14.3 Live checks (2026-10-23)
- Vercel: www.ezvisa.net → project `e-zvisa-anitgravity`; Production deployment = `7be29de`, READY. Env names in HANDOFF §0.1 (values not read).
- `GET https://www.ezvisa.net/api/check-payment?applicationId=00000000-0000-4000-8000-000000000000` → 404 `{"error":"Application not found"}`.
- EAS: GitHub run 26 published update group `5a2c2adf-d73c-404d-b7f6-a567db092f02` (`mobile-app` 2137710, runtime exposdk:57.0.0) after the bundle guard passed.
- Supabase `ezvisa-uae`: not reachable from the connector (it lists only `rjbgteqgqaxalcfnksjc` and other projects). The owner runs `docs/live-state-check.sql`.
