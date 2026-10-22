# HANDOFF NOTE: chat 07, Prefill & Profile Data

Branch `claude/bold-feynman-ssk2ur`, based on `mobile-app` @ 591aced. All work is in `mobile/`. No DB, RLS or storage changes were applied.

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
| Drafts tied to their account; purge on sign-out / account switch | `lib/form.tsx` |
| Save open draft to the account before sign-out | `app/(tabs)/account/index.tsx` |
| Arabic strings | `lib/ar.ts` |
| Proposed profile table (**not applied**, needs approval) | `migrations/0009_customer_profiles.sql` |
| Tests | `scripts/test-profile.ts` + `run-test-profile.mjs`, `scripts/e2e-prefill-web.mjs`, `scripts/stubs/supabase.js` |

### Rules as implemented
- **Sources** (all scoped to the signed-in user): `user_metadata` first (`first_name`, `last_name`, `full_name`, `phone`, `phone_country`, `nationality`, `date_of_birth`). Anything missing comes from the user's own latest real application (`.eq("email", me)`, newest first, cancelled rows skipped, drafts only as a last resort). Passport number and expiry come only from there.
- **When:** signed in, and the open draft is new (no identity answers yet, no cloud draft id), and no account draft is about to be resumed (chat 06's `latestDraft` resume wins). Runs once per account + draft, so "Start Fresh" and new applications also get prefilled.
- **What:** only empty fields: names, email, phone, nationality (visa-required list only), date of birth, has-valid-passport, passport number, passport expiry. Never over existing answers. The old "Use details from your last application?" card now offers only the remaining stable answers (emirate, marital, employment). Its subtitle lists what it fills.
- **Editable:** prefilled answers are ordinary answers. A small "From your profile" chip shows while the value is unchanged.
- **Expired passport:** prefilled as-is. Validation shows "This passport has expired. Enter the number and expiry date of your current passport.", and Review shows that message instead of "Missing".
- **Confirm:** on Review, if any prefilled savable field (first/last name, phone, nationality, date of birth) differs from the profile, a card asks "Update your profile too?" and lists each change. **Update profile** calls `auth.updateUser({ data })` with only the changed keys, after re-checking that the signed-in user id still matches. **Keep profile**, or submitting without answering, means no write. The question is asked once per draft (`ezvisa.prefill.v1` flag, no personal data in it).
- **Passport details are never written to `user_metadata`**, because it is copied into every access token. Saving them needs the proposed table (`migrations/0009_customer_profiles.sql`).
- **No cache:** the profile lives in component state only and is fetched fresh for prefill and for Review.
- **Account switch:** every local draft records its owner (`uid`). Guest drafts (no owner) are adopted on sign-in, as before. Once auth has loaded, drafts owned by another account are deleted from memory and AsyncStorage, the open draft is reset if it was theirs, and the previous account's prefill flags and device-only passport expiry (`ezvisa.passportExpiry.v1`) are removed (`ezvisa.owner.v1` remembers the last account). Drafts saved before this change are claimed by whoever is signed in at first launch.

## Tests run (all passing)
- `npx tsc --noEmit`: clean for the app. The only errors are the 12 pre-existing ones in the Deno edge functions under `migrations/functions/`, unchanged.
- ESLint (`eslint-config-expo`, run ad hoc; the project has no lint setup): no new errors. One extra `exhaustive-deps` warning, matching the file's intentional partial deps.
- `node scripts/run-test-profile.mjs` (set `ESBUILD=` if esbuild isn't installed): 31/31 logic checks pass (scoping, expired passport, no overwrite, change detection, confirm-only write, cross-account refusal, new/partial profile, phone split, ask-once).
- `scripts/e2e-prefill-web.mjs`: the real app UI on Expo web in Chromium at **390 and 430 px**, two accounts on one browser profile, Supabase mocked at the network layer. 15/15 checks pass at each width. Screenshots are in `docs/screenshots/07-prefill/`.
- **Control:** the same sign-out → sign-in check run against the old code (`mobile-app` @ 591aced) **fails**. Account B saw A's typed surname, so the leak was real and is now fixed.

## Not done / needs you
1. **Real iPhone test not run.** Nothing here can drive a phone. Steps: in Expo Go on an iPhone, sign in as test account A (with a past application) → New application → check the prefilled fields and the chip → change the phone → Review → confirm prompt → Update profile → Account → Sign out → sign in as B → New application: empty fields, nothing of A. Then sign out and back in as A: the new draft has the updated phone.
2. **Approval needed:** `migrations/0009_customer_profiles.sql`, if you want passport details saved to a profile. Not applied.
3. **Chat 06 overlap:** `lib/form.tsx` (owner field + purge effect) and the cloud-resume interplay. Merge carefully. Prefill deliberately yields to `latestDraft()` resume.
4. **For chats 09/13:** still device-wide (not per account) after a switch: `ezvisa.itinerary.v1.<id>`, `ezvisa.notifications.read.v1`, `ezvisa.discarded.v1`, and scheduled local reminders until `syncReminders` runs for the new account. These hold application ids, not profile data. (The upload queue is emptied on sign-out by chat 10, `lib/uploads.ts`.)
5. Unsaved local answers are lost on sign-out if the personal step isn't complete yet (only a valid personal step can be cloud-saved; `flushDraft` runs before sign-out).
6. Known edge, not reachable from the UI today: if account B signed in while A's draft was still open in memory (no sign-out in between), the purge runs after `latestDraft()` resume has already been skipped, so B's cloud draft would only resume on the next launch. Sign-out always comes first in the app, and it purges.
