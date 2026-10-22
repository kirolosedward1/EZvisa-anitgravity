# EZvisa app: QA and release readiness (chat 15)

Date: 22 Oct 2026. Code: `mobile/` on branch `claude/vibrant-wright-ez44ch`, which is `origin/mobile-app` @ `591aced` plus the commits listed in section 6 (fast-forwardable onto `mobile-app`).
Expo SDK 57.0.30, React Native 0.86.3, expo-router 57.

## 0. Read this first: what could and could not be tested here

This QA ran in a cloud container with **no iPhone, no simulator, no EXPO_TOKEN**. The network policy also **denies** `api.expo.dev`, `u.expo.dev`, `*.supabase.co` and `www.ezvisa.net` (proxy answers 403). The Supabase connector only sees the old project `rjbgteqgqaxalcfnksjc` and returns "permission denied" for `dravvaykssrbktztmrlj`.

| Method | Used for |
|---|---|
| **Static review** of the code (file:line below) | logic, wizard rules, keys, fake data, RLS-dependent paths |
| `npx tsc --noEmit`, `npx eslint .` | type-check and lint |
| `npx expo export` (ios + android + web) | the bundle builds; bundle contents grep |
| `npx expo config --type introspect` | the final iOS Info.plist (permission strings, privacy manifest) |
| **Playwright on the web build** (react-native-web) at **390×844 and 430×932**, light + dark, English + Arabic, plus a "largest text" run (the app's `__FONT_SCALE__` simulation, ×3 capped per role like iOS) | layout, RTL, translations, wizard flow, offline banner. 190 automated checks, 0 failures (`docs/qa/web-checks.json`) |

**Not possible here, so marked NOT RUN:** real iPhones, VoiceOver, iOS Dynamic Type, Face ID, camera/scanner, push, Ziina payment, uploads, sign-in, drafts across devices, expired session, and live cross-account queries. Web rendering is an approximation of iOS, not a substitute. Nothing below is reported as passing on a device.

Legend: **PASS** verified by the method named · **FAIL** verified broken · **NOT RUN** needs a device or the live services · **BLOCKED** cannot run until something outside the app is fixed.

## 1. Test matrix

| # | Area | Case | Result | Evidence |
|---|---|---|---|---|
| 1 | Sign in | Email + password against live auth | NOT RUN | `supabase.co` denied from this container. Code: `components/AuthForm.tsx` |
| 2 | Sign in | Google / Apple buttons hidden while the provider is off | PASS (static) | `AuthForm.tsx` reads `googleEnabled()` / `appleEnabled()`; fixed a use-before-declare of `apple` state |
| 3 | Wizard (pre-payment) | Destination → Nationality (visa-required only) → Residence (UAE only) → City (7 emirates, no flags) → Emirates ID → name, email, phone, DOB → Valid passport → Passport number → Expiry | PASS (web, 10 runs) | `web-checks.json` ids `wizard-order`, `residence-uae-only`, `city-emirates`, `city-no-flags`; sheets `docs/qa/wizard-04.jpg`, `wizard-11.jpg`, `wizard-12.jpg` |
| 4 | Wizard | Valid passport "No" → note "You can continue… add it later", Continue moves to Marital Status; Back + "Yes" → Passport Number | PASS (web, 10 runs) | ids `passport-no-note`, `passport-no-continues`, `back-to-passport`, `passport-number-after-valid`; sheet `wizard-11-no.jpg` |
| 5 | Wizard | Review lists "To get later: Valid passport, Emirates ID" and has no missing-answer errors | PASS (web, 8 combos) | `docs/qa/review.jpg` (button reads "Unavailable" only because this build has no Supabase key) |
| 6 | Wizard (employed) | Continue application: job title + company, start date, salary, NOC (optional; "No" → "add it later") | PASS (static) / NOT RUN (device) | `app/continue/[id].tsx:83-99`; needs a paid application to render |
| 7 | Wizard (self-employed) | Company + average income, **no NOC** question, NOC removed from checklist | PASS (static) | `continue/[id].tsx:46` (`hasNOC: emp ? … : ""`), `lib/questions.ts:77` (`applies: EMP`), `lib/data.ts:73` (`listRequirements` drops `nocCertificate`) |
| 8 | Drafts web ↔ app | Draft row (`application_status='draft'`) resumes on another device | NOT RUN | live DB unreachable. Logic `lib/form.tsx`; last live pass was chat 13 (`HANDOFF.md` §3) |
| 9 | Drafts (local) | Several local drafts, kill and reopen at the same question | NOT RUN (device) | `lib/form.tsx` |
| 10 | Payment | Ziina in-app auth session, app-return, DB-verified result | BLOCKED | `www.ezvisa.net` denied here. `HANDOFF.md` §3 says `/api/create-payment` returned 500 (no `ZIINA_API_KEY` on Vercel); not re-verified |
| 11 | Uploads | Website route, then direct bucket fallback, 5 MB limit | NOT RUN | `lib/data.ts uploadDocument`, `lib/uploads.ts` |
| 12 | Checklist | Per-document state from `document_reviews`, NOC hidden for non-employed | PASS (static) | `lib/checklist.ts`, `app/(tabs)/applications/[id].tsx` CheckRow (labels now translated) |
| 13 | Scanner | Camera / library capture + quality checks | NOT RUN (device) | `lib/capture.ts` |
| 14 | Offline queue | Upload queue waits offline, backoff with jitter, retry/remove | NOT RUN (device) | `lib/uploads.ts` |
| 15 | Offline use | Offline banner appears; wizard keeps answers on the phone | PASS (web) | id `offline-banner` (10/10); `docs/qa/offline.jpg`. Banner now translated |
| 16 | Home timeline | Real timestamps only | PASS (static), see issue S3-4 | `lib/data.ts:111-113` |
| 17 | Notifications | Screen opens; signed-out empty state; Arabic | PASS (web) | `docs/qa/notifications.jpg`; screen was fully English in Arabic mode before this chat (fixed) |
| 18 | Push | Token saved in `device_tokens`, tap opens the application | NOT RUN (needs a dev build / device) | `lib/push.ts`, `migrations/0006` |
| 19 | Arabic RTL | `dir=rtl`, Arabic text on every screen tested | PASS (web) | ids `*:rtl` (40/40); every `t("…")` key in app/components/lib has an Arabic entry (scan: 803 keys, 0 missing) |
| 20 | Dark mode | All tested screens, both widths | PASS (web) | every sheet in `docs/qa/` has dark columns |
| 21 | VoiceOver | Labels and roles | PASS (static) / NOT RUN (device) | scan of all 67 tappables: each has `accessibilityRole` and a label or visible text. Wizard moves focus to the question title (`app/apply/index.tsx:189`) and announces errors (`:200`) |
| 22 | Largest text | Text wraps, nothing clipped, buttons reachable | PASS (web simulation) / NOT RUN (iOS) | `docs/qa/*-largest-text.jpg` (390 EN light, 430 AR dark) |
| 23 | Hit targets ≥ 44pt | All tappables | PASS after fix | password eye (~38pt) and search clear (~36pt) fixed. 36pt buttons have `hitSlop` 8–12 (≥ 52pt). Countries A–Z index letters are smaller, like the native iOS index (issue S3-3) |
| 24 | Expired session | Refresh / sign-out path | NOT RUN | `lib/supabase.ts` uses `autoRefreshToken` + `persistSession` |
| 25 | Double taps | Submit is idempotent; + button debounced 800 ms | PASS (static) | `lib/form.tsx` ref-based draft id; `components/nav/TabBar.tsx` `last.current < 800` |
| 26 | Cross-account access | Account B cannot read or change account A's application, documents or tokens | **NOT VERIFIED LIVE** (see §2) | static review only |
| 27 | Layout 390 / 430 | No horizontal scroll | PASS (web) | ids `*:no-hscroll` (60/60) |
| 28 | Build | `npm ci` from the lock file | **FAIL → fixed** | the lock file lacked `expo-calendar`, so `npm ci` (what EAS Build runs) failed. Fixed in `3267d83` |
| 29 | Build | iOS + Android bundles | PASS | `expo export --platform ios --platform android`: 1939 / 2026 modules, exit 0 |
| 30 | Type-check / lint | `npx tsc --noEmit`, `npx eslint .` | PASS | 0 errors (lint: 0 errors, 140 warnings, see §5) |

## 2. Cross-account access (static review)

Not run live: no database access from here. What the code and migrations say:

- **App queries** always go through the user's Supabase session (anon key + JWT). Every read by id also filters `.eq("email", u.email)` (`lib/data.ts:132, 168, 208, 223, 270`). Most writes do too (`:226, 268, 325`). Four follow-up writes filter by id only, right after an email-filtered read of the same row (`:171, 211, 214, 273`), so for those RLS is the only guard. RLS is the real guard everywhere.
- **RLS on `visa_applications`** (migrations 0002 / 0007, marked APPLIED): update only where `lower(email) = lower(auth.jwt()->>'email')`. The select policy "Users can view own submissions" (same email rule) is in `db/proposed-live-changes.sql` block 3. `AUDIT-V2.md` §2 (19 Oct, read-only check) says it is live, but I could not re-check it.
- **`device_tokens`**: `user_id = auth.uid()` on select, insert, update and delete (0006).
- **Storage `visa_documents`**: own-folder policies (`foldername[1]` = an application id whose email = JWT email).
- **Risk to verify (S1):** ownership is by **email in the JWT**. That is only safe while **email confirmation is required** (Supabase Auth → "Confirm email" ON). If it is off, anyone can sign up with someone else's email and read their applications, including passport numbers. Guest checkout makes this more likely, because rows exist before the owner has an account.

**To run live (5 min, needs the owner):**
1. In the SQL editor, `select policyname, cmd, qual, with_check from pg_policies where tablename in ('visa_applications','device_tokens') or (schemaname='storage' and tablename='objects');`
2. Check `GET https://dravvaykssrbktztmrlj.supabase.co/auth/v1/settings` → `mailer_autoconfirm` must be `false`.
3. Two test accounts (`+ezvisa-app-test` emails): as B, `select * from visa_applications where id = '<A's id>'` returns 0 rows; `update … set additional_notes='{}' where id='<A's id>'` updates 0 rows; `storage.from('visa_documents').list('<A's id>')` returns nothing.

## 3. App Store readiness

| Item | Status | Notes |
|---|---|---|
| App icon 1024×1024, no alpha | PASS | `assets/icon.png` RGB 1024² |
| Splash light + dark | PASS | `splash-icon.png` / `splash-icon-dark.png` 600², white / black background |
| Permission strings | PASS after fix | Camera, Photos, Face ID, Calendar have specific strings. **Removed** the generic Microphone string (image picker never records video) and Reminders string (only the system add-event sheet is used). Verified with `expo config --type introspect` |
| Arabic permission strings | OPEN (S3) | Info.plist strings are English only; needs `locales` in app.json |
| Privacy manifest | ADDED | `ios.privacyManifests`: tracking false + required-reason APIs (UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, DiskSpace E174.1) |
| App privacy labels (App Store Connect) | OWNER | Declare: name, email, phone, DOB, passport number, documents (photos/files), purchase history; linked to the user; not used for tracking |
| Export compliance | ADDED | `ITSAppUsesNonExemptEncryption: false` |
| Account deletion in-app (5.1.1(v)) | PASS (static) | Account → Delete account → two-step confirm → `delete-account` edge function (header says deployed 21 Oct, owner-approved), WhatsApp/email fallback. Not run live |
| Sign in with Apple (4.8) | **BLOCKER if Google ships** | Apple is hidden until the provider is enabled. If Google sign-in is on in the release, Apple must be too |
| No placeholder content | PASS after fix | removed the unused web-port review (it had a "readiness score"); receipts now use only the stored `payment_amount`. grep for lorem/mock/fake/98%/5,000/testimonial: none in shipped code |
| iPad | DECISION | `supportsTablet: true` means App Review tests on iPad and needs iPad screenshots. Set it to `false` unless iPad layouts are QA'd |
| eas.json | ADDED | development / preview (channel `preview`) / production (channel `production`, autoIncrement). Build-time only |
| Store listing, screenshots, support URL, privacy policy URL | OWNER | https://www.ezvisa.net/privacy-policy exists on the website |
| Native build | NOT DONE | everything above takes effect in the first `eas build`; Expo Go ignores it |

## 4. Hard rules re-check

| Rule | Result | Evidence |
|---|---|---|
| Expo SDK 57 | PASS | `expo@57.0.30`; new dev deps only: `eslint ^9.39.5`, `eslint-config-expo ~57.0.0`, `globals ^14.0.0` (lint tooling, not bundled) |
| Publishable key only | PASS | grep `service_role\|SERVICE_ROLE\|sb_secret\|eyJhbGciOi` in app/components/lib/scripts/app.json/eas.json: none. iOS + Android bundles: no `service_role`, no old DB ref `rjbgte`, no `vercel.app`. The one `http://localhost:3000` string is expo-router's own default (`node_modules/expo-router/build/head/url.js`), not app config. `.env` / `.expo-token` git-ignored and untracked |
| No fake data | PASS after fix | see §3. Open question S2-2 (the "24–48h processing" tile) |
| Nationality: one choice, visa-required list | PASS | `lib/questions.ts:41-42` (`SCHENGEN_VISA_REQUIRED`), `lib/wizard.ts:125` |
| Residence UAE only | PASS | `RESIDENCE_COUNTRIES = ["United Arab Emirates"]`, `coerceResidence` |
| City = 7 emirates, no flags | PASS | `UAE_EMIRATES`; web check `city-no-flags` |
| Valid passport before passport number | PASS | question order `lib/questions.ts:52-57`; web check `passport-number-after-valid` |
| No NOC for self-employed | PASS | see matrix #7 |
| "No" to a document never blocks (new, owner request in this chat) | PASS (web) | matrix #4 / #5 |
| Branch is mobile-app | PARTIAL | work is based on `origin/mobile-app` and pushed to `claude/vibrant-wright-ez44ch` (the only branch this session may push). `mobile-app` can fast-forward to it. Nothing was merged into `main` |

## 5. Open issues (not fixed here)

**S1 (blocks release or risks data)**
1. **Cross-account safety not verified live.** Depends on email confirmation being ON (see §2). Must be checked before production testing.
2. **EAS Update not published** (see §7). The preview channel still serves group `e866e894…`, which per `HANDOFF.md` points at the **old DB** `rjbgteqgqaxalcfnksjc`. Testers on `preview` today are not testing this code.
3. **Website server env.** Per `HANDOFF.md` §3 (19 Oct, not re-checked): `/api/upload-document` and `/api/create-payment` returned 500 (missing Supabase service role / Ziina key on Vercel), and the Supabase Auth Site URL was `http://localhost:3000`. If still true, payment and the upload route fail. (The direct bucket upload path is the fallback.)

**S2 (strong friction or a decision needed)**
1. Sign in with Apple must be enabled if Google ships on iOS (App Store 4.8).
2. Country page tile "24–48h · processing" appears for every country. It matches the website's file-turnaround claim, but it can be read as embassy processing (15–30 days per the website FAQ). Suggest relabelling it "file ready", or removing it.
3. `migrations/0007_customer_discard.sql` says "NOT APPLIED" in its header, but commit `d3af779` says it was applied. Confirm which is true.
4. The website `/apply` (main, `429c03d`) still blocks on valid passport "No". The app now continues. Decide whether the website should match.
5. Pre-ticked "Receive application updates via WhatsApp" on the phone question. Consent is usually opt-in (unticked).

**S3 (polish)**
1. Lint: 140 warnings (unused vars, duplicate imports, hook deps, React Compiler-only rules downgraded to warnings because the compiler is not enabled). No errors.
2. Info.plist permission strings are English only.
3. Countries A–Z index letters are smaller than 44pt (same as the native iOS index).
4. The timeline uses `updated_at` as the time of the current status; any autosave moves it. The receipt "Date" is also `updated_at`. A real status-change timestamp needs a column or trigger (DB change, needs approval).
5. The offline banner overlaps the country page's floating back button (visual only; the banner passes taps through).
6. The manual "Add document" sheet lists "NOC / employment" even for self-employed applicants.
7. `HANDOFF.md` §1–3 describe the 19 Oct state (e.g. "no notifications / push tables") and are stale. Chat 15 adds a status section on top.

## 6. Commits in this chat (all in `mobile/`)

| Commit | Change |
|---|---|
| `3267d83` | lock file synced (`npm ci` works), eslint config, Deno functions excluded from tsc |
| `78a71a0` | removed unused web-port `components/wizard/steps.tsx` + `payment.tsx` |
| `386f5cf` | Arabic: notifications, checklist rows, offline banner, country page, app card, tab-bar label, Discard dialog (+16 keys) |
| `4f08096` | lint 0 errors |
| `9c19e97` | 44pt password-eye and search-clear buttons |
| `490d4f1` | privacy manifest, unused permissions removed, export compliance, `eas.json` |
| `d6c14ee` | receipts only from the stored `payment_amount` |
| `3ed5349` | country page fully Arabic + mirrored back chevron |
| `9ea8e91` | valid passport "No" message shown once |
| `af81f75` | "No" to a document continues, with "To get later" on the question, Review and the application page; saved as `additional_notes.missingDocuments` |
| (this commit) | QA report + evidence sheets in `docs/qa/` |

## 7. EAS Update (preview)

**Not published.** No `EXPO_TOKEN` is in this environment, and `api.expo.dev` / `u.expo.dev` are denied by the network policy. **No EAS Update ID was produced.**

Configured command (from `HANDOFF.md` §3/§4 and the new `eas.json`; preview channel only, never production):

```bash
cd mobile
# 1. EAS → Project → Environment variables → preview: EXPO_PUBLIC_SUPABASE_URL=https://dravvaykssrbktztmrlj.supabase.co,
#    EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>, EXPO_PUBLIC_SITE_URL=https://www.ezvisa.net; delete EXPO_PUBLIC_WEB_URL
npx eas-cli@latest env:pull --environment preview      # writes .env.local
npx expo export --clear --platform ios --platform android --output-dir dist
grep -c dravvaykssrbktztmrlj dist/_expo/static/js/ios/*.hbc   # must be >= 1
grep -c rjbgteqgqaxalcfnksjc dist/_expo/static/js/ios/*.hbc   # must be 0
EXPO_TOKEN=… npx eas-cli@latest update --branch preview --environment preview --skip-bundler --input-dir dist --platform all \
  --message "chat 15 QA: Arabic fixes, document 'get later', 44pt targets, receipts"
```

## 8. Final status

**NOT READY FOR PRODUCTION TESTING.** Blockers:
1. EAS Update not published; the preview channel still serves a bundle that points at the old database (S1-2).
2. Cross-account access not verified on the live project, and it depends on email confirmation being on (S1-1).
3. Payment and the website upload route were last seen failing because of missing server env on Vercel (S1-3).
4. No real-device pass yet: VoiceOver, Dynamic Type, Face ID, camera, push, uploads and payment need one run on a 390pt and a 430pt iPhone using `QA-CHECKLIST.md`.
