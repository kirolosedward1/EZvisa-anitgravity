# EZvisa app: QA and release readiness (chat 15)

> **Superseded 2026-10-23 for anything about what is live or merged** (EAS preview, B2/B3/B4, branches, open issues): see `mobile/HANDOFF.md` §0. The test evidence below still describes the code it names.

Date: 22 Oct 2026. Code verified: `mobile/` on branch `claude/vibrant-wright-ez44ch` = **`origin/mobile-app` @ `89c1b26`** (chats 02–14, then 03, 06, 08, 09, 11, `main` and the passport-number move, all merged in) + the chat 15 commits in §7. `mobile-app` can fast-forward to it.
Expo SDK 57.0.30, React Native 0.86.3, expo-router 57.

> Chats 02–14, 03, 06, 08, 09 and 11 landed on `mobile-app` **while this QA was running** (09:19–10:30 UTC). This branch merged them four times, and every result below is from the **last merge**. Commits pushed to `mobile-app` after `89c1b26` are not covered.

## 0. What could and could not be tested here

This QA ran in a cloud container with **no iPhone, no simulator and no `EXPO_TOKEN`**. The network policy **denies** `api.expo.dev`, `u.expo.dev`, `*.supabase.co` and `www.ezvisa.net` (the proxy answers 403). The Supabase connector sees only the old project `rjbgteqgqaxalcfnksjc`; it returns "permission denied" for `dravvaykssrbktztmrlj`.

