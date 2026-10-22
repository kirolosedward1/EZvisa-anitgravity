# EZvisa modernisation, step 1: audit (no code changes)

Date: 19 Oct 2026 (Europe/Berlin). Scope: the Expo app v6 (`/workspace/ezvisa/mobile`, EAS update group `0d8e1bde…`) and the website's `/apply` flow (repo `kirolosedward1/EZvisa-anitgravity`, live at www.ezvisa.net).
Method: code review of both repos, the live site (HTML, JS chunks, headers), read-only Supabase queries on `rjbgteqgqaxalcfnksjc`, and the v6 Playwright click-through (46/46 checks, light and dark). No real iPhone or Android was tested, so speed and VoiceOver findings below come from the code, not from device runs.

## 0. Which website build is in production

| Item | Finding |
|---|---|
| Default branch | `main`, HEAD `cae9f63` ("Merge PR #1 vibrant-dijkstra", 23 Sep 2026 00:52 +03:00). Other branches: `claude/ios-expo-app` (`789d436`, 11 Oct, the earlier app work, not merged) and `claude/vibrant-dijkstra-rrtz3m` (already merged). |
| Live build | Vercel deployment `dpl_GXB3PJt2EdFmq1zV5Uw6NHSCcUgq`, cache age about 26 days, so built around 22–23 Sep. The live header has the "My account" icon linking to `/dashboard` and no Tools link. That matches `f23aeee`, which is inside `main@cae9f63`, so **production is very likely `main@cae9f63`**. |
| Vercel project | There are two candidates: `e-zvisa-anitgravity` (repo homepage `e-zvisa-anitgravity.vercel.app`) and an older `ezvisa`. The Vercel API returned 403 for this team on both connectors, so I could not confirm which one serves the domain. The user should check in Vercel → Domains. |
| Website database | `/api/submit-application` writes `visa_applications`. Other web code uses `visa_documents` and `email_logs`, and the server uses the service-role key from env. **These tables are not in `rjbgteqgqaxalcfnksjc`.** The old DB isn't in the Supabase org these connectors can see. |
| New DB (app) | `rjbgteqgqaxalcfnksjc`: 0 applications, 0 profiles, 0 push tokens, 29 countries, 11 document requirements, 1 package. There are no Edge Functions, and `pg_net` and `pg_cron` are not installed. |

## 1. Ranked friction points and gaps (worst first)

Severity: **S1** blocks users or loses data · **S2** strong friction or drop-off · **S3** polish or accessibility debt.

