# EZvisa mobile app – handoff

Expo SDK 57 (do not upgrade, Expo Go on the App Store supports 57) + expo-router + TypeScript.
Lives in `mobile/` on branch `mobile-app`. Never commit to `main` (auto-deploys the live site).

## Run
```
cd mobile
cp .env.example .env   # fill in values
npm install
npx expo start --tunnel
```

## Backend
- Shared with the website: Supabase project `ezvisa-uae` (ref `dravvaykssrbktztmrlj`).
  The switch from the temporary project `rjbgteqgqaxalcfnksjc` to `ezvisa-uae` may be incomplete. Check `.env.example` and `lib/` and finish wiring so that accounts, applications, documents and payments are shared with the website.
- Only the publishable/anon key in the app. Never a service-role key.
- No schema/RLS/migration changes on the live DB without owner approval; propose SQL in `db/proposed-live-changes.sql`.
- Payments: use the website's `/api/create-payment` (Ziina), opened in an in-app browser.

## Domain
https://www.ezvisa.net is the only official domain (`EXPO_PUBLIC_SITE_URL`). Deep link scheme `ezvisa://`.

## Expo
Project kirolosedward1/ezvisa, EAS Update branch `preview`, runtime exposdk:57.0.0. Token lives outside the repo.

## Status
- UI v6/v7 approved, wizard ported 1:1 from `app/apply` + `components/apply`.
- Phase 1 done: autosave/resume, full country lists, +971 phone picker, a11y basics, offline banner, reminders.
- Not verified: signed-in flows with real data (Supabase email rate limit), real-device VoiceOver/Dynamic Type, Android notifications.
- See AUDIT.md for the Phase 2+ backlog (push, Arabic/RTL, App Store build).

## Rules
Never touch BrokersConnect or other projects. Never commit secrets. `npx tsc --noEmit`, `npx expo-doctor` and the root Next.js build must pass before each push.
