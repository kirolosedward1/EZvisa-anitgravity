> **Archived 2026-10-23. Outdated planning doc, kept for history only. Its gap list (19-22 Oct) has been worked through by chats 02-15; its live-DB notes are replaced by `docs/live-state-check.sql`. Current status: `mobile/HANDOFF.md` section 0.**

# EZvisa app: audit v2 (gap list vs. the approved brief)

Date: 19 Oct 2026 (Europe/Berlin). Base: `mobile-app` @ e4b43a4 (v6 design, wizard ported 1:1 from www.ezvisa.net/apply).
Scope change from the owner (19 Oct, 17:06): **weather and packing tips are dropped completely.** The main focus is the one-question-per-screen wizard.

## 1. Gaps vs. the brief

| # | Area | Today | Gap |
|---|---|---|---|
| 1 | Wizard | 4–5 long web pages (Personal has 15 fields) | Needs one question per screen, the same fields/labels/options/order/validation as `lib/wizard.ts`. |
| 2 | Choices | Action sheets / native selects | Needs big tappable answers that auto-advance with haptics. |
| 3 | Skipping | Conditional fields hide inside a page | Each conditional question (Emirates ID, nationality "Other", spouse, employment details, refusal details, extra countries) must be skipped when it doesn't apply. |
| 4 | Progress | "Step X of N" + % bar | Needs a progress bar grouped by the website's step names. |
| 5 | Resume | Resumes at the step | Needs to resume at the exact question (local and DB draft). |
| 6 | Review | Long web summary; "Complete" jumps to the step | Needs a review list with edit-and-return. |
| 7 | Submit | `busy` state only. A second submit after success would make `saveDraft` insert a NEW row (the row is no longer `draft`). | Needs disable + in-flight guard + idempotent update of the same row. **Bug, fixed in v8.** |
| 8 | Draft insert race | Two quick cloud saves before the first insert returns can insert two draft rows (draftId comes from React state). | Use a ref for the draft id and serialise saves. **Bug, fixed in v8.** |
| 9 | Loading | Blank view while session/onboarding load; native splash hides immediately | Hold the splash while session, appearance, draft load; then a short fade. |
| 10 | Trip plan | None | Optional questions + deterministic, editable plan ("Ideas, not bookings"), PDF export, saved in `additional_notes.itinerary`. |
| 11 | Status | Timeline uses statuses the live DB never has (`appointment_booked`, `completed`) | Use live values: submitted → paid (`payment_status`) → reviewing → ready / cancelled. |
| 12 | Extras | Reminders exist (trip date; passport expiry is never filled because the web wizard has no expiry field) | Countdown, local passport-expiry date (device only), Face ID lock, Apple sign-in (hidden while disabled), quick facts, camera capture with checks, i18n + Arabic/RTL. |

## 2. Live DB facts that shape the design (read-only checks, ref dravvaykssrbktztmrlj)
- RLS on `visa_applications`: select own rows by JWT email; **update only while `application_status` is `draft` or `submitted`**; insert as anon or own email.
- Guard trigger `visa_applications_guard_customer_update`: customers cannot change `payment_*`, `email`; only `draft → submitted` is allowed. `additional_notes` is not guarded.
- So `additional_notes.itinerary` syncs while the case is `draft`/`submitted`. After staff move it to `reviewing`/`ready` the update matches 0 rows: the app detects this, keeps the plan on the phone and says so. No schema change.
- Storage bucket `visa_documents` with own-folder insert/select/update policies (direct upload works).
- Auth providers: email only. Google and Apple are disabled, so both buttons stay hidden.

## 3. Expo Go (SDK 57) vs. native build

| Feature | Expo Go | Notes |
|---|---|---|
| One question per screen, haptics, Reanimated, native date pickers, searchable lists | Yes | Pure JS + bundled modules. |
| Autosave local + DB draft, resume at question, idempotent submit | Yes | |
| Branded loading (`expo-splash-screen` hold + JS fade) | Yes, partly | Expo Go shows its own launch screen for the app manifest; the custom native splash image/colour only applies in a build. The hold/fade logic is the same. |
| Trip plan, PDF (`expo-print` + `expo-sharing`) | Yes | |
| Face ID (`expo-local-authentication`) | Yes | Expo Go's Face ID usage string. |
| Sign in with Apple (`expo-apple-authentication`) | Only for Expo Go's bundle id `host.exp.Exponent`, iOS only | Provider is disabled in Supabase today → hidden. |
| Local reminders (`expo-notifications` local) | Yes | Remote push is not available in Expo Go on Android. |
| Camera / library capture (`expo-image-picker`) + size/resolution checks | Yes | |
| Arabic + RTL (`I18nManager` + `Updates.reloadAsync`) | Yes | Needs a reload to flip layout. |
| Home Screen widget | **No, native build** | WidgetKit extension. |
| Push for server status changes | **No, native build** (+ server) | Plan: `push_tokens` table, DB webhook → Edge Function → Expo Push API. Proposal only. |
| Passport MRZ reading | **No, native build** | Needs on-device OCR (VisionKit / ML Kit). |
| Automatic edge-crop document scanning | **No, native build** | VisionKit `VNDocumentCameraViewController` / ML Kit Document Scanner. |
| Weather + packing tips | Dropped by the owner | Not built. |
