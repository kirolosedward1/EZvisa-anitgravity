# EZvisa iOS app · build plan (Phase 0 inventory)

Date: 29 October 2026. Source of truth for the design: the canvas "EZvisa app with Globi"
(https://claude.ai/artifact/U11chNzHQZiyrzewAWjTep, version `1793305893-9238`, 103 artboards, 12 rows, 10 sticky notes).
Source of truth for data: `lib/shared/wizard-contract.ts` (`CONTRACT_VERSION = "2026-10-29.1"`). Where the two disagree the
canvas wins on screens and the contract wins on data; every such case is listed in section 6.

This document maps every artboard to a route, lists the components each screen needs, says whether the screen exists,
changes or is new, and flags everything in the canvas that contradicts the contract or the owner's constraints. It is the
plan for Phases 1 to 7; it changes nothing in the app.

---

## 1. Where the app code is, and what this plan builds on

| Fact | Detail |
|---|---|
| App location | `mobile/` (Expo Router, TypeScript). `mobile/package.json` pins `expo ^58` (installed 58.0.17); `mobile/HANDOFF.md` and the build prompt say SDK 57. The code is on SDK 58. |
| Two `mobile/` trees | `main`'s `mobile/` is stale: its wizard still uses the pre-contract step names (`personal`, `trip-details`) and has no `components/mascot`. `origin/mobile-app` (head `4aeb940`, 20 commits ahead of the merge base `7c65927`, 24 Oct) carries the contract-aligned wizard (`CONTRACT_VERSION 2026-10-29.1`, steps `destination → personal → payment`, `trip → passport → spouse → employment`), the HIG pass, Arabic dates and the current SVG mascot. `main` has not touched `mobile/` since the merge base. |
| Sync check | `node scripts/check-app-sync.mts --ref origin/mobile-app` is what CLAUDE.md validates against (284 checks). The website never compares against `main`'s `mobile/`. |
| Branches named in the prompt | `app-globi` does not exist on the remote. `claude/globi-wizard` exists; `app-redesign` exists as `claude/app-redesign` and `claude/app-redesign-2`. Both carry the SVG Globi, which the prompt rules out. |
| Base for this build (decided 29 Oct) | The owner said to work on the existing app on `mobile-app`, not to start over. This branch is `origin/mobile-app` plus the phase commits, and each phase PR targets `mobile-app` (CLAUDE.md: the native app is not merged into website `main`). The website stays the source of truth for the data contract; every phase runs `main`'s `scripts/check-app-sync.mts --mobile <this mobile/>`. |
| Branch in use | The session's designated branch `claude/quirky-hypatia-0pxipt` (the prompt's `app-globi` does not exist on the remote). |
| Globi assets | `public/globi/` on `main` had the 11 batch 1 poses (welcome, destination, passport, checklist, calendar, shield, waiting, celebrate, companion, documents, travel) as 1440×1440 VP9 WebM with alpha, 24 fps, 5.0 s (121 frames), one `.webp` still each and `video-manifest.json`. The owner supplied the batch 2 pack on 29 Oct (10 unnamed `creation_*.webm` clips, same format); this branch adds them as `thinking`, `phone`, `writing`, `wallet`, `lock`, `plane`, `hotel`, `stamp`, `puzzled`, `magnify` with `video-manifest.additions.json` (source creation ids recorded). All 21 poses the canvas uses are now in the repo. Note on stills: the batch 1 `.webp` files are the opaque source renders on a grey-white background (640×640, no alpha) and nothing on the website reads them; the batch 2 stills are transparent first frames. The app's posters will be generated from the alpha WebM for all 21 by `scripts/globi-convert.sh`, not taken from the batch 1 opaque files. |
| Conversion tooling here | This Linux container has ffmpeg 6.1.1 with `libvpx-vp9` (decodes the alpha channel) and `libx265`/`prores_ks`, but no `hevc_videotoolbox`. HEVC-with-alpha can only be encoded by Apple's VideoToolbox, so `scripts/globi-convert.sh` must run on a Mac. The script can be written and dry-run here (decode check, poster extraction); the `.mov` outputs under `mobile/assets/globi/` need one run on macOS before Phase 1's PR is complete. |
| Screenshots | No iOS simulator exists in this environment. Each phase will attach Expo web screenshots at 390×844 taken with the pre-installed Playwright/Chromium (the repo already has `mobile/scripts/e2e-ui-web.mjs` for this). Real simulator screenshots need a Mac. |
| Type check and tests today (run 29 Oct in this session) | `mobile/` on `main`: `tsc --noEmit` passes; `scripts/wizard-rules.test.ts` fails at import time (`NATIONALITY_OPTIONS` no longer exists), the stale-test problem `HANDOFF.md` §0.2 already records for `main`; it is fixed on `mobile-app`. Website root: `npm test` passes (two node:test batches, 49 + 43), and `node scripts/check-app-sync.mts --ref origin/mobile-app` passes 284/284 at contract 2026-10-29.1. |

---

## 2. Ground rules → where they land in code

| Rule (prompt) | Implementation |
|---|---|
| Tokens from `mobile/theme/colors.ts` | Already there: light palette is #0436DC / #FAFAF8 / #111114 / #6A6A72 / #E9E9EC / #1A7F37 / #B83200 / #D70015; dark `accentFill` is #3D5AFE. No change except removing any gradient use (`expo-linear-gradient` is a dependency today; it is dropped). |
| Type scale, max weight 600 | `mobile/theme/typography.ts` gains named roles `question` 19/600, `pageTitle` 28/600, `resultTitle` 23/600, `tile` 20/600, `option` 15–16/500, `row` 16/600 (buttons too), `caption` 12–14/400. Existing roles already cap at 600; the QA pass greps for `700`/`bold`. |
| Radii: cards 16, bubbles 18 with a 6 px tail corner, buttons 14 | `mobile/theme/tokens.ts` `R` changes: `card: 24 → 16`, `button: 999 → 14`, new `bubble: 18`, `bubbleTail: 6`. Inputs stay 14 (canvas inputs are 14). This is a visible change on every existing card and button. |
| Question is the title inside Globi's bubble; no description line | `QuestionHeader` renders `question.label` only. The `hint` field in `lib/questions.ts` stops rendering under the question; the few hints the canvas keeps (e.g. "As on your passport") move into the field placeholder or an info note below the controls. |
| Autosave with 1.5 s "Saved" pill | `Toast` component + `lib/autosave.ts`: optimistic local write, background server write, pill shown only on server confirmation (`AutoSave.dc.html`, `rule10`). |
| Pushes deep-link to Upload / Status / Appointment / DocRejected | `lib/notifyRoute.ts` today accepts only `/applications/<id>`, `/account`, `/apply`. It gains `/upload/<id>`, `/appointment/<id>`, `/upload/<id>?rejected=<docType>`; nothing maps to Home. The sender (website edge function `notify-status`) must send those URLs; a note goes to the website side. |
| "No" to a document question never blocks | `additional_notes.missingDocuments: string[]` (values from `DOC_TYPES` plus `spousePassport`), written by the app, shown on Review and Status. Not in the contract yet: added as an optional key the website ignores (section 6, F7). |
| Placeholders in `config/pricing.ts` | `mobile/config/pricing.ts`: `INSURANCE_AED_PER_TRAVELLER = 90`, `REFERRAL_CREDIT_AED = 50`, `VISA_FEE_EUR = 90`, `VISA_FEE_AED_ESTIMATE = 360`, `CENTRE_FEE_AED_ESTIMATE = 130`, `VAT_RATE = 0.05`, each with a `TODO(owner)` comment. The service fee stays `PRICE_AED` from the contract copy in `lib/wizard.ts`. |
| Accessibility | Dynamic Type already on (`TYPE_SCALE`); every new control gets `accessibilityRole`/`Label`; 44 pt targets via `HIT`; haptics (`lib/haptics.ts`) on step complete and payment success. |
| Analytics v1 events | `lib/analytics.ts` keeps its allow-list design and adds the 20 events from `rule9` (section 4.3). |

---

## 3. Artboard → route → components → status

Status: **exists** (route and behaviour present, restyle only), **changes** (route exists, behaviour or structure changes),
**new** (no route or component today). Pose sizes are the canvas values (124 beside a question bubble, 96 in Home cards,
57 in info cards, 142–236 on result screens). Routes are expo-router paths under `mobile/app/`.

### Row 1 · First open

| Artboard | Route | Globi | Components | Status | Phase |
|---|---|---|---|---|---|
| Main | `welcome.tsx` | welcome 236, hero | Logo, PrimaryButton, Apple + Google side by side (`AppleButton`, `GoogleButton`), text link | changes: remove onboarding and the sign-up button; "Start my application" opens the wizard as a guest | 2 |
| Onboarding1–3 | none | – | – | **dropped**: delete `lib/onboarding.ts` and any first-run gate | 2 |
| PushAsk | `push-ask.tsx` (modal after Payment received) | welcome 165, hero + bell badge | 3 example notification cards, PrimaryButton, text button | changes (`payment/[id].tsx` already calls `setupPush` after payment; the pre-prompt screen in front of the system dialog is new) | 3 |
| SignIn | `auth/index.tsx` | welcome 124, bubble | QuestionHeader("Welcome back"), 2 fields, Forgot link, PrimaryButton, SecondaryButton (magic link), footer links | changes: bubble header, "Continue without an account" link | 2 |
| SignUp | `auth/signup.tsx` | welcome 124, bubble | fields, PrimaryButton | changes: reached only from Sign in ("New here?"); Welcome no longer links here | 2 |
| Forgot | `auth/forgot.tsx` | lock 124, bubble | email field, PrimaryButton | exists | 2 |
| MagicLink | `auth/magic-link.tsx` | phone 165, hero + envelope | SecondaryButton (resend), text button | exists | 2 |
| Reset | `auth/reset.tsx` | lock 124, bubble | 2 fields, rule checklist, PrimaryButton | exists | 2 |
| FaceIDLock | overlay in `components/Boot.tsx` via `lib/lock.tsx` | lock 153, hero + Face ID badge | blurred Home behind, PrimaryButton, text button "Use passcode" | changes: Globi + copy; passcode fallback setting | 2 |

