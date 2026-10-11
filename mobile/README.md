# EZvisa iOS app (Expo)

Native iOS app for EZvisa built with Expo SDK 57 + React Native (real native
UI, not a WebView). It uses the **same Supabase accounts and the same
application records as ezvisa.net** — sign in with your website account and
your applications are there.

## How it fits together

```
iPhone app ──(Supabase Auth: email + password)──► Supabase (same project as the website)
     │
     └──(Bearer access token)──► Next.js  /api/mobile/v1/*  ──(service role)──► visa_applications, storage, Ziina
```

- Data access goes only through `/api/mobile/v1` (in the Next.js app), which
  verifies the token and ownership on every request.
- Wizard options, validation, pricing and document rules live in
  `../lib/shared/visa-wizard.ts` and are imported by both the API and the app
  (`@shared/*`), so they can't drift apart.
- Sessions are stored in the iOS Keychain (`expo-secure-store`).

## Try it in Expo Go

1. Install **Expo Go** from the App Store.
2. The API routes must be deployed. Deploy this branch to a Vercel preview (or
   merge it) and run migration `supabase/migrations/002_mobile_app_and_rls.sql`.
3. Configure the app:
   ```bash
   cd mobile
   cp .env.example .env   # fill in the Supabase URL + anon key + API URL
   npm install
   npx expo start         # or: npm run start:tunnel if your phone is on another network
   ```
4. Scan the QR code with the iPhone camera → opens in Expo Go.

Everything used is bundled in Expo Go (secure store, camera/photo/document
pickers, file system, print, sharing, web browser), so no custom build is
needed for testing.

## Publish to expo.dev (open without a dev server)

Needs an Expo account (`EXPO_TOKEN` or `npx eas-cli@latest login`):

```bash
cd mobile
npx eas-cli@latest update:configure   # first time only: links the project, adds expo-updates
npm run publish:preview               # uploads the JS bundle to EAS Update
```

The update page on expo.dev shows a QR code — scan it with the iPhone camera to
open the app in Expo Go. The `EXPO_PUBLIC_*` values from `.env` are baked in
at publish time, so fill `.env` in first.

## Payments in Expo Go

Checkout opens Ziina in an in-app browser. Ziina returns to
`https://<site>/api/mobile/v1/payment-return`, which bounces back into the app
(`exp://…` in Expo Go, `ezvisa://…` in the store build). Set
`ZIINA_TEST_MODE=true` on the server while testing.

## Ship to the App Store

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
```
Bundle id: `net.ezvisa.app` (change in `app.json` if needed).

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Dev server (scan QR in Expo Go) |
| `npm run start:tunnel` | Same, reachable from any network |
| `npm run typecheck` | TypeScript check (includes the shared schema) |
| `npm run doctor` | Expo dependency/config checks |
