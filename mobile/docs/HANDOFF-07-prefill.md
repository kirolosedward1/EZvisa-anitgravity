# HANDOFF NOTE: chat 07, Prefill & Profile Data

First shipped in [PR #6](https://github.com/kirolosedward1/EZvisa-anitgravity/pull/6) (merged into `mobile-app`), then a QA follow-up on branch `claude/bold-feynman-ssk2ur` after the pre/post-payment wizard split (8651059). All work is in `mobile/`. No DB, RLS or storage changes were applied.

## Where profile data lives (verified)
- **Live DB** (`dravvaykssrbktztmrlj`, ezvisa-uae): **no `profiles` table** and no per-user passport columns. Applications are `visa_applications` rows owned by `email` = the user's email.
- **Website prefill** (web `app/apply/page.tsx`): email, first/last name and phone from Supabase Auth `user_metadata` (fills empty fields only).
- The `profiles` / `applicants` tables seen via the Supabase connector belong to the **old** project `rjbgteqgqaxalcfnksjc`, which the app no longer uses. Ignore them.
- The live project is not reachable from this session's Supabase connector. I couldn't check its current RLS state, so the code filters every query by the user's email itself and does not rely on RLS alone.

## What was built
| Piece | File |
|---|---|
| Profile load / fill / diff / save, phone split, per-draft "asked" flags | `lib/profile.ts` (new) |
| Prefill on a new draft, "From your profile" chip, review prompt | `app/apply/index.tsx` |
| Expired-passport message | `lib/wizard.ts` (`validatePassport`, asked after payment) |
| Prefill flags wiped on sign-out (added to chat 03's list) | `lib/userData.ts` (`USER_KEYS`) |
| Arabic strings | `lib/ar.ts` |
| Proposed profile table (**not applied**, needs approval) | `migrations/0013_customer_profiles.sql` |
| Tests | `scripts/test-profile.ts` + `run-test-profile.mjs`, `scripts/e2e-prefill-web.mjs`, `scripts/stubs/supabase.js` |

### Rules as implemented
- **Sources** (all scoped to the signed-in user): `user_metadata` first (`first_name`, `last_name`, `full_name`, `phone`, `phone_country`, `nationality`, `date_of_birth`). Anything missing comes from the user's own latest real application (`.eq("email", me)`, newest first, cancelled rows skipped, drafts only as a last resort). Passport validity and expiry come only from there.
- **When:** signed in, and the open draft is new (no identity answers yet, no cloud draft id), and no account draft is about to be resumed (chat 06's `latestDraft` resume wins). Runs once per account + draft, so "Start Fresh" and new applications also get prefilled.
- **What:** only empty fields, and **only answers the wizard asks before payment** (`PRE_PAYMENT_KEYS`, derived from `lib/questions.ts`): first/last name, email, phone, nationality (visa-required list only). Never over existing answers. Date of birth and passport details are loaded but **not prefilled**: since 8651059 they are asked only after payment (Continue application), and Continue skips any question that already has a valid answer. A value prefilled before payment would never be shown to the user. The "Use details from your last application?" card follows the same rule (`OFFER_KEYS`: emirate, marital status), and its subtitle lists what it fills.
- **Editable:** prefilled answers are ordinary answers. A small "From your profile" chip shows while the value is unchanged.
- **Expired passport:** no longer prefilled (see above). When Continue asks for the expiry, `validatePassport` flags an expired date: "This passport has expired. Enter the expiry date of your current passport."
- **Confirm:** on Review, if any prefilled savable field shown there (first/last name, phone, nationality) differs from the profile, a card asks "Update your profile too?" and lists each change. **Update profile** calls `auth.updateUser({ data })` with only the changed keys, after re-checking that the signed-in user id still matches. **Keep profile**, or submitting without answering, means no write. The question is asked once per draft (`ezvisa.prefill.v1` flag, no personal data in it).
- **Passport details are never written to `user_metadata`**, because it is copied into every access token. Saving them needs the proposed table (`migrations/0013_customer_profiles.sql`).
- **No cache:** the profile lives in component state only and is fetched fresh for prefill and for Review.
- **Account switch:** handled by chat 03 (`lib/userData.ts` wipes every personal key on any sign-out) and chat 06 (each draft records its `owner` and is hidden from other accounts). This PR first shipped its own owner-tag purge in `lib/form.tsx`. When chats 03/06 landed, that was dropped in favour of theirs, and this PR only adds `ezvisa.prefill.v1` to `USER_KEYS`. The profile itself is never stored on the phone.

## Tests run (all passing, on `mobile-app` @ 8651059 + the QA fixes)
- `npx tsc --noEmit`: clean.
- `npx expo lint`: 0 errors, and no warnings in this feature's files.
- `node scripts/run-test-profile.mjs`: 34/34 logic checks pass. They cover:
  - scoping to the signed-in user
  - pre-payment-only prefill, and Continue still asking date of birth and passport
  - expired passport flagged
  - no overwrite of existing answers
  - change detection
  - confirm-only write, with nothing written before confirmation
  - cross-account refusal
  - new and partial profiles
  - phone split
  - asking once
- `scripts/e2e-prefill-web.mjs`: the real app UI on Expo web in Chromium at **390 and 430 px**, with two accounts on one browser profile and Supabase mocked at the network layer. 16/16 checks pass at each width, including an answer surviving a reload unchanged. Screenshots are in `docs/screenshots/07-prefill/`, including `11-review-confirm-prompt-arabic-390.png`.
- `migrations/0013_customer_profiles.sql`, applied to a throwaway local Postgres 16 (with stand-ins for Supabase's `auth` schema and roles):
  - it applies, and re-runs, cleanly
  - the owner can read and write their own row
  - another account sees 0 rows and cannot insert for the owner
  - signed-out users (`anon`) are denied
- **Control:** the same sign-out → sign-in check failed on the old code (`mobile-app` @ 591aced, before chats 03/06): account B saw A's typed surname. It passes on the merged branch.

## Not done / needs you
1. **Real iPhone test not run.** Nothing here can drive a phone. Steps: in Expo Go on an iPhone, sign in as test account A (with a past application) → New application → check the prefilled fields and the chip → change the phone → Review → confirm prompt → Update profile → Account → Sign out → sign in as B → New application: empty fields, nothing of A. Then sign out and back in as A: the new draft has the updated phone.
2. **Approval needed:** `migrations/0013_customer_profiles.sql`, if you want passport details saved to a profile. Not applied. Renumbered from 0012, which is `0012_claim_device_token.sql` (push).
4. **Decision needed: date of birth and passport prefill after payment.** Today they are not prefilled anywhere. To prefill them on Continue, Continue would have to show prefilled questions for confirmation instead of skipping answered ones. That changes the Continue screen (chat 09's), so it isn't done without your call.
3. **Chats 03/06:** merged. `lib/form.tsx` and the Account screen are theirs unchanged. Prefill deliberately yields to `latestDraft()` resume, and to a draft row chat 06 creates early, via `isFreshDraft` + `draftId`.