### Row 2 · Home, Countries, Applications, states

| Artboard | Route | Globi | Components | Status | Phase |
|---|---|---|---|---|---|
| Home | `(tabs)/(home)/index.tsx` | checklist 96, in primary card | page title + avatar, primary application Card (eyebrow, headline, 4-segment progress, PrimaryButton), "Other applications" Rows, "Popular countries" tiles, TabBar | changes: card content model (next action, docs left, days to trip) | 2 |
| EmptyHome | same route, no application | welcome 142, in card | Card, PrimaryButton, search field, popular tiles | changes | 2 |
| HomeOffline | same route, offline | waiting 96 | offline banner (`NetworkBanner`), queued-file row, disabled button | changes: queued upload row from `lib/uploads.ts` queue | 2 |
| HomeDraft | same route, draft present | passport 96, bubble in card | Bubble("Pick up where you left off?" + stopped question), 3-segment progress, PrimaryButton "Resume", bell button | new | 2 |
| Loading | same route | waiting 66, dimmed | Skeleton blocks mirroring Home | new (pattern for every list and card) | 1 |
| ErrorState | shared `ErrorView` | puzzled 142, hero | PrimaryButton "Try again", SecondaryButton WhatsApp, mono diagnostic caption | changes | 2 |
| Countries | `(tabs)/(countries)/countries.tsx` | magnify 47, tip card | search, filter chips, tip Card, 2-column tiles | changes: chips, tip card | 2 |
| Country | `(tabs)/(countries)/country/[slug].tsx` | destination 47, tip card | Hero, 3 fact tiles, tip Card, "You provide" / "We prepare" Rows, sticky footer with price + PrimaryButton | changes (components/country/* exist) | 2 |
| Applications | `(tabs)/applications/index.tsx` | checklist 47, tip card | segmented Active/Past, "Needs you" / "With the team" Rows with status pills, swipe-to-discard (`SwipeToDiscard` exists), tip Card | changes | 2 |
| SignedOutTab | same route, guest | passport 123, in card | guest draft Row, empty-state Card, PrimaryButton, SecondaryButton | changes: local guest draft row | 2 |
| DiscardConfirm | action sheet from Applications | thinking 52, sheet header | `SheetScaffold` (action-sheet variant), destructive button | changes (`lib/discard.ts` exists) | 2 |

### Row 3 · Account, Globi sheet

| Artboard | Route | Globi | Components | Status | Phase |
|---|---|---|---|---|---|
| Account | `(tabs)/account/index.tsx` | none | profile Card, Rows: Saved travellers, Application history, Receipts, Notifications, Settings, Invite a friend, WhatsApp support, Email and phone, Privacy/terms/refunds; Sign out / Delete account | changes: Receipts, Settings, Invite rows are new targets | 6 |
| AccountDetails | `(tabs)/account/details.tsx` | passport 47, tip card | avatar + photo, Personal / Sign-in methods / Membership Rows, Save pill | changes | 6 |
| Travellers | `(tabs)/account/travellers.tsx` | companion 57, bubble | traveller Cards with key/value rows, Edit pill, dashed Add button | changes | 6 |
| TravellerEdit | `account/traveller/[id].tsx` (page sheet) | passport 47, tip card | form Rows, destructive Remove | new | 6 |
| Notifications | `(tabs)/account/notifications.tsx` | checklist 42 as one row icon | Today / Earlier Rows with unread dot, "Mark all read" | changes: each item deep-links (Status, Upload, Resume) | 6 |
| DeleteAccount | `account/delete.tsx` (bottom sheet) | waiting 124, sheet header | info list, "Type DELETE" field, destructive button disabled until typed | new (`lib/privacy.ts` has data rules; no delete screen) | 6 |
| GlobiSheet | not a screen | all 21 | `GlobiPose` reference: pose list, sizes, voice rules | documentation only | 1 |

### Row 4 · New application before payment (Destination → Traveller → Review & pay)

All of these render inside `apply/index.tsx` through `QuestionView`; each line is a question id in `lib/questions.ts`.

| Artboard | Question id / route | Globi | Components | Status | Phase |
|---|---|---|---|---|---|
| Resume | sheet over `apply/index.tsx` | welcome 76, sheet header | SheetScaffold, summary rows, PrimaryButton, SecondaryButton | changes (draft restore exists in `lib/data.ts`; the sheet is new) | 2 |
| DraftConflict | sheet over `apply/index.tsx` | thinking 124 | SheetScaffold, two version columns, buttons | changes (`components/wizard/sync.tsx` has `DraftConflictSheet`; it becomes the two-column card) | 3 |
| Destination | `destination` | destination 124 | StepHeader(3 segments), QuestionHeader, search, "Popular" + "All 29" ListChoice rows, auto-advance | changes: list instead of grid | 3 |
| Traveller | `traveller` | passport 124 | ChoiceTile per saved traveller + "Someone else", info banner, PrimaryButton "Continue as {name}" | changes: picking a saved traveller skips nationality **and** name (both known) and reuses passport details; goes to City with a "From your profile" chip (section 6, F2) | 3 |
| Nationality | `nationality` | passport 124 | chip "Someone else", 2-column ChoiceTile grid of 6 demonyms, "Other nationality" row, info note | changes: tiles + demonym labels | 3 |
| OtherNationality | `nationality` (full list) | magnify 124 | search with clear, "Matches" + alphabetical sections, A–Z index | changes | 3 |
| City | `cityOfResidence` | destination 124 | chip "From your profile", radio ListChoice of 7 emirates, PrimaryButton | changes | 3 |
| PrefillOffer | overlay on `cityOfResidence` | checklist 124 | offer Card ("Reuse these from Italy, September?") with key/value rows, two buttons | changes (`docs/HANDOFF-07-prefill.md` describes the existing prefill; UI becomes the canvas card) | 3 |
| Name | `name` | writing 124 | two fields, PrimaryButton above the keyboard | changes | 3 |
| Contact | `contact` | phone 124 | split phone field (country code + national), WhatsApp checkbox, PrimaryButton | changes: email no longer asked here (account email at SignUpAtPay) | 3 |
| MaritalStatus | `maritalStatus` | companion 124 | "Contact saved" pill, 2×2 ChoiceTile, info note (498 AED), auto-advance | changes | 3 |
| Marital | `spouseAccompanying` | companion 124 | answer summary row, two yes/no ChoiceTiles with price sub-labels, info note, PrimaryButton "Review answers" | changes | 3 |
| Review | `apply/index.tsx` page `review` (`apply/review.tsx` is only a legacy redirect) | shield 124 | StepHeader, Trip / Contact / Price sections of tappable Rows (no Edit labels), "To get later" list, sticky footer | changes: every row opens its question and returns to Review | 3 |
| ProfileAsk | overlay on Review | checklist 124 | diff Card (old → new), two buttons | changes (`apply/index.tsx` already asks once; UI becomes the card) | 3 |
| Insurance | `apply/index.tsx` page `insurance` (between Review and Price) | shield 124 | 3 option Cards, info Card, PrimaryButton | new (section 6, F1) | 3 |
| PriceBreakdown | `apply/index.tsx` page `price` | wallet 124 | receipt Card per traveller, VAT line, "Paid at the appointment" Card, PrimaryButton | new | 3 |
| SignUpAtPay | `apply/index.tsx` page `signup` | lock 124 | Apple, Google, email + password Card, "Your answers kept" Card, PrimaryButton | new (guest draft merges into the account on sign-in; `guestSubmit` in `lib/data.ts` is the current guest path) | 3 |
| AutoSave | behaviour on every question | – | Toast "Saved" 1.5 s | new | 1 |
| GlobiExplain | sheet from tapping Globi on any question | pose of the question, 124 | SheetScaffold, explanation Card, "Used for" / "Shared with" Rows, WhatsApp + "Got it" | new; `explain` field added to every question | 3 |

### Row 5 · Payment states and receipt

| Artboard | Route | Globi | Components | Status | Phase |
|---|---|---|---|---|---|
| PaymentChecking | `payment/[id].tsx` state `checking` | thinking 153, ring | 3-step status Card with elapsed seconds, SecondaryButton, text button | changes (`components/payment/PaymentWait.tsx` exists) | 3 |
| Payment (received) | state `paid` | celebrate 177, hero + tick | 3 numbered next-step Card, PrimaryButton "Continue application", "View receipt"; Done → PushAsk | changes; haptic on success | 3 |
| PaymentPending | state `pending` | thinking 165 + clock | info Rows (20 s recheck), PrimaryButton, WhatsApp SecondaryButton | changes | 3 |
| PaymentStalled | state `stalled` | thinking 153, ring | info Rows, buttons | new state | 3 |
| PaymentFailed | state `failed` | puzzled 165 + ×  | info Rows incl. bank reason, PrimaryButton "Retry payment", WhatsApp | changes | 3 |
| PaymentCancelled | state `cancelled` | waiting 165 | application Card, "Pay now", "Later, back to Home" | changes | 3 |
| PaymentOffline | state `offline` | waiting 165 | offline banner, info Rows, buttons | new state | 3 |
| Receipt | `receipt/[id].tsx` | none (logo) | receipt Card, Download PDF (`expo-print`) + Share | changes: layout; payment id shown without a provider-shaped prefix (section 6, F12) | 3 |
| payment-return / auth/callback | redirects | – | – | exist, no UI (`rule4`) | – |

### Rows 6–7 · Continue application after payment (Trip → Passport → Spouse → Employment)

All render inside `continue/[id].tsx`; StepHeader has 4 segments and a "Save"/close that exits to Status.

| Artboard | Question id | Globi | Components | Status | Phase |
|---|---|---|---|---|---|
| TripPurpose | `purposeOfTrip` | travel 124 | icon ListChoice, auto-advance | changes (labels, section 6, F4) | 4 |
| Dates (flexible) | `dates`, tab Flexible (default) | calendar 124 | segmented tabs, duration stepper (max 90), month grid (1 or 2 adjacent), info note, PrimaryButton | changes (`components/wizard/dates.tsx` has a calendar-first version) | 4 |
| DatesExact | `dates`, tab Exact | calendar 124 | 3 summary tiles, range calendar | changes | 4 |
| TravellingWith | `travelingWith` | companion 124 | chip "Prefilled from your answers", ListChoice, PrimaryButton | changes | 4 |
| Hotel | `hotelCategory` | hotel 124 | 2×2 ChoiceTile with stars, PrimaryButton | changes | 4 |
| Funding | `fundingSource` + `balanceRange` | wallet 124 | ListChoice with sub-labels, chip row for balance, PrimaryButton | changes: two answers on one screen | 4 |
| FirstVisa | `isFirstSchengenVisa` + `previousRefusals` + `refusalDetails` | passport 124 | two yes/no pairs, textarea when refused, PrimaryButton | changes: three answers on one screen | 4 |
| OtherCountries | `willVisitOtherCountries` + `additionalCountries` | plane 124 | chip "Optional", yes/no, route list with nights, dashed add, note on main destination | changes | 4 |
| ResidenceVisa | `residenceVisaValid` | passport 124 | mini timeline in bubble, two tall ChoiceTiles, info card, auto-advance | changes: moves from `passport` step to the end of `trip` (contract validates it in `validateTrip`, so this matches the contract better than today) | 4 |
| DateOfBirth | `dateOfBirth` | passport 124 | wheel picker, caption 18+ | changes: **asked before payment** (section 6, F3) | 3 |
| Passport | `hasValidPassport` | passport 124 (+47 in the response card) | two tall ChoiceTiles, "No" response Card with amber "To get later: passport" | changes: No path never blocks | 4 |
| PassportNumber | `passportNumber` + `passportExpiry` | passport 124 | uppercase field, expiry row with validity badge, dashed "Scan the photo page" | changes: expiry joins the same screen; scan is a stub until a MRZ reader is chosen | 4 |
| SpouseName | `spouseName` | writing 124 | saved-traveller ChoiceTile first, "or someone new" fields, spouse passport yes/no ("No, add later" → To get later) | changes | 4 |
| SpousePassport | `spousePassport` (new) | companion 124 | DOB row, passport number field, expiry row | new (section 6, F6) | 4 |
| SpouseEmployment | `spouseOccupation` | companion 124 | 2-column ChoiceTile, homemaker note, PrimaryButton | new screen for an existing contract key | 4 |
| Employment | `employmentStatus` | documents 124 | 2×3 ChoiceTile with document sub-labels, auto-advance | changes (labels, section 6, F5) | 4 |
| JobCompany | `jobCompany` + `employmentStartDate` + `monthlySalary` | writing 124 | two fields, month row, salary chips, PrimaryButton | changes: one screen; salary bands from the contract (F5) | 4 |
| NOC | `hasNOC` | documents 124 | chip "Last question", two tall ChoiceTiles, "What a good NOC says" Card with template button | changes: "Not yet" → To get later | 4 |
| BusinessIncome | `companyName` + `averageMonthlyIncome` (+ optional licence expiry) | wallet 124 | fields with AED prefix, optional date row | changes (F8) | 4 |

### Row 8 · Documents, status, file ready, appointment, trip plan

| Artboard | Route | Globi | Components | Status | Phase |
|---|---|---|---|---|---|
| Upload | `documents/[id].tsx` (new route; today the checklist is a section of `applications/[id].tsx` and `upload/[id].tsx` is only the crop/preview step) | documents 124, bubble with 5-segment progress | Still needed / Received / We prepare these Rows, Take photo + Choose file | changes (`lib/uploads.ts` queue, `lib/checklist.ts` states exist) | 5 |
| DocRejected | `documents/[id].tsx?rejected=<type>` | puzzled 124 | rejected Card with reviewer note (`document_reviews` reason), Upload new + Ask why, Accepted Rows | new; opens the camera on the right mode with the reason pinned | 5 |
| DocViewer | `document/[id]/[uploadId].tsx` | none | dark viewer, pinch zoom, page dots, status pill, Retake + Done | new | 5 |
| CameraCapture | `camera/[id].tsx?mode=passport\|emiratesId\|document` | none | `expo-camera` view, edge guides per mode (passport 125:88 with MRZ strip), mode segmented, shutter, library, AUTO | new (today `expo-image-picker` + `CropBox`) | 5 |
| Status (superseded) | `(tabs)/applications/[id].tsx` | – | replaced by StatusNextYou / StatusNextUs | – | – |
| StatusNextYou | `(tabs)/applications/[id].tsx` | none | reference + title, NEXT: YOU Card with one PrimaryButton, timeline Card, "To get later" Card, Trip Rows (Appointment, What happens on the day, Receipt) | changes (`lib/nextAction.ts`, `lib/timeline.ts` exist) | 5 |
| StatusNextUs | same route | magnify 57, in card | NEXT: US Card with Globi and the date he will message | changes | 5 |
| FileReady | `result/[id].tsx` kind `ready` | stamp 177, hero | checklist Card, Download PDF, "Next: book the appointment" | new (status `ready` exists in the contract; no celebration screen) | 5 |
| BookAppointment | `appointment/[id]/book.tsx` | calendar 57, small bubble | 3 step Cards, copyable reference and passport numbers, PrimaryButton "I have booked, add the date" (+ Calendar event via `expo-calendar`) | new (`lib/appointment.ts` + `components/Appointment.tsx` exist for the booked state) | 5 |
| Appointment | `appointment/[id]/index.tsx` | calendar 57, bubble | appointment Card (date tile, centre, Directions/Change), packing checklist (n of 6), info Rows, "Remind me the day before" | changes | 5 |
| AppointmentSheet | sheet from Status | calendar 96 | SheetScaffold, 5 numbered steps, PrimaryButton "Packing checklist" | new | 5 |
| LiveActivity | widget extension target `targets/appointment/` | calendar 44 | ActivityKit Live Activity (centre, time, countdown, leave-by, Directions, "What to bring") via `@bacons/apple-targets`; `lib/liveActivity.ts` no-ops in Expo Go | new | 5 |
| TripPlan | `trip/[id]/index.tsx` | plane 57, bubble | city chips, day Cards with ideas, Export PDF, Add day | changes (`trip/[id].tsx` + `lib/itinerary.ts` exist) | 5 |
| TripCountdown | `trip/[id]/countdown.tsx` | plane 110, in blue card | countdown Card, "Before you fly" checklist (6), travel-day Rows, Add to Calendar | new (`lib/countdown.ts`, `lib/checklist.ts` exist) | 5 |
| VisaApproved | `result/[id].tsx` kind `approved` | stamp 165, hero | details Rows, passports "Ready to collect" row with Collected, Travel checklist, Share | new (status `approved`) | 5 |
| VisaRefused | `result/[id].tsx` kind `refused` | puzzled 142, hero | reason Card, Appeal / Apply again / Refund policy Rows, "Talk to a specialist" | new (status `rejected`) | 5 |
| Reapply | `reapply/[id].tsx` | checklist 124 | "Carried over" Rows, "Change" Rows, PrimaryButton → Dates | new | 5 |
| Referral | `referral.tsx` | companion 124 | offer Card with code + copy, Share / WhatsApp, "Your invites" Rows | new (no referral backend; section 6, F13) | 5 |
| RateExperience | `rate.tsx` | celebrate 142, hero | 5 stars, chips, textarea, Send; `expo-store-review` once after 5 stars | new | 5 |

### Row 9 · Arabic, dark mode, icon and store assets

| Artboard | Route | Globi | Components | Status | Phase |
|---|---|---|---|---|---|
| HomeAR | Home in Arabic | checklist 96 | full RTL layout (`I18nManager` + `lib/i18n.tsx`), Arabic strings in `lib/ar.ts`, Western digits unless the numerals toggle is on | changes | 7 |
| DestinationAR | Destination in Arabic | destination 124, **mirrored**, tail on the right | same components, RTL | changes | 7 |
| HomeDark | Home in dark | checklist 96 | dark palette already in `theme/colors.ts` (#000 / #1C1C1E / #3D5AFE / #8CA2FF); `lib/appearance.tsx` currently forces light ("product rule: no dark mode") and `app.json` has `userInterfaceStyle: "light"`; both change to follow the system with Light / Dark / System overrides | changes | 7 |
| IconSplash | assets | none | icon unchanged; splash stays static; 6 store screenshots with the listed captions | new deliverables (screenshots need the simulator or web frames) | 7 |

### Row 10 · Settings (all new; `mobile/app/settings/`)

| Artboard | Route | Globi | Components | Phase |
|---|---|---|---|---|
| Settings | `settings/index.tsx` | none | 3 Cards of Rows with icon tiles and summaries | 6 |
| NotifSettings | `settings/notifications.tsx` | none | event × channel matrix (push / email / WhatsApp; offers off), Quiet hours Switch + From/To, Inbox Row | 6 |
| LanguageRegion | `settings/language.tsx` | checklist 57, mirrored in the preview | segmented English/العربية, live preview Card, Dates / Numbers Rows, Arabic numerals Switch (off), Currency AED static | 6 |
| Appearance | `settings/appearance.tsx` | none | Light / Dark / System tiles, text size slider, Globi animations Switch (off under Reduce Motion) | 6 |
| SecurityPrivacy | `settings/security.tsx` | none | Face ID, Auto-lock, Passcode fallback, Two-factor by email, sessions, Sign out everywhere, Download my data, Privacy policy | 6 |
| PaymentMethods | `settings/payments.tsx` | none | saved cards (tokens shown by the gateway) or wallets-only, Receipts Row | 6 (section 6, F14) |
| DataStorage | `settings/storage.tsx` | none | usage bar, "Waiting to sync" queue Rows, Clear cached documents, Export | 6 |
| Help | `settings/help.tsx` | phone 57, bubble | search, FAQ Rows (`lib/faq.ts`), WhatsApp / Email / Call Rows, Report a problem, Rate | 6 |
| ReportProblem | `settings/report.tsx` | none | textarea, Add screenshot / Attach file, device info Rows, logs Switch, Send | 6 |
| About | `settings/about.tsx` | welcome 120, hero | legal Rows, Rate on the App Store, ezvisa.net, Delete account, "Made in Dubai" | 6 |

---

## 4. Shared components (Phase 1)

### 4.1 Component list and first users

| Component | Spec from the canvas | First used by |
|---|---|---|
| `GlobiPose` | 21-pose union, `size`, `animated`; HEVC-alpha `.mov` via `expo-video`, `.webp` poster; still only when Reduce Motion or `animated=false`; mirrored in RTL; tap opens GlobiExplain on questions | every screen |
| `Bubble` | white, 1 px border, radius 18, tail corner 6 (bottom-left LTR, right in RTL); title 19/600, optional 14 grey line | QuestionHeader, Travellers, Help, Status |
| `QuestionHeader` | Globi 124 + Bubble; question only, no description | all wizard questions |
| `StepHeader` | 36 px round back, segmented 4 px progress with 11/600 labels (3 segments pre-payment, 4 after), right slot (WhatsApp help / Save / close), accessibility "Traveller, question 2 of 7" | wizard, continue, review, insurance, price, sign-up-at-pay |
| `Card` | radius 16, 1 px border, white | everywhere |
| `Row` | label / value / chevron or Switch, 50–56 px, icon tile 30–40 px | account, settings, review, status |
| `Switch` | 44×28, on #0436DC | settings |
| `ChoiceTile` | selected = 1.5 px blue border + 6 % blue fill; sizes: yes/no 20/600 (min 96–132), option 15–16/500 (min 84–104) | nationality, marital, hotel, passport, employment |
| `ListChoice` | radio rows 54–60 px with tick, optional icon tile and sub-label | destination, city, purpose, travelling with, funding |
| `PrimaryButton` | 52 px, radius 14, #0436DC, 16/600 | everywhere |
| `SecondaryButton` | 52 px (44 compact), white, 1 px border; variant with WhatsApp dot | everywhere |
| `Toast` | black pill 34 px, 13/600, tick icon; "Saved" 1.5 s | autosave, "Contact saved" |
| `Skeleton` | 12 % grey blocks radius 8, no shimmer under Reduce Motion | Home, lists, cards |
| `SheetScaffold` | bottom sheet radius 24 with grabber 36×5; action-sheet variant; page-sheet variant (TravellerEdit) | Resume, DraftConflict, DiscardConfirm, DeleteAccount, GlobiExplain, AppointmentSheet |
| `Chip` | 12/600 pill above a question ("Someone else", "From your profile", "Optional", "Last question") and 14/500 filter chips | nationality, city, countries, funding, salary |
| `InfoNote` | 13 px grey/blue/green/amber note with icon; amber is "To get later" | many questions |

What exists today and what happens to it: `components/ui/core.tsx` has `Button` (primary/secondary/plain/destructive),
`ListGroup`/`ListRow`, `SegmentedControl`, `ChipGroup`, `Skeleton`, `ProgressSegments`; `components/ui/layout.tsx` has
`Sheet`; `components/wizard/answers.tsx` has `AnswerRow`, `YesNoTiles`, `ChoiceList`. These are restyled to the canvas
values and re-exported under the names above rather than rewritten. No Globi, Bubble, Toast or custom Switch exists on
`main`; `mobile-app`'s `components/mascot/*` (SVG Globi, `MascotHeader`, `prompts.ts`) is removed in favour of
`GlobiPose` + `Bubble`. Dropped: `components/ui/Glass.tsx` and the Liquid Glass `nav/TabBar.tsx` chrome (the canvas tab bar is
a flat white pill with a hairline), `components/CropBox.tsx` (camera guides replace it), the unused `components/wizard/steps.tsx`,
`components/wizard/payment.tsx` and `components/DateRow.tsx`, `lib/onboarding.ts`, `expo-linear-gradient`.

Weight 700 today (to remove in Phase 1): `app/receipt/[id].tsx:50`, `lib/stack.tsx:34`, `countries.tsx:35,40`,
`components/wizard/dates.tsx:102,114,158`, plus the `"700"` member of `Text`'s `weight` prop type.

### 4.2 Globi pipeline

1. `scripts/globi-convert.sh` (repo root): for each pose in `public/globi/video-manifest.json` + `video-manifest.additions.json`,
   `ffmpeg -c:v libvpx-vp9 -i <pose>.webm -vf scale=480:480 -c:v hevc_videotoolbox -alpha_quality 0.9 -tag:v hvc1 -an mobile/assets/globi/<pose>.mov`
   and copy the `.webp` still. Fails fast with a clear message when `hevc_videotoolbox` is missing (Linux). Expected output
   ~21 × (≈300–600 KB `.mov` + ≈30 KB `.webp`).
2. `mobile/assets/globi/manifest.ts`: `require()` map for the 21 poses, typed from the `GlobiPose` union; no fallback pose.
3. `components/globi/GlobiPose.tsx`: `expo-video` `VideoView` (loop, muted, `contentFit="contain"`, no controls),
   poster from the still, `useReducedMotion()` from `lib/motion.ts`, `I18nManager.isRTL` mirror, `Pressable` with
   `accessibilityLabel="Globi, why this question"` when `onPress` is given.
4. `components/globi/GlobiExplain.tsx` + `explain: { why, usedFor, sharedWith }` on every entry of `lib/questions.ts`.

All 21 source clips are in `public/globi/` on this branch, so Phase 1 can type and ship the full union. The only remaining
dependency is the macOS run of the conversion script for the HEVC-alpha `.mov` files.

Batch 2 clip → pose assignment (from the frames): 3799949032 thinking (hand on chin), 3799949833 phone, 3799950870 writing
(pen and notepad), 3799951404 wallet (open wallet, coins), 3799952338 lock (padlock), 3799970658 plane (pointing at a paper
plane), 3799971465 hotel (bed, sleepy), 3799972642 stamp (stamp over a document), 3799973088 puzzled (shrug), 3799998955
magnify (magnifying glass over a paper).

### 4.3 Analytics events (v1, from `rule9`)

`wizard_question_view` / `wizard_question_answer` / `wizard_question_back` (question id, step, ms on screen),
`wizard_exit` (last question id), `review_row_tap` (field), `signup_at_pay` (method), `payment_start`, `payment_result`
(state), `doc_request_view`, `doc_upload` (type, source), `doc_rejected` (reason), `status_view` (next = you | us),
`appointment_booked`, `live_activity_tap`, `globi_tap` (question id), `whatsapp_handoff` (screen), `lang_switch`,
`numerals_switch`. The existing events (`wizard_page`, `payment_finished`, `upload_done`…) stay for the current
`wizard_events` table; the new names are added to the allow-list and the row schema needs a migration (`0014`, insert-only).

---

## 5. Phase checklist (what each PR contains)

| Phase | Deliverable | Validation |
|---|---|---|
| 1 Foundation | tokens, type scale, 14 shared components, GlobiPose + conversion script + assets, Skeleton states, analytics wrapper, `config/pricing.ts` | `tsc`, unit tests for autosave timing, analytics allow-list, pose map; web screenshots of a component gallery screen |
| 2 Entry and account | Welcome, auth screens, Face ID lock, Home states (draft, empty, offline, loading, error), Countries, Country, Applications, Signed-out tab, Discard | `tsc`, drafts and auth e2e scripts on web |
| 3 Wizard before payment | questions as drawn, Traveller rule fix, Review with tappable rows + To get later, Insurance, Price breakdown, Sign up at pay, payment states, PushAsk | `tsc`, wizard rule tests, sync check against the contract, payment e2e (test mode) |
| 4 Wizard after payment | Trip (flexible first), passport, spouse, employment branches, contract additions `flexibleDuration` / `flexibleMonths` / `missingDocuments` | `tsc`, dates tests, after-payment tests, sync check |
| 5 Documents, status, appointment | Status NEXT: YOU / US, Upload, viewer, camera, DocRejected, Book appointment, Appointment, sheet, Live Activity, File ready, Approved, Refused, Countdown, Trip plan, Apply again, Invite, Rate | `tsc`, upload queue tests, timeline tests |
| 6 Account and settings | Account tree, Travellers, Traveller edit, Delete account, full settings tree | `tsc`, profile tests |
| 7 Arabic, dark, polish | RTL pass on every screen, dark mode, icon/splash/store frames, QA pass (every artboard has a screen, every chevron navigates, no 700, no description lines, VoiceOver, offline run) | QA checklist in `mobile/QA-CHECKLIST.md`, both languages |

---

## 6. Contradictions and gaps (canvas vs contract vs owner constraints)

Each item: what the canvas shows, what the contract or owner rule says, and the resolution I will apply unless told otherwise.

**F1 · Insurance is charged in the canvas; the owner says it is quoted separately.** `Insurance.dc.html` sells "Add for
both travellers · 90 AED each" and `PriceBreakdown.dc.html` adds it to "Due now 678 AED". CLAUDE.md: "Insurance prices are
quoted separately", "a preference never purchases a policy, confirms cover or changes the visa service fee"; the server
charges `PRICE_AED × travellers` only (`lib/ziina`, `app/api/create-payment`), and the website stores the choice as
`additional_notes.insurancePreference: "quote" | "own"`. Resolution: keep the three-option screen and its copy, but the
first option becomes "Quote insurance for both travellers" with "from 90 AED each, quoted separately" from
`config/pricing.ts`; it writes `insurancePreference: "quote"`, "I already have a policy" writes `"own"`, "Not now" writes
nothing. Price breakdown lists insurance as "quoted separately, not charged now"; "Due now" stays the service fee.
**Owner decision needed only if insurance should actually be charged in-app** (that needs a server change and a Ziina
amount rule change; not in this plan).

**F2 · Saved traveller: what is skipped.** Canvas `Traveller.dc.html` banner: "Nationality skipped. Next: your city.", but
its button goes to Name. Sticky `rule2`: skip nationality and reuse passport details. The saved traveller carries name,
DOB, nationality, passport, phone and emirate (`TRAVELLER_KEYS`). Resolution: picking a saved traveller skips every
question it already answers (nationality, name, DOB, and passport later) and lands on City with the "From your profile"
chip; every value stays editable on Review. `mobile-app`'s `lib/questions.ts` still applies `nationality` after a pick
(the gap named in `rule2`), fixed in Phase 3.

**F3 · Date of birth is before payment in the contract, after payment in the canvas.** `validatePersonal` requires
`dateOfBirth` (and the 18+ rule) before the customer can pay; the canvas draws `DateOfBirth.dc.html` in the Passport
section after payment. Contract wins: DOB is asked in the Traveller section (after Name, before Contact) using the
DateOfBirth artboard as drawn; it is skipped for a saved traveller. Website rows already have it. The Traveller section
becomes 8 questions, not 7.

**F4 · Purpose-of-trip labels.** Canvas: "Visiting family or friends", "Study or training", "Medical". Contract `PURPOSES`
labels: "Family Visit", "Education/Training", "Medical Treatment" (values `family`, `education`, `medical`). Resolution:
contract values are stored unchanged; the app shows the canvas labels through a display map in `lib/questions.ts`
(labels are not compared by the sync check). Same treatment for the demonym nationality tiles (stored as country names).

**F5 · Employment and salary option sets differ.** Canvas Employment replaces "Unemployed" with "Homemaker" and
JobCompany uses five salary bands (…10,000 to 20,000, 20,000 to 35,000, Over 35,000). Contract: `EMPLOYMENT` has
`unemployed` and `SALARY` has four bands (`under-5000`, `5000-10000`, `10000-15000`, `15000-plus`) that staff and the
website read. Contract wins: four salary chips with the contract bands; the sixth tile stores `unemployed` and is
labelled "Not working" (reads naturally for a homemaker). **Decision for the owner**: if "Homemaker" should become a real
status, that is a contract change on both platforms.

**F6 · Spouse passport number, DOB and expiry are not in the contract.** `SpousePassport.dc.html` collects them; the
contract has only `spouseFirstName`, `spouseLastName`, `spouseHasValidPassport`, `spouseOccupation`, plus
`spouseTravellerId`. Passport numbers are meant to live in `public.travellers`, not in notes. Resolution: when the spouse
is a saved traveller nothing new is asked; for a new spouse the screen saves a `travellers` row (`relationship: "spouse"`)
through the existing `lib/travellers.ts` and stores its id as `spouseTravellerId`. Nothing new goes into `wizard`.

**F7 · "To get later" is in PRODUCT.md, not in the contract.** Resolution: `ApplicationNotes.missingDocuments?: string[]`
added to `lib/shared/wizard-contract.ts` and `mobile/lib/wizard.ts` in the same change (Phase 4), optional, ignored by the
website until it reads it. Values: `passportCopy`, `residencyCopy`, `nocCertificate`, `spousePassport`.

**F8 · Fields the canvas adds that the contract does not have.** Flexible dates (`flexibleDuration: number`,
`flexibleMonths: string[]`, prompt asks for them), trade licence expiry (BusinessIncome, optional), spouse employment as a
choice (stored in the existing free-text `spouseOccupation`). Resolution: the first two go into the contract as optional
`WizardAnswers` keys with empty defaults so `applicationColumns` passes them through untouched; trade licence expiry is
dropped (nothing reads it) unless the owner wants it.

**F9 · Flexible dates still need concrete `travelStartDate` / `travelEndDate`.** `validateTrip` requires both dates,
15 days of lead time and ≤ 90 days. Resolution per `rule3`: the proposed range is the first day of the first chosen month
(or today + 15 days if later) plus the duration, `datesFlexible: "yes"`; the month grid marks months that cannot satisfy
the 15-day rule as "too soon".

**F10 · Passport expiry copy says 6 months, the contract validates 3.** `PassportNumber.dc.html` badge: "6+ months after
return"; `passportCoversTrip` requires return + 3 months. Resolution: validation stays at 3 months (contract); the green
badge says "valid for this trip" (the SpousePassport wording) and an amber one appears between 3 and 6 months.

**F11 · Residence-visa question position.** Canvas asks it at the end of Trip; `mobile-app` asks it in `passport`. The
contract validates it in `validateTrip`, so the canvas order is also the contract order. No conflict, just a move.

**F12 · Receipt shows a provider-shaped payment id.** `Receipt.dc.html` prints "Payment ID pi_3Qx…9f2" (a Stripe-style
prefix). Owner rule: never expose the gateway's name. Resolution: show "Payment reference" with the Ziina intent id
truncated and no vendor prefix styling, and "Paid via payment gateway · card ending 4417".

**F13 · Referral and credits have no backend.** `Referral.dc.html` promises 50 AED each way and lists invite status.
Resolution: the screen ships with the code (`<FIRSTNAME>50`), share link and WhatsApp handoff; the credit amount comes from
`config/pricing.ts`; "Your invites" shows an empty state until a referral table exists. **Owner decision**: whether to
build the server side (migration + `/api/referral`) in a later website PR.

**F14 · Saved cards.** `PaymentMethods.dc.html` lists stored cards; `rule6` allows "wallets plus receipts" if saved cards
are not wanted in v1. The checkout is a hosted payment page; the app never sees card tokens. Resolution: v1 shows Apple
Pay / Google Pay "at checkout" and Receipts; the Cards section is omitted.

**F15 · Support email.** Help board: `hello@ezvisa.net`; `main`'s latest commit makes it the single contact email;
contract `SUPPORT_EMAIL = "support@ezvisa.net"`. Resolution: contract constant updated to `hello@ezvisa.net` on both sides
with a `CONTRACT_VERSION` bump (Phase 6), unless the owner wants to keep both.

**F16 · Pre-payment Contact asks only the phone.** `validatePersonal` requires `email`. For guests the email arrives at
SignUpAtPay (account email becomes `email` in the answers; `contactEmail` is set if it differs). Signed-in users already
have it. No contract change; the order of checks moves.

**F17 · Step counters in the canvas are inconsistent** (Trip "of 4", "of 5", "of 9"; Employment "of 4" vs "of 3"). The
StepHeader computes "question n of m" from the live question list, as `progressOf()` does today.

**F18 · Globi sizes.** Sticky `rule1` says 56 px on task screens and 40 px in cards; every artboard and the prompt use 124
beside a question bubble, 96 in Home cards, 57 in info cards. The artboards and the prompt win.

**F19 · SignUpAtPay shows Apple.** CLAUDE.md records Apple sign-in as previously disabled on the website. The app already
has `expo-apple-authentication` and `usesAppleSignIn: true`; Apple is required on iOS when Google is offered. Account
creation still needs name, DOB and the 18+ confirmation, never inferred from OAuth data.

**F20 · Current `mobile-app` wizard asks `passportNumber`, `travelingWith` and `dateOfBirth` before payment.** CLAUDE.md:
"Passport number stays after payment"; the contract puts `travelingWith` in `validateTrip`. Canvas and contract agree with
CLAUDE.md, so Phase 3 moves passport number and travelling-with after payment and keeps DOB before (F3).

**F21 · Push deep links.** The website's `notify-status` sender only emits `/applications/<id>`. Deep links to Upload,
Appointment and DocRejected need the sender to emit those paths; the app side is in this plan, the sender change is a
website PR noted for the owner.

**F22 · App version strings.** Canvas shows "2.1.0 (412)"; `app.json` is 1.0.0 and no store build exists. The About
screen reads the real version from `expo-constants`; nothing is hard-coded.

---

## 7. Decisions (29 Oct: the owner asked to resolve the conflicts in the app's best interest and keep it aligned with the website)

1. **Base and PR target:** the existing app on `mobile-app`; phase PRs target `mobile-app`.
2. **Branch:** `claude/quirky-hypatia-0pxipt`.
3. **Globi batch 2:** committed; pose names assigned from the clips (section 4.2). A wrong name is a one-line manifest fix.
4. **Every F-item in section 6 is resolved with the stated default**, website and contract first: insurance is a
   recorded preference quoted separately and never charged in the app (F1); DOB stays before payment (F3); contract
   values with canvas labels (F4, F5: "Not working" stored as `unemployed`); spouse passport details go to a
   `travellers` row (F6); `missingDocuments`, `flexibleDuration`, `flexibleMonths` are added to the contract as optional
   keys in Phase 4 (F7, F8); 3-month passport rule kept (F10); no provider name in copy (F12); referral screen without a
   credits ledger (F13); wallets-only payment methods (F14); support email follows the website (F15).
5. **Type role for list rows:** the prompt lists "list rows and buttons 16/600"; every canvas artboard draws row labels at
   16/400 and buttons at 16/600. The canvas wins (prompt rule), so `row` is 16/400 with 600 for a selected row, `button` 16/600.

---

## 7a. Phase 1 · delivered (29 Oct)

| Item | Where |
|---|---|
| Type roles `question` 19/600, `pageTitle` 28/600, `resultTitle` 23/600, `tile` 20/600, `option` 16/500, `optionSm` 15/500, `row` 16/400, `button` 16/600, `note` 13/400; `Text` no longer accepts weight 700, and no 700 is left in the app | `mobile/theme/typography.ts`, `components/ui/Text.tsx` |
| Radii: cards and tiles 16, buttons and inputs 14, bubbles 18 with a 6 pt tail, sheets 24; buttons and inputs 52 pt; header circles 36 pt in a 44 pt target | `mobile/theme/tokens.ts`, `components/ui/core.tsx` |
| No gradients: skeleton pulse, sticky footer, boot screen and country-card scrim are flat; `expo-linear-gradient` removed; no glow on primary buttons | `components/ui/core.tsx`, `components/Boot.tsx`, `countries.tsx` |
| Globi: 21-pose `GlobiPose` (expo-video HEVC-alpha clip, transparent WebP poster, still under Reduce Motion / animations off / `animated={false}`, mirrored in RTL, pauses off screen and in the background, muted and mixing with other audio); `scripts/globi-convert.sh` (stills on any OS, clips on macOS, clamps the 1/255 matte the background removal left); 21 stills committed; SVG mascot deleted | `components/globi/*`, `mobile/assets/globi/*`, `scripts/globi-convert.sh`, `lib/globiMotion.ts` |
| Canvas components: `Bubble`, `QuestionHeader`, `GlobiLine`, `StepHeader`, `Card`, `Row`, `RowGroup`, `Switch`, `ChoiceTile`, `Tick`, `ListChoice`, `PrimaryButton`, `SecondaryButton` (WhatsApp dot), `Chip`, `InfoNote` (incl. amber "To get later"), `Toast` / `showSaved`, `SheetScaffold`, `ActionSheet`; `Skeleton` restyled | `components/ui/canvas.tsx`, `components/ui/feedback.tsx` |
| Every wizard and Continue question is now asked by Globi in his bubble with the canvas copy and pose (Arabic added); no description line under questions | `lib/questions.ts` (`ask`, `pose`), `components/wizard/QuestionView.tsx`, `lib/ar.ts` |
| Autosave: the 1.5 s "Saved" pill appears when the server confirms (wizard draft sync and Continue saves); only problems stay on screen | `components/wizard/sync.tsx`, `app/continue/[id].tsx`, `app/_layout.tsx` |
| Analytics: the 20 v1 events with allow-listed properties, as a third server tier that waits for `migrations/0016_wizard_events_v1.sql` (not run; owner approval) without dropping the existing funnel | `lib/analytics.ts`, `mobile/migrations/0016_wizard_events_v1.sql` |
| Placeholder amounts in one file with TODOs (insurance 90 AED, referral 50 AED, visa and centre fee estimates, VAT 5 %) | `mobile/config/pricing.ts` |
| Website alignment fixes: the payment provider's name removed from five customer strings ("payment gateway"); passport number no longer asked before payment (website traveller step, contract `validatePersonal`); old drafts parked on that question resume at Contact | `lib/receipt.ts`, `app/payment/[id].tsx`, `app/receipt/[id].tsx`, `app/(tabs)/applications/[id].tsx`, `lib/questions.ts` |
| Dev-only gallery of every component and pose (`/dev/gallery`; redirects in release) | `mobile/app/dev/gallery.tsx` |

Still open from Phase 1: the `.mov` clips need one macOS run of `scripts/globi-convert.sh` (until then Globi shows his
still everywhere, by design); the HEVC-alpha transparency in `VideoView` must be checked on a device. The Playwright
e2e scripts (`scripts/e2e-*-web.mjs`) still assert pre-canvas question titles ("City of Residence", "Marital Status")
that `mobile-app` had already removed; they are rewritten with the wizard in Phase 3.

---

## 8. Verification limits of this environment

- No iOS simulator and no macOS: screenshots are Expo web frames; HEVC-alpha encoding and ActivityKit builds need a Mac.
- Network policy blocks `*.supabase.co`, `api.expo.dev` and `www.ezvisa.net` from cloud sessions (per `mobile/HANDOFF.md`),
  so live sign-in, upload and payment paths are exercised against the mocked Supabase scripts only. Payments stay in test mode.

## 7b. Phase 2 · delivered (29 Oct)

| Item | Where |
|---|---|
| Welcome as drawn: logo, Globi 236, title, "Start my application" (guest straight into the wizard), Apple and Google side by side (only when the provider is on), "I already have an account". No onboarding, no sign-up button | `mobile/app/welcome.tsx`, `components/GoogleButton.tsx` |
| Sign in, Create account, Forgot, Magic link, Reset: Globi beside a bubble title, labelled 52 pt fields, "Forgot password?", "Email me a sign-in link", "Continue without an account"; "Check your email" hero with Globi | `components/auth/AuthShell.tsx`, `components/AuthForm.tsx`, `app/auth/*` |
| Face ID lock: blurred app behind a canvas veil, Globi with the Face ID badge, Unlock and Use passcode | `lib/lock.tsx` (`LockScreen`) |
| Guest drafts: already saved on the phone with no owner and uploaded to the account on the first sign-in (with the existing conflict prompt); no change needed | `lib/form.tsx` |
| Home: page title and avatar (unread dot), one hero card (active application with Globi, reference, next action, progress, button / "Pick up where you left off?" draft with the stopped question and progress / "No application yet"), other applications as rows, three popular countries; offline (Globi waits, queued uploads with Cancel, actions paused, "from HH:MM"), loading skeleton, error view | `app/(tabs)/(home)/index.tsx`, `components/home/PopularTiles.tsx`, `components/ui/feedback.tsx` (`ErrorView`), `components/NetworkBanner.tsx` |
| Tab bar: flat white pill, four tabs, selected brand blue (no glass, no centre button); `expo-glass-effect` and the Glass component removed | `components/nav/TabBar.tsx` |
| Countries: title, search (Home search opens it with the query), data-backed chips (All 29, Popular, VFS Global, TLScontact, BLS; the canvas's "Fastest appointments" and "Beach" have no data), Globi tip, tinted tiles with flag and "Stay up to 90 days" | `app/(tabs)/(countries)/countries.tsx` |
| Country: fact tiles (Stay 90 days, Embassy fee from `config/pricing.ts`, Decision ~15 days), Globi tip with the visa centre, "From 249 AED" beside Apply | `components/country/GlanceList.tsx`, `CountryFooter.tsx` |
| Applications: "+", Active / Past, "Needs you" and "With the team" rows with pills (Continue, Upload, Pay, Ready), phone drafts included, the website tip; guest view with phone drafts, Sign in and Create account | `app/(tabs)/applications/index.tsx` |
| Discard confirm: the canvas action sheet (Globi, "Discard the Spain draft?", answers saved, nothing refunded, Keep it) for swipe, long press and the detail trash; the swipe now asks once and slides back | `components/DiscardHost.tsx`, `lib/discard.ts`, `components/SwipeToDiscard.tsx` |
| Section headers 13/600 sentence case, grouped lists on the 20 pt gutter; Arabic for every new string | `components/ui/core.tsx`, `lib/ar.ts` |

## 7c. Phase 3 · delivered (29 Oct)

| Item | Where |
|---|---|
| Every question is the title inside Globi's bubble, no description line; answers drawn per the canvas (list rows, two-column grid tiles, two tall yes/no tiles, chips) from a `view` field per question; the stored values stay the contract's | `mobile/lib/questions.ts` (`view`, `explain`), `components/wizard/choices.tsx`, `QuestionView.tsx` |
| Tap Globi: "Why I ask this" sheet (why, used for, shared with, Ask the team on WhatsApp) on every question | `components/wizard/QuestionView.tsx`, `lib/questions.ts` (`explain`) |
| Destination: popular countries then "All N countries"; nationality quick grid; traveller tiles ("Who is travelling to France?") | `components/wizard/choices.tsx` |
| Contact asks only the phone (WhatsApp opt-in kept); the account email fills the email. The passport number is asked after payment only (website rule) | `lib/questions.ts` |
| Three-step header (Destination · Traveller · Review & pay) with WhatsApp help; the 1.5 s "Saved" pill once the server confirms | `components/ui/canvas.tsx` (`StepHeader`), `components/wizard/sync.tsx` |
| Review as drawn: Trip / Traveller / Contact rows that open the question, account email tag, "To get later", price rows; then Create account at pay (guests), Insurance (quote / own policy / not now, priced separately, never changes the fee, saved as `insurancePreference`), Price breakdown (per traveller, VAT included, appointment fees from `config/pricing.ts`) and "Pay N AED securely" | `mobile/app/apply/index.tsx`, `lib/missing.ts` |
| Payment states as drawn: checking (three steps with seconds), received (numbered next steps, Continue application, View receipt, Done), not confirmed yet (last checked), still confirming (no second charge), didn't go through, cancelled (Pay now / Later), offline | `mobile/app/payment/[id].tsx` |
| Notification pre-prompt once after the first payment, before the next screen (examples of the only messages sent) | `components/payment/PushAsk.tsx` |
| Draft conflict: the two copies side by side, one button per copy | `components/wizard/sync.tsx` |
| v1 analytics: question view / answer / back with time on screen, wizard exit, review row tap, sign-up at pay, payment result, Globi tap, WhatsApp hand-off (stored once migration 0016 runs) | `lib/analytics.ts` |
| Arabic for every new string (212 added) | `lib/ar.ts` |

## 7d. Phase 4 · delivered (29 Oct)

Decision: no contract change was needed. The flexible window, the "To get later" list and the insurance preference are
app-only `additional_notes` keys (`flexibleDuration`, `flexibleMonths`, `missingDocuments`, `insurancePreference`), which
the contract's `applicationColumns` keeps (`...prev`). Flexible dates still fill the contract's exact
`travelStartDate` / `travelEndDate` (the first possible days in the window) with `datesFlexible: "yes"`, so the website,
the validators and `needsContinue` behave exactly as before. The canvas's spouse date of birth / passport number and
spouse employment screens have no contract fields and are left out (website alignment).

| Item | Where |
|---|---|
| Header as drawn: Trip · Passport · Spouse · Employment (only the steps this case still has), back, "Save" closes (every answer is already saved) | `mobile/app/continue/[id].tsx` |
| Dates: Flexible is the default (How long? stepper up to 90, Which month? grid with "too soon", one or two neighbouring months, summary line); "I have exact dates" with Departure / Return / Stay above the calendar | `components/wizard/dates.tsx` |
| Merged screens as a `group` question kind (each member keeps its contract keys, options and rules): funding + balance; first visa + refusal + details; passport number + expiry (expiry optional, must cover the return + 3 months); spouse name + passport; job + start date + salary; business name + income | `lib/questions.ts` (`GROUPS`, `partsOf`), `components/wizard/QuestionView.tsx` |
| A "No" never blocks: passport, spouse passport and NOC go to "To get later" with an amber note, and the list is saved as `missingDocuments` with every answer | `lib/missing.ts`, `app/continue/[id].tsx` |
| Residence visa asks "valid until at least {return + 3 months}?"; NOC shows what a good NOC says and "Send me the template" (WhatsApp) | `lib/questions.ts`, `QuestionView.tsx` |
| Last question's button: "Finish and upload documents" | `app/continue/[id].tsx` |
| Tests updated for the grouped screens, plus a new test of the group rules; Arabic for every new string | `scripts/wizard-rules.test.ts`, `scripts/test-after-payment.ts`, `lib/ar.ts` |

## 7e. Phase 5 · delivered (30 Oct)

| Item | Where |
|---|---|
| Status as drawn: hero (flag, country, travellers, dates, "in N days"), one card with Globi and "Next: you / Next: us" and the single action (pay, a few more questions, upload N documents, a document needs replacing with the staff reason and "Ask why", the team is writing your file, file ready, appointment, waiting for the decision, approved with Share and Apply again, refused with Talk to a specialist and Apply again), the status steps, "To get later" (until the document arrives), Trip rows (Appointment, What happens on the day, Trip plan, Receipt) | `components/status/StatusCards.tsx`, `app/(tabs)/applications/[id].tsx` |
| Documents: "Your documents · i of n received", Still needed, Received, We prepare these | `app/(tabs)/applications/[id].tsx` |
| Book appointment: centre from `lib/visaCentres.ts` (Dubai or Abu Dhabi by emirate), reference and passport numbers to type, "any date before {trip − 14 days}", then "I have booked, add the date" (date + time, saved to `additional_notes.appointment`; staff columns still win) | `app/appointment/[id].tsx` |
| Appointment booked: date and place, Directions, Add to calendar, Change, packing list (on the phone), biometrics, decision timing, the day-before reminder (local notification opening the appointment) | `app/appointment/[id].tsx`, `components/status/AppointmentDay.tsx`, `lib/reminders.ts` |
| What happens on the day sheet (fees from `config/pricing.ts`) | `components/status/AppointmentDay.tsx` |
| Every push opens its own screen: application, continue, appointment, trip plan, receipt (tested) | `lib/notifyRoute.ts`, `scripts/check-push.mjs` |
| v1 analytics: status_view (you / us), appointment_booked, WhatsApp hand-offs | `components/status/StatusCards.tsx`, `app/appointment/[id].tsx` |

Not built, on purpose (need the owner or native work): Referral (no referral programme or credit exists on the business side; the 50 AED in `config/pricing.ts` stays a placeholder), Rate experience and the App Store review ask, the Live Activity (needs an ActivityKit widget target in a native build), the camera capture guide and document viewer redesign (the existing picker, crop and upload queue stay), the trip countdown screen (the trip-day reminders already exist). "Approved" and "Refused" use the website's `completed` and `rejected` statuses.

## 7f. Phase 6 · delivered (30 Oct)

| Item | Where |
|---|---|
| Account as drawn: profile card (photo, name, email, member since), Travel (saved travellers, application history, receipts), App (notifications, settings), Help (WhatsApp, email, legal pages), Sign out, Delete account | `app/(tabs)/account/index.tsx` |
| Delete account as a sheet: what is deleted and kept, paid cases in progress named, "Type DELETE to confirm"; WhatsApp / email request when the server can't do it | `app/(tabs)/account/index.tsx` |
| Settings (new): Notifications (trip, appointment and passport reminders, passport expiry), Language & region, Appearance (theme, Globi animations), Security & privacy (Face ID, lock after, usage sharing, privacy policy), About (version with diagnostics, terms, refunds) | `app/(tabs)/account/settings.tsx` |
| Status steps reordered (owner, 30 Oct): Submitted, Paid, Documents, File ready, Appointment, Decision (Visa approved / Not approved) | `lib/timeline.ts`, `scripts/timeline-check.ts` |
| Icons the web build could not draw are mapped | `components/ui/core.tsx` |

Not built (no data or backend behind them): payment methods (cards are handled by the payment gateway), data & storage sizes, active-device list and "sign out everywhere", quiet hours and per-channel email / WhatsApp switches (pushes are sent by the server per status; the app can't change email or WhatsApp sending), report a problem with logs.

## 7g. Phase 7 · delivered (30 Oct)

| Item | Where |
|---|---|
| Dark mode on (canvas HomeDark): Light stays the default; Dark or System from Settings → Appearance; the dark palette uses the #3D5AFE accent; new builds report the system appearance (`userInterfaceStyle: automatic`) | `lib/appearance.tsx`, `app.json` |
| Arabic RTL checked on sign-in, Home, status, Settings, Countries and the wizard; remaining English strings translated (document names in the Next card, "To get later" labels, search placeholders) | `lib/ar.ts`, `components/status/StatusCards.tsx` |
| Over-the-air safety: Globi's video player loads only when the build has the expo-video native module, so this update can't crash a build made before it (the stills show instead) | `components/globi/GlobiPose.tsx` |
| Release checks: type check, lint (0 errors), all node and bun checks, contract sync 284/284, iOS + Android `expo export` with the live database reference | `.github/workflows/eas-update.yml` (same steps) |

Still open for the owner: the HEVC-alpha Globi clips need one macOS run of `scripts/globi-convert.sh` (no hevc_videotoolbox here); the app icon and splash are native assets and change with the next store build, not an update. (Migrations 0008 and 0016 and the amounts in `config/pricing.ts` were approved and done on 30 Oct, see 7h.)

## 7h. Owner approvals and follow-ups (30 Oct)

The owner approved the open items ("Approve all").

| Item | Result |
|---|---|
| `migrations/0008_wizard_events_funnel.sql` (approved 22 Oct, never run) and `0016_wizard_events_v1.sql` | Run on ezvisa-uae in that order. Verified: every constraint is in place, and an anon insert of v1 events works (test rows rolled back; the 374 existing rows are untouched). The app needs no update: queued v1 events send on the next retry. |
| `config/pricing.ts` amounts | Confirmed as they are (insurance 90 AED, referral 50 AED, visa fee €90 ≈ 360 AED, centre fee ≈ 130 AED, VAT 5%) |
| Help (canvas Help, ReportProblem) | Search, the FAQ (lib/faq.ts, the website's answers), WhatsApp and email, "Report a problem" email with the app version and phone model only | 
| Trip countdown (canvas TripCountdown) | After approval: days to departure and a "Before you fly" checklist on the phone; a push can open it |
| Finished cases | No "Book now" or "Still needed" once a case is approved, refused or cancelled |

Still needs a Mac or a store build: the Globi clips, the app icon, the splash and the system appearance setting.

## 7i. Pay first, then the account; Globi animated (30 Oct)

| Item | Where |
|---|---|
| Owner: the payment comes before the account. Guests give email and phone at Contact (signed-in customers still see only the phone), go Review → insurance → price → "Pay N AED securely" (the guest row is created and the payment gateway opens in one step). After the result (paid, pending, failed or cancelled) the payment screen asks "Create your account" with that email prefilled; once signed in it re-checks and shows the signed-in next steps. The sign-up-at-pay page is removed. | `lib/questions.ts`, `components/wizard/QuestionView.tsx`, `app/apply/index.tsx`, `app/payment/[id].tsx` |
| Globi moves: transparent animated WebP for all 21 poses (320 px, 12 fps, 8.7 MB in total), built on Linux by `scripts/globi-convert.sh --stills-only`; no new native module, so it ships in an update. Web uses React Native's Image (expo-image's web wrapper has zero height and Chrome never advances it). | `assets/globi/anim/`, `components/globi/GlobiPose.tsx` |
| Test: a guest's contact needs email and phone; signed in, the phone is enough | `scripts/wizard-rules.test.ts` |

## 7j. Guest follow-up, travellers and details, end-to-end test (30 Oct)

| Item | Where |
|---|---|
| Bug fixed: "Start my application" on Welcome (and "Continue without an account" on sign-in) landed on Home, not the wizard. Guest mode switches the protected routes, which reset navigation and dropped the push; the root now opens the wizard once the app side is mounted, and closes a sign-in screen left underneath | `app/_layout.tsx`, `lib/onboarding.ts`, `app/welcome.tsx`, `app/auth/index.tsx` |
| A guest's submitted case is remembered on the phone until someone signs in with that email; Home shows "Create your account" for it and opens the payment result with the account form | `lib/guestCases.ts`, `app/(tabs)/(home)/index.tsx`, `app/apply/index.tsx` |
| Saved travellers as drawn (Globi line, one card per person: passport masked, expiry with "check before your next trip" within a year, emirate, last used) | `app/(tabs)/account/travellers.tsx` |
| Account details as drawn (Personal, Sign-in methods with Google linked or not, Membership, and the canvas notes) | `app/(tabs)/account/details.tsx` |
| New end-to-end run of the v1.1 wizard (signed in: destination → nationality → name → phone-only contact → travelling with → Review → insurance → 249 AED; guest: email asked, account form after a failed payment): 15/15. The five older e2e scripts are marked stale | `scripts/e2e-wizard-web.mjs`, `scripts/mock-supabase.mjs` (in-memory `travellers` table) |
| The resume sheet no longer tells a guest the draft is "on your account" | `app/apply/index.tsx` |

## 7k. Photo grid, apply again, rating, photo tip (30 Oct)

| Item | Where |
|---|---|
| Owner: Home's popular countries as a two-column grid, each tile a photo of the country (bundled `assets/countries`), flag and name on a flat scrim; six countries; one column at large text sizes | `components/home/PopularTiles.tsx` |
| Apply again (canvas Reapply): what carries over (travellers, passport validity, employment, destination; new dates; a fresh bank statement), then the wizard with the "use your last application" offer | `components/status/Reapply.tsx` |
| Rate your experience (canvas RateExperience), once per finished case: stars, what went well, what to fix, sent to support by email (no feedback backend). The App Store review ask waits for the next store build (native module) | `components/status/RateCard.tsx` |
| Photo tip before the camera (canvas CameraCapture): "Fill the frame. Avoid glare on the photo." on the source picker | `lib/capture.ts` |
| Inbox footer says whether push notifications are on | `app/(tabs)/account/notifications.tsx` |

## 7l. Document viewer, Data & storage, guest email after the gateway (30 Oct)

| Item | Where |
|---|---|
| Document viewer (canvas DocViewer): an uploaded photo opens inside the app from a 60-second signed link (never cached to disk), with its name, type, where it stands with the team ("Being checked by the team", "Checked by the team", "Needs replacing"), Retake while the case still takes documents, and Done. PDFs still open in the browser | `components/status/DocViewer.tsx`, `app/(tabs)/applications/[id].tsx` |
| Data & storage (canvas DataStorage), from Settings: measured space on this phone (documents waiting to send, cached files, saved answers and settings), uploads waiting to sync (a failed one retries on tap), Clear cached files (never the upload queue's copies), Export my data (a JSON file of the account, applications and saved travellers; uploaded documents are not included) | `app/(tabs)/account/storage.tsx`, `lib/storage.ts` |
| A guest who comes back from the payment gateway (no email in the link) still gets the "Create your account" form prefilled: the email comes from the case kept on this phone | `app/payment/[id].tsx` |
| Mock backend: signed links for the owner's own documents (`/storage/v1/object/sign/visa_documents/…`) | `scripts/mock-supabase.mjs` |

Not drawn as in the canvas: Globi's size is not listed (he ships inside the app and can't be cleared), and the export is a file the person saves or shares, not a ZIP by email (that needs a server job).

## 7m. Check of every screen, Sign out everywhere (30 Oct)

| Item | Where |
|---|---|
| Sign out everywhere (canvas SecurityPrivacy): ends the account's sessions on every phone and browser (Supabase global sign-out; other devices lose access within the hour), with the same "unsaved answers / unsent uploads" warning as Sign out. Needs a connection; offline nothing changes and it says so | `lib/auth.tsx`, `app/(tabs)/account/index.tsx` |
| Screen sweep: opens all 35 routes signed in and signed out, in English light, English dark and Arabic (105 loads), against the mock; fails on a page error, console error, blank screen or error screen. 105/105 pass | `scripts/e2e-screens-web.cjs` |

Canvas screens still not built, and why:
- Onboarding 1–3 and Sign up at pay: dropped (owner decisions: no onboarding; pay first, account after payment).
- Referral (50 AED credits): needs the owner to approve the offer and a credits backend.
- Payment methods (saved cards): needs card storage at the payment gateway.
- Live Activity, App Store review prompt, icon and splash: need native code in the next store build.
- Device list (Security & privacy) and quiet hours for pushes: need a server-side session list and push scheduling.
- Two-factor sign-in by email: needs the Supabase MFA setting.

## 7n. The website's steps, no decision (30 Oct)

Owner: "no need for decisions in this app … our work finished after creating the file … follow the same steps as the web app".

| Item | Where |
|---|---|
| Status steps are the website tracker's (`components/dashboard/progress-tracker.tsx`, `lib/application-status.ts` on main): Payment, Documents, Expert review, Preparation, Ready, Appointment, with the website's labels, descriptions and counts ("1 of 4 uploaded"). The Submitted and Decision steps are gone | `lib/timeline.ts`, `components/ui/data.tsx` (timeline and the small progress rail) |
| Stages as the website reads them: `approved` = preparing the file (not a visa approval), `ready` = Ready (download and print), then the appointment; the case is finished once an appointment date is in. The live table has no download column, so an entered appointment also moves past Ready | `lib/timeline.ts` |
| No visa decision anywhere: "Visa approved / Share the news", "Not approved / Talk to a specialist", "Waiting for the decision", "Visa granted / refused" and the appointment's "Decision · about 15 days" are replaced by "All done" (our work is finished), "Application closed" (status rejected, "Message us") and "Preparing your file". The country tile "Decision ~15 days" is now "When to apply · 6 months to 15 days before", like the website's facts strip | `components/status/StatusCards.tsx`, `lib/nextAction.ts`, `lib/stage.ts`, `lib/data.ts` (`APP_STATUS_LABEL`), `app/appointment/[id].tsx`, `components/country/GlanceList.tsx` |
| Tests rewritten for the six steps | `scripts/timeline-check.ts` |

## 7o. Owner round: welcome, Home, tab bar, wizard fixes (30 Oct)

| Item | Where |
|---|---|
| Welcome heading "Schengen visa assistance" on one line (shrinks on narrow phones or very large text) | `app/welcome.tsx` |
| Home: other applications show the newest four, with "See all" and a "See all n applications" button to the Applications tab; four common questions that fit where the customer is (before applying, before paying, after paying), "All questions" opens Help. The FAQ accordion is one component for Help and Home | `app/(tabs)/(home)/index.tsx`, `components/FaqList.tsx` |
| Country page: tiles are Stay 90/180 and When to apply 1–5 months before (owner's copy); no embassy fee tile; no "Open in Maps" links on the visa centre addresses | `components/country/GlanceList.tsx`, `components/country/VisaCentre.tsx` |
| Tab bar (owner: iOS 26+ glass): Liquid Glass (expo-glass-effect, interactive) where available, frosted blur otherwise; the blue selection slides between tabs on a spring with a small squish, tabs dip when pressed; Reduce Motion turns the motion off. The selection follows each tab's measured place (right to left too). Account tab shows the profile photo when there is one | `components/nav/TabBar.tsx` |
| Wizard: Yes / No drawn as the canvas does (short centred buttons, or tiles with the text at the top when there is a sub-line); before, tall tiles left an empty space that looked like a missing icon | `components/wizard/choices.tsx`, `components/ui/canvas.tsx` |
| Wizard: "Who is travelling?" no longer skipped when the destination is picked before the saved travellers load (the wizard waits, at most 6 s); the website request gives up after 4 s and the table is read instead | `app/apply/index.tsx`, `lib/travellers.ts` |
| Application page: "Upload documents" scrolls to Your documents and highlights the first missing one (a rejected document still opens the picker) | `app/(tabs)/applications/[id].tsx` |
| "Scan pages (PDF)" removed from Add document (owner: broken) | `lib/capture.ts` |
| Session key stays the same if the Supabase address becomes a custom domain (for Google sign-in branding) | `lib/supabase.ts` |

## 7p. Sample NOC (30 Oct)

| Item | Where |
|---|---|
| Website page "What a good NOC looks like" (`/documents/noc-sample`, Arabic too): a sample letter from a UAE employer with the parts to fill in marked, and the checklist every NOC needs. Merged to main ([PR #114](https://github.com/kirolosedward1/EZvisa-anitgravity/pull/114)) | website `app/documents/noc-sample/page.tsx` |
| The app's NOC card ("What a good NOC says") has "See a sample NOC", which opens that page in the in-app browser (Arabic page in Arabic) | `components/wizard/QuestionView.tsx` |

## 7q. Performance and launch prep (30 Oct)

| Item | Where |
|---|---|
| Store builds use the fingerprint update policy; Expo Go / preview keep sdkVersion (Expo Go needs it). `APP_VARIANT=production` in the EAS production profile | `app.config.ts`, `eas.json` |
| One shared applications list for every screen: instant render, simultaneous loads merged, 3 s reuse (4 quick tab switches: 1 query). Detail screens show the cached row first. Memory only, emptied on sign-out | `lib/appsCache.ts`, `lib/useApps.ts`, `lib/userData.ts`, detail screens |
| Realtime on visa_applications (migration 0009 block 2 applied, guard passed); the application page listens to its own row (30 s polling → 2 min fallback) | `app/(tabs)/applications/[id].tsx` |
| Universal links: app side (associated domains, Android intent filters, `lib/linkRoute.ts` + `+native-intent`), website files (PR #116) waiting for APPLE_TEAM_ID / ANDROID_CERT_SHA256 on Vercel | `app.config.ts`, `app/+native-intent.tsx`, `scripts/link-route-check.ts` |
| Crash reports tagged production / preview | `lib/sentry.ts` |
| Maestro flows for the real build; launch checklist | `.maestro/`, `docs/LAUNCH-CHECKLIST.md` |
| Not done, on purpose: FlashList (lists are short or already virtualised), photo placeholders (photos are bundled, 720 px), no-restart language switch (React Native needs the reload to flip native layout) | |