| # | Sev | Where | Problem | Why it hurts |
|---|---|---|---|---|
| 1 | S1 | Backend | **The website and the app use different databases.** Web: old `visa_applications`. App: new `applications` schema. | A customer who applies on the web sees nothing in the app. App applications don't show in the web admin dashboard. Nobody has a tool to move app statuses, so the timeline and status pushes have nothing to show. |
| 2 | S1 | Payment | No real in-app payment. The app falls back to WhatsApp. The Ziina endpoint `/api/create-payment` belongs to the old DB. It **trusts the `amount` the client sends** and **defaults `test` to `true`** if the flag is omitted. | Users can't pay in-app. Security: the price can be tampered with, and a test payment can be marked as real. The fix must be server-side. |
| 3 | S1 | Auth | Sign-up hits the Supabase **email rate limit** (default SMTP). The Google provider isn't configured. The redirect allow-list (`exp://**`, `ezvisa://**`) isn't set. Sign-in is demanded **at the end**, after 15 screens. | Most new users can't create an account, so they can't submit. The late login wall is the worst place for drop-off. |
| 4 | S1 | App wizard | **No autosave or resume.** The form lives only in memory (`FormProvider`). The website does have this (localStorage `visa_wizard_data` plus a resume prompt). | Killing the app, a crash, or an OS memory purge loses up to 15 screens of input. |
| 5 | S2 | Web + app | **Nationality is limited to 10 options and residence to 8**, with no free text. That matches the web, but the web at least has search. Phone has no country-code picker. | Everyone else (e.g. Lebanese, Nigerian, Indian residents of Oman…) can't apply truthfully. They drop off or pick the wrong value. |
| 6 | S2 | App wizard | Long flow: **15 screens plus review**. Several screens bundle 2–4 questions: residence (country, city, Emirates ID), contact (4 fields), dates (+ flexible), history (3), stay (2), funds (2). | This doesn't meet the brief's "one question per screen". Cramped long scrolls on small phones, and the CTA sits far from the field that has the error. |
| 7 | S2 | Review | "Edit" jumps to the **start of the step**. To get back to Review you walk every following screen again. | Fixing one typo can cost 10 taps. You need "edit this field, then back to Review". |
| 8 | S2 | Accessibility | **Errors aren't announced on iOS.** `accessibilityLiveRegion` is Android-only. Focus isn't moved to the new page title when the screen changes. Web errors appear only as a banner at the top. | VoiceOver users can't tell why Continue did nothing. They hear the old focus after each screen change. |
| 9 | S2 | Dashboard | Home shows a pass for one active application. There is **no single "next action"** (upload X, pay, book appointment). The timeline reads real `application_status_history`, but statuses never change (see #1). | The main promise ("we handle it, here's your one thing to do") is missing after submit. |
| 10 | S2 | Documents | Uploads use the file picker only. There's no camera scanner, crop, or quality checks. The **`document_requirements` table (11 rows) isn't used by the app**, so there's no per-country checklist. Upload failures show an error but don't retry or queue. | Documents are the main source of rework. Users don't know what's missing, and bad photos get uploaded. |
| 11 | S2 | Push | Tokens are registered (`lib/push.ts` → `push_tokens`), but **nothing sends**: no Edge Function, DB webhook, or `pg_net`. There's no notification-tap handler, so no deep link. Android Expo Go can't receive remote push (since SDK 53). | Users get no "status changed" alerts. When pushes do arrive, tapping them won't open the case. |
| 12 | S2 | i18n | **No Arabic or RTL** in the app or the web UI. The web has Arabic email templates only; `profiles.preferred_language` exists. | Arabic is a core language for this market. |
| 13 | S3 | Contrast | Light mode: secondary text `rgba(60,60,67,.62)` is **3.6:1 on white and 3.5:1 on cards**. Tertiary is **1.7:1** and is used for placeholders, "Select date" (Android/web) and chevrons. Dark mode: white on tint `#4D6BFF` is **4.32:1** (primary buttons and selected choice rows), and tint text on `#1C1C1E` is **3.9:1**. | These fail WCAG AA (4.5:1) for 13–17pt text. Readability suffers outdoors and for low-vision users. |
| 14 | S3 | Dynamic Type | All text is capped at **1.6×** (`maxFontSizeMultiplier`). Several fixed heights clip or crowd at accessibility sizes: ChoiceTile 112, SegmentedControl 36, DateCard, 2-column tiles with `numberOfLines=1`. | Users with large text settings get truncated labels. |
| 15 | S3 | Touch targets | Visual size below 44pt: CircleButton 40 (hitSlop 8 makes it OK), Segmented 36, DateCard "Select" pill 36, remove-country icon 22 + 8 slop = **38pt (too small)**, header "Mark all read" text. | Taps get missed, especially for older users. |
| 16 | S3 | Speed | Applications and Home refetch the full nested select on every focus, with no cache or optimistic UI. Upload has no progress bar. Nothing has been measured on a device. | This will feel slow on mobile data. |
| 17 | S3 | Web `/apply` | Personal is one page of 15 fields and Trip is one page of 12 required fields. Errors are a single generic banner. "Do you have a valid passport? No" still lets you continue with no guidance. | High cognitive load, and the web is where most traffic still lands. |
| 18 | S3 | Help | There are no in-field tips (why we ask, what counts as a refusal, salary vs. NOC). Support (WhatsApp/email) is only in Account and on the review success screen. | Users stall on unclear questions instead of asking. |

## 2. Wishlist feasibility

"Expo Go" means it can ship today as an OTA update to the existing Expo Go link. "Build" means it needs an EAS dev or standalone build, an Apple Developer account ($99/yr), TestFlight, and later App Store review.

| Wishlist item | Expo Go SDK 57? | Needs a build? | Backend work |
|---|---|---|---|
| Arabic + English, RTL | **Yes.** expo-localization is in Expo Go. `I18nManager.forceRTL` plus a reload works. | For the shipped app: set `supportsRTL`/locales in app config (a build-time setting). | Arabic copy for countries and `document_requirements`: an additive migration (`*_ar` columns or a `translations` jsonb). Use `profiles.preferred_language`. Web emails already have `ar`. |
| One question per screen, smart defaults, searchable pickers | **Yes** (pure JS). | No | None for the UI. A full nationality and residence list replaces the 10/8 options. If the web adopts it too, the website needs the same list, but it currently stores free text, so nothing breaks. |
| Autosave and resume | **Yes**: AsyncStorage locally. | No | Cross-device or web↔app resume needs a server draft: either an `applications` row with status `draft` (already allowed by the guard) or a new `application_drafts` table (additive). True web↔app resume needs blocker #1 fixed first. |
| Dashboard with one next action and a real timeline | **Yes.** | No | Real status changes by staff: an admin tool on the new DB (or Supabase Studio as a stopgap). The next action is derived from status, `documents` vs `document_requirements`, and `payments`. Possibly an `applications.next_action` view or RPC. |
| Document scanner with crop, blur and glare checks, missing-docs checklist | **Partial.** Checklist: yes. Camera capture: expo-camera / expo-image-picker plus expo-image-manipulator for crop. Simple JS blur/glare heuristics are possible but weak. | **Yes** for a real edge-detecting scanner (VisionKit / ML Kit document scanner native module). | Checklist from `document_requirements` (exists). Optional server-side quality check in an Edge Function. Storage bucket `visa_documents` exists. |
| Passport camera reading (MRZ), user confirms | **Partial**: only with server OCR (photo goes to an Edge Function calling an OCR API). | **Yes** for on-device MRZ (Vision / ML Kit), which is better for privacy. | OCR Edge Function and vendor key if server-side. No new tables; the user confirms, then the fields fill `applicants`. Needs DPA / privacy-policy wording. |
| Face ID | **No.** Expo docs: Face ID isn't supported in Expo Go on iOS (falls back to passcode). | **Yes** (`NSFaceIDUsageDescription` via the plugin). | None. It's a local app lock over the existing Supabase session (SecureStore). |
| Sign in with Apple | Test only (Expo Go's bundle ID). | **Yes** for production (`net.ezvisa.app` capability). | Supabase Apple provider (Services ID, key). Apple requires it if Google sign-in ships on iOS. |
| Passkeys | **No.** Needs a native passkey module and associated domains. | **Yes**, plus `apple-app-site-association` on ezvisa.net. | Supabase passkeys are **beta/experimental** (supabase-js ≥ 2.105; the app has ^2.109). Set RP ID `ezvisa.net` and keep it stable. The website must host the AASA file: an additive web change. |
| Push for real status changes, with deep links | **iOS Expo Go only**, for testing. Android Expo Go: no. | **Yes** for production (APNs/FCM credentials). | DB webhook (or trigger with `pg_net`) on `application_status_history` / `notifications` insert → Edge Function → Expo Push API. Add a tap handler that routes to `/applications/[id]`. Respect `notification_preferences.push_enabled`. |
| Live Activities and a widget | **No.** | **Yes** (native widget/ActivityKit target via a config plugin). | ActivityKit push tokens are separate from Expo push. The Edge Function must send APNs directly. Status, next action and appointment are read from the DB. |
| Saved traveller profiles | **Yes** (UI). | No | New `travellers` table (user_id, names, DOB, nationality, passport no/expiry) with owner-only RLS. Additive migration, reviewed. Consider encrypting the passport number. |
| In-field tips, one tap to support | **Yes.** | No | Optional: tips in a table for Arabic and English. WhatsApp deep link already exists. |
| Passport-expiry and travel reminders | **Yes**: local scheduled notifications work in Expo Go. | No for local. A build is needed for server push on Android. | Server reminders: a scheduled Edge Function or `pg_cron` (not installed; enabling it is an additive extension). Uses `applicants.passport_expiry_date` and `entry_date`. |
| Offline mode and retrying uploads | **Yes**: AsyncStorage cache, NetInfo, a JS upload queue, and resumable TUS uploads to Supabase Storage. | A build is needed for uploads that continue in the background after the app is killed. | None. Storage TUS is supported. Idempotent document rows (unique path) to avoid duplicates. |

## 3. Current blockers (need the user or an account owner)

1. **Supabase email rate limit**: set custom SMTP (Resend, SES or Postmark) in Supabase Auth, and raise the auth rate limits. This blocks every email sign-up and magic link.
2. **Google OAuth**:
   - Create a Google Cloud *Web* OAuth client with redirect `https://rjbgteqgqaxalcfnksjc.supabase.co/auth/v1/callback`.
   - Enter it under Supabase → Auth → Providers → Google.
   - For a native build later, add iOS/Android client IDs.
3. **Redirect URLs**: add `exp://**`, `ezvisa://**` and `https://www.ezvisa.net/**` to the Supabase Auth allow-list. This can't be set through the connector.
4. **Payment endpoint**: create the Ziina payment on the new DB.
   - Use a server-side function that reads `applications.total_amount`, never a client amount, and makes `test` explicit server config.
   - Add a Ziina webhook that writes `payments`. The `payments_propagate` trigger already exists.
   - The current web endpoint is old-DB and client-trusting.
5. **Website still on the old DB**: decide the migration path (§4 Phase 0) before building cross-device features. Until then, web and app customers and staff live in separate worlds.
6. **Accounts**: Apple Developer Program enrolment is needed for everything marked "Build". The Vercel connector lacks access to the team scope, so the production project and domain couldn't be checked. Deleting the Expo project `ezvisa-ios` still needs the user's password (sudo mode).

## 4. Proposed phased roadmap

Rules held throughout: real backend data only; additive, reviewed migrations on `rjbgteqgqaxalcfnksjc` only; never break the website (no web deploys without a preview URL and a sign-off).

**Phase 0: unblock (backend and ops, about 1 week, mostly owner actions)**
- Do blockers 1–3 above.
- Add a server-side payment Edge Function plus the Ziina webhook on the new DB (blocker 4).
- **One source of truth.** Recommended: move the website's `/api/submit-application` and admin to the new schema behind a feature flag. Run a one-off, reviewed copy of the old `visa_applications` into `applications`/`applicants`, keeping the old tables read-only. Test on a Vercel preview first.
- Give staff a status tool on the new DB (port the web admin, or use Supabase Studio as a stopgap) so timelines and pushes are real.

**Phase 1: Expo Go OTA, fix the biggest friction (about 2 weeks)**
- Autosave and resume (AsyncStorage now, server draft later).
- Sign-in moved to the start of Review, or kept optional until submit, with the form preserved.
- One question per screen. Searchable full nationality and residence lists. Smart defaults: residence UAE, `+971`, nationality from profile.
- Review "edit field, then return".
- Accessibility pass:
  - announce errors with `AccessibilityInfo.announceForAccessibility`
  - move focus to the screen title on each step
  - contrast tokens ≥ 4.5:1
  - 44pt minimum targets
  - remove the 1.6× cap and replace fixed heights with min-heights
- Dashboard "one next action". Missing-docs checklist from `document_requirements`. In-field tips and a persistent support button.

**Phase 2: real-time and reliability (about 1–2 weeks, Expo Go-compatible except Android push)**
- Status webhook → Edge Function → Expo push. Notification tap opens the case.
- Local passport-expiry and trip reminders. A server reminder job (scheduled function).
- Offline cache, retrying TUS uploads, upload progress.
- Arabic + RTL: strings, plus additive `*_ar` content migration.

**Phase 3: native build (EAS Build + TestFlight, Apple Developer account)**
- Sign in with Apple, Face ID app lock, passkeys (Supabase beta; AASA on ezvisa.net as an additive web file).
- Universal links for `https://www.ezvisa.net/apply?...`.
- Android push.
- Native document scanner with quality checks.
- On-device MRZ reading with user confirmation.

**Phase 4: delight**
- Live Activities (appointment and status) and a Home-screen widget.
- Saved traveller profiles and family applications (new `travellers` table, RLS, reviewed migration).

**Exit checks for every phase:** tsc, expo-doctor, iOS and Android bundles, a light/dark click-through, VoiceOver spot-check on device, website preview unchanged, and migration review notes.
