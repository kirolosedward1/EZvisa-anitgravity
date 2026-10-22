# HANDOFF NOTE: chat 07, Prefill & Profile Data

Branch `claude/bold-feynman-ssk2ur` ([PR #6](https://github.com/kirolosedward1/EZvisa-anitgravity/pull/6), base `mobile-app`). All work is in `mobile/`. No DB, RLS or storage changes were applied.

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
| Expired-passport message | `lib/wizard.ts` (`validatePersonal`) |
| Prefill flags wiped on sign-out (added to chat 03's list) | `lib/userData.ts` (`USER_KEYS`) |
| Arabic strings | `lib/ar.ts` |
| Proposed profile table (**not applied**, needs approval) | `migrations/0012_customer_profiles.sql` |
| Tests | `scripts/test-profile.ts` + `run-test-profile.mjs`, `scripts/e2e-prefill-web.mjs`, `scripts/stubs/supabase.js` |

### Rules as implemented
- **Sources** (all scoped to the signed-in user): `user_metadata` first (`first_name`, `last_name`, `full_name`, `phone`, `phone_country`, `nationality`, `date_of_birth`). Anything missing comes from the user's own latest real application (`.eq("email", me)`, newest first, cancelled rows skipped, drafts only as a last resort). Passport number and expiry come only from there.
- **When:** signed in, and the open draft is new (no identity answers yet, no cloud draft id), and no account draft is about to be resumed (chat 06's `latestDraft` resume wins). Runs once per account + draft, so "Start Fresh" and new applications also get prefilled.
- **What:** only empty fields: names, email, phone, nationality (visa-required list only), date of birth, has-valid-passport, passport number, passport expiry. Never over existing answers. The old "Use details from your last application?" card now offers only the remaining stable answers (emirate, marital, employment). Its subtitle lists what it fills.
- **Editable:** prefilled answers are ordinary answers. A small "From your profile" chip shows while the value is unchanged.
- **Expired passport:** prefilled as-is. Validation shows "This passport has expired. Enter the number and expiry date of your current passport.", and Review shows that message instead of "Missing".
- **Confirm:** on Review, if any prefilled savable field (first/last name, phone, nationality, date of birth) differs from the profile, a card asks "Update your profile too?" and lists each change. **Update profile** calls `auth.updateUser({ data })` with only the changed keys, after re-checking that the signed-in user id still matches. **Keep profile**, or submitting without answering, means no write. The question is asked once per draft (`ezvisa.prefill.v1` flag, no personal data in it).
- **Passport details are never written to `user_metadata`**, because it is copied into every access token. Saving them needs the proposed table (`migrations/0012_customer_profiles.sql`).
- **No cache:** the profile lives in component state only and is fetched fresh for prefill and for Review.
- **Account switch:** handled by chat 03 (`lib/userData.ts` wipes every personal key on any sign-out) and chat 06 (each draft records its `owner` and is hidden from other accounts). This PR first shipped its own owner-tag purge in `lib/form.tsx`. When chats 03/06 landed, that was dropped in favour of theirs, and this PR only adds `ezvisa.prefill.v1` to `USER_KEYS`. The profile itself is never stored on the phone.

## Tests run (all passing)
- `npx tsc --noEmit`: clean.
- `npx expo lint`: 0 errors, and no warnings in the files this PR adds.
- `node scripts/run-test-profile.mjs`: 30/30 logic checks pass (scoping, expired passport, no overwrite, change detection, confirm-only write, cross-account refusal, new/partial profile, phone split, ask-once).
- `scripts/e2e-prefill-web.mjs`: the real app UI on Expo web in Chromium at **390 and 430 px**, two accounts on one browser profile, Supabase mocked at the network layer (PATCH returns rows like PostgREST, for chat 06's version checks). 15/15 checks pass at each width on the branch merged with chats 03/06/08/09/11. Screenshots are in `docs/screenshots/07-prefill/`.
- **Control:** the same sign-out → sign-in check failed on the old code (`mobile-app` @ 591aced, before chats 03/06): account B saw A's typed surname. It passes on the merged branch.

## Not done / needs you
1. **Real iPhone test not run.** Nothing here can drive a phone. Steps: in Expo Go on an iPhone, sign in as test account A (with a past application) → New application → check the prefilled fields and the chip → change the phone → Review → confirm prompt → Update profile → Account → Sign out → sign in as B → New application: empty fields, nothing of A. Then sign out and back in as A: the new draft has the updated phone.
2. **Approval needed:** `migrations/0012_customer_profiles.sql`, if you want passport details saved to a profile. Not applied.
3. **Chats 03/06:** merged. `lib/form.tsx` and the Account screen are theirs unchanged. Prefill deliberately yields to `latestDraft()` resume, and to a draft row chat 06 creates early, via `isFreshDraft` + `draftId`.