| Method | Used for |
|---|---|
| Static review of the code (file:line below) | logic, wizard rules, keys, fake data, RLS-dependent paths |
| `npx tsc --noEmit`, `npx eslint .` | type-check, lint |
| `npx expo export --clear` (ios + android + web) | the bundles build; bundle contents grep |
| `npx expo config --type introspect` | the final iOS Info.plist |
| Node tests in `scripts/` (stubbed native modules, no network) | privacy scrubbing, upload queue, SecureStore adapter, Home timeline |
| Playwright e2e on the web build with **mocked** Supabase / ezvisa.net (`auth-e2e-web.mjs`, `pay-e2e.cjs`, `e2e-drafts-web.mjs`) | sign-in/session, payment result, drafts across devices and web↔app |
| Playwright walk on the web build at **390×844 and 430×932**, light + dark, English + Arabic, plus "largest text" (the app's `__FONT_SCALE__` simulation, capped per role like iOS) | layout, RTL, translations, wizard flow, offline banner, Review |

**NOT RUN (needs a device or the live services):** real iPhones, VoiceOver, iOS Dynamic Type, Face ID, camera/scanner, push, a real Ziina payment, real uploads, the live database (including the live cross-account test). Web rendering approximates iOS; it doesn't replace it. Nothing below claims a device pass.

Legend: **PASS** verified by the method named · **FAIL** verified broken · **NOT RUN** needs a device or live services · **BLOCKED** needs something outside the app fixed first.

## 1. Results at a glance (final run)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | 0 errors (157 warnings) |
| `npm ci` | passes (the lock file had been missing `expo-calendar`; fixed) |
| iOS / Android bundle (`--clear`) | 1986 / 2081 modules, 5.4 / 5.6 MB. grep: `rjbgte` 0, `service_role` 0, `sb_secret` 0, `vercel.app` 0 |
| `run-test-privacy.mjs` | 24/24 |
| `run-upload-tests.mjs` (offline, lost response, duplicate, kill + restart, sign-out wipe) | 24/24 |
| `secure-storage-test.cjs` | 12/12 |
| `run-check.ts timeline-check.ts` | ALL PASS |
| `auth-e2e-web.mjs` (mocked GoTrue) | 29/29 |
| `pay-e2e.cjs` (mocked API) | **17/20 → 20/20** after the fix in `1a50987` |
| `e2e-drafts-web.mjs` (mock Supabase) | 17/17 |
| Web walk, 10 runs (8 combos + 2 largest-text), clean `--clear` build without keys | 235 checks, 0 failed (`docs/qa/web-checks.json`) |
| Review with "To get later", 8 combos | 8/8 |

## 2. Test matrix

| # | Area | Case | Result | Evidence |
|---|---|---|---|---|
| 1 | Sign in | Email + password, wrong password, unconfirmed email, rate limit, no internet, double tap, magic link, reset password | PASS (mocked) / NOT RUN (live) | `auth-e2e-web.mjs` 29/29 |
| 2 | Sign in | Signed-out start shows Welcome; guest can continue without an account | PASS (web) | walk check `welcome-signed-out`; `docs/qa/welcome.jpg` |
| 3 | Wizard (pre-payment) | Destination → Nationality (visa-required) → Residence (UAE only) → City (7 emirates, no flags) → Emirates ID → name, email, phone, DOB → Valid passport → Expiry (the passport **number** is asked after payment since `527dab4`) | PASS (web, 10 runs) | checks `wizard-order`, `residence-uae-only`, `city-emirates`, `city-no-flags`, `expiry-after-valid`; `wizard-04.jpg`, `wizard-11.jpg`, `wizard-12.jpg` |
| 4 | Wizard | Valid passport "No" → "You can continue… add it later", Continue goes to Marital Status; Back + "Yes" → Passport Expiry | PASS (web, 10 runs) | `passport-no-note`, `passport-no-continues`, `back-to-passport`, `expiry-after-valid`; `wizard-11-no.jpg`, `wizard-11-no-next.jpg` |
| 5 | Wizard | Review shows "To get later: Valid passport, Emirates ID" and no missing-answer error | PASS (web, 8/8) | `review.jpg` (the button reads "Unavailable" only because this build has no Supabase key) |
| 6 | Wizard (employed) | Continue application: job title + company, start date, salary, NOC optional ("No" → "add it later") | PASS (static) / NOT RUN | `app/continue/[id].tsx`; needs a paid application to render |
| 7 | Wizard (self-employed) | Company + income, **no NOC**, NOC not in the checklist | PASS (static) | `continue/[id].tsx` (`hasNOC: emp ? … : ""`), `lib/questions.ts` (`applies: EMP`), `lib/data.ts listRequirements` |
| 8 | Drafts web ↔ app | Autosave to one row, resume on a second device, conflicts, offline | PASS (mock) / NOT RUN (live) | `e2e-drafts-web.mjs` 17/17 |
| 9 | Payment | Result only from the server (webhook delay, cancel, forged deep link, forged payment id, closed, timeout, offline on return), one open payment per application, no client price | PASS (mock) after fix / NOT RUN (live Ziina) | `pay-e2e.cjs` 20/20. **Bug found and fixed:** a guest whose app restarted during checkout landed on Welcome instead of the result (`1a50987`) |
| 10 | Uploads | Allowed types after payment, session token, real progress, offline queue, restart, no duplicates | PASS (node) / NOT RUN (live) | `run-upload-tests.mjs` 24/24 |
| 11 | Checklist | Per-document status from `document_reviews`; NOC hidden for non-employed; no invented dossier file | PASS (static) | `lib/checklist.ts`, `lib/data.ts` (audit H4 fixed in chat 09 and here) |
| 12 | Scanner | Camera / library capture, crop, rotate, PDF | NOT RUN (device) | `lib/capture.ts`, `components/CropBox.tsx` |
| 13 | Offline use | Offline banner; wizard keeps answers on the phone | PASS (web) | check `offline-banner` 10/10; `offline.jpg` |
| 14 | Home timeline | Steps and next action only from the live row | PASS (node) | `timeline-check.ts` ALL PASS |
| 15 | Notifications | Push token, tap opens the application | NOT RUN (device / dev build) | `lib/push.ts`, `migrations/0006` |
| 16 | Arabic RTL | `dir=rtl`, Arabic everywhere tested | PASS (web) | checks `*:rtl`; every `t("…")` key in app/components/lib has an Arabic entry (scan: 0 missing) |
| 17 | Dark mode | All tested screens, both widths | PASS (web) | dark columns in every sheet |
| 18 | VoiceOver | Roles and labels; focus to the question title; errors announced | PASS (static) / NOT RUN (device) | every tappable has a role and a label or text; `app/apply/index.tsx` (`setAccessibilityFocus`, `announceForAccessibility`) |
| 19 | Largest text | Wraps, no clipping, buttons reachable | PASS (web simulation) / NOT RUN (iOS) | `*-largest-text.jpg` |
| 20 | Hit targets ≥ 44pt | All tappables | PASS after fixes | password eye on the old form and on the chat 03 sign-in screen (~38pt), search clear (~36pt). 36pt buttons have `hitSlop` 8–12. The countries A–Z index is smaller, like the native index |
| 21 | Expired session | Expired access token refreshes; revoked or deleted user is signed out with a message | PASS (mocked) | `auth-e2e-web.mjs` |
| 22 | Double taps | One sign-in request; one payment intent; idempotent submit; + button debounced | PASS | auth e2e, pay e2e, `lib/form.tsx`, `TabBar.tsx` |
| 23 | Cross-account | Account B can't read or change account A's data | **App side PASS (mocked); live RLS NOT VERIFIED** | auth e2e "second account sees only its own data"; see §3 |
| 24 | Layout 390 / 430 | No horizontal scroll | PASS (web) | checks `*:no-hscroll` |

## 3. Cross-account access

- **App side (PASS, mocked):** `auth-e2e-web.mjs` "second account sees only its own data". After sign-out, local user data is wiped ("sign out clears session + cached user data"). Every read by id also filters by the signed-in email (`lib/data.ts`).
- **Database side (NOT VERIFIED):** the real guard is RLS on the live project, and I can't reach it from here. The repo's notes disagree on what is live (audit B1/H8). Ownership is "row email = JWT email", which is safe only while **email confirmation is required**. If it isn't, anyone can sign up with someone else's email and read their applications, passport numbers included.
- **To close it (owner, about 10 minutes):** run the read-only queries in `docs/mobile-audit.md` §12 item 1, check `GET /auth/v1/settings` → `mailer_autoconfirm: false`, and after 0011 run `migrations/0011_check_document_access.sql` (rolls back). Then do two `+ezvisa-app-test` accounts: as B, select A's row by id (0 rows), update it (0 rows), list A's storage folder (empty).

## 4. App Store readiness

| Item | Status | Notes |
|---|---|---|
| App icon 1024², no alpha | PASS | `assets/icon.png` RGB |
| Splash light + dark | PASS | `splash-icon*.png`, white / black |
| Permission strings | PASS after fix | Camera, Photos, Face ID, Calendar are specific. **Removed** the generic Microphone (never records video) and Reminders (only the system add-event sheet is used) strings. Verified by `expo config --type introspect` |
| Arabic permission strings | OPEN (S3) | English only; needs `locales` in app.json |
| Privacy manifest | ADDED | tracking false + required-reason APIs (UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, DiskSpace E174.1) |
| App privacy labels (App Store Connect) | OWNER | name, email, phone, DOB, passport number, documents, purchases; linked to the user; no tracking. Diagnostics (crash, usage) if Sentry is approved |
| Export compliance | ADDED | `ITSAppUsesNonExemptEncryption: false` |
| Account deletion (5.1.1(v)) | PASS (static) | two-step confirm → `delete-account` edge function (header: deployed 21 Oct), WhatsApp/email fallback |
| Sign in with Apple (4.8) | **BLOCKER if Google ships** | Apple is hidden until the provider is enabled |
| Placeholder / fake content | PASS after fixes | unused web-port review removed (it had a "readiness score"); receipts use only `payment_amount`; no invented dossier file |
| iPad | DECISION | `supportsTablet: true` means App Review tests on iPad. Set `false` unless iPad is QA'd |
| `eas.json` | ADDED | preview → channel `preview`, production → `production` (build-time only) |
| Store listing, screenshots, support URL | OWNER | privacy policy: https://www.ezvisa.net/privacy-policy |
| Native build | NOT DONE | all native config takes effect in the first `eas build`; Expo Go ignores it |

## 5. Hard rules

| Rule | Result | Evidence |
|---|---|---|
| Expo SDK 57 | PASS | `expo@57.0.30`; chat 15 added no libraries |
| Publishable key only | PASS | grep in app/components/lib/scripts/app.json/eas.json: no service-role or secret key; bundles clean (§1); `.env*` git-ignored |
| No fake data | PASS after fixes | §4; open question S2-2 |
| Nationality single, visa-required | PASS | `lib/questions.ts`, `lib/wizard.ts` `SCHENGEN_VISA_REQUIRED` |
| Residence UAE only; city = 7 emirates, no flags | PASS | web checks |
| Valid passport before passport number | PASS | validity is asked in the wizard; the number after payment (`validatePassportNumber`, skipped when the answer is No) |
| No NOC for self-employed | PASS | matrix #7 |
| "No" to a document never blocks (owner, chat 15) | PASS | matrix #4/#5 |
| Branch is mobile-app | PARTIAL | work is based on `mobile-app` and pushed to `claude/vibrant-wright-ez44ch` (this session can push only there). PR [#13](https://github.com/kirolosedward1/EZvisa-anitgravity/pull/13) now targets `mobile-app` (retargeted from `main` on the owner's approval) |

## 6. Open issues

**S1 (blocks release or risks data)**
1. Live RLS / email confirmation not verified (§3, audit B1).
2. **EAS Update not published** (§8). Preview still serves `e866e894…`, which points at the **old DB**.
3. Website fixes live on `mobile-app`, not on `main`/production: the upload route now requires session + own case + payment (`3656b4b`, audit B2), and `main` was merged into `mobile-app`. Production (`main`) still has the open route. Needs a reviewed PR to `main` with the web files only.
4. Ziina webhook secret / Vercel env unknown (audit B3); last known (19 Oct): create-payment and upload returned 500.

**S2**
1. Sign in with Apple required if Google ships.
2. Country page "24–48h · processing" for every country matches the website's file-turnaround claim but can be read as embassy time (15–30 days per the website FAQ). Relabel ("file ready") or remove.
3. `0007` header says NOT APPLIED; commit `d3af779` says applied. Confirm.
4. The website `/apply` (`main`) still blocks on valid passport "No"; the app now continues. Decide parity.
5. "Receive application updates via WhatsApp" is pre-ticked; consent is usually opt-in.
6. Guest mode is in memory only, so a cold start while signed out always shows Welcome. The payment result is now reachable (fixed); other deep links (e.g. `/applications/<id>` from a push) still need sign-in, which is expected.

**S3**
1. Lint warnings (157; no errors).
2. English-only Info.plist permission strings.
3. Countries A–Z index letters below 44pt (like the native index).
4. Receipt date and Home times use `updated_at` (status history = proposed 0009).
5. Offline banner overlaps the country page's back button (visual only).
6. "Add document" sheet lists NOC for self-employed.
7. Passport rule text "6 months from travel" vs validation "3 months after return" (audit M4). The new note follows the hint.
8. Web builds must use `expo export --clear`: Metro's cache reused an earlier build's `EXPO_PUBLIC_SUPABASE_URL` in this QA. The publish command in §8 already uses `--clear`; keep it.
9. Dead code left: `DateRow`, `DateField`, `DateCard`, `NATIONALITIES`.

### Earlier open issues (`docs/mobile-audit.md` §10): status now
| # | Status |
|---|---|
| B1 RLS/storage unverified | OPEN (§3) |
| B2 upload route without auth | fixed on `mobile-app` (`3656b4b`), **not on `main`** |
| B3 webhook secret | OPEN (owner) |
| B4 preview update on the old DB | OPEN (§8) |
| H2 payment intent overwrite | app side: one open payment per application (chat 08, pay e2e). Website side OPEN |
| H3 receipt from the payment record | amount FIXED (chat 15); date OPEN (S3-4) |
| H4 synthesised dossier | FIXED (chat 09 + chat 15) |
| H5 PII left after sign-out | FIXED (chat 03, auth e2e; chat 10 upload copies) |
| H6 guest rows under any email | OPEN (insert policy) |
| H7 no submitted email / HubSpot lead for app cases | OPEN (website) |
| H8 docs disagree on what is live | OPEN (S2-3) |
| H9 check-payment validation | OPEN (website) |
| M1/M2 lint config, `eas.json` | FIXED |
| M6 phone-computed price | FIXED (chat 08: server price only; pay e2e "no 249 AED in page") |
| M7 timeline times | proposed `0009` |
| M9 i18n gaps | FIXED for all `t()` keys and the screens in §7; receipt PDF and some native `Alert`s still English |
| M11 dark mode | supported and passing; `PRODUCT.md` says "dropped". Decide |
| M12 double query | FIXED (chat 14) |
| L1 dead code | `steps.tsx`, `payment.tsx` removed; others remain |
| L3 `supportsTablet` | OPEN (decision) |
| L6 use-before-declare | FIXED |

## 7. Chat 15 commits (`mobile/`)

| Commit | Change |
|---|---|
| `3267d83` | `npm ci` fixed (lock file), eslint, Deno functions out of tsc |
| `78a71a0` | removed unused web-port `steps.tsx` / `payment.tsx` |
| `386f5cf`, `3ed5349`, `8495817` | Arabic: notifications, checklist rows, offline banner, country page (name, capital, facts, documents, mirrored back), app card, tab label, Discard, country search, Google button |
| `4f08096`, `cd8ed72` | lint 0 errors (incl. `.cjs` scripts) |
| `9c19e97`, `949dd4e` | 44pt password eye (old form and chat 03 screen) and search clear |
| `490d4f1` | privacy manifest, unused permissions removed, export compliance, `eas.json` |
| `d6c14ee` | receipts only from `payment_amount` |
| `9ea8e91`, `af81f75` | document "No" continues; "To get later" on the question, Review and the application page; `additional_notes.missingDocuments` |
| `0bc7870` | no invented dossier file (superseded by chat 09's version in the merge) |
| `d679575` | node checks build again after chat 03 (`expo-secure-store` stub) |
| `1a50987` | **payment result reachable signed out** (guest whose app restarted) |
| `e73b8ea`, `b47d7fe`, `cdce290`, `fb04efc` | merges of `mobile-app` (chats 02–14; 03, 08, 11; 06, 09 + main; passport number after payment) |
| `d4b6ebe`, this commit | QA report, evidence sheets, handoff |

## 8. EAS Update (preview)

**Not published. No EAS Update ID exists for this code.** There is no `EXPO_TOKEN` here, and `api.expo.dev` / `u.expo.dev` are denied.

Command (preview channel only; `eas.json` maps profile `preview` → channel `preview`):
```bash
cd mobile
# EAS → Environment variables → preview: EXPO_PUBLIC_SUPABASE_URL=https://dravvaykssrbktztmrlj.supabase.co,
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>, EXPO_PUBLIC_SITE_URL=https://www.ezvisa.net; delete EXPO_PUBLIC_WEB_URL
npx eas-cli@latest env:pull --environment preview            # writes .env.local (git-ignored)
npx expo export --clear --platform ios --platform android --output-dir dist   # --clear is required (S3-8)
grep -c dravvaykssrbktztmrlj dist/_expo/static/js/ios/*.hbc   # must be >= 1
grep -c rjbgteqgqaxalcfnksjc dist/_expo/static/js/ios/*.hbc   # must be 0
EXPO_TOKEN=… npx eas-cli@latest update --branch preview --environment preview --skip-bundler --input-dir dist --platform all \
  --message "chat 15 QA"
```
The command prints the update group ID; record it in `HANDOFF.md`.

## 9. Final status

**NOT READY FOR PRODUCTION TESTING.** Blockers:
1. EAS Update not published; preview serves a bundle that points at the old database.
2. Live RLS and email confirmation not verified, so cross-account safety on the real database is unproven.
3. Website fixes (upload auth B2) and env (Ziina key, webhook secret) are not in production.
4. No real-device pass: VoiceOver, Dynamic Type, Face ID, camera, push, real upload and real payment need one run on a 390pt and a 430pt iPhone (`QA-CHECKLIST.md`).
