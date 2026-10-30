# Launch checklist (store release)

What the code already does is marked **ready**. The rest needs the owner's accounts or decisions.

## 1. Store build
- **ready**: `eas.json` profile `production` (channel `production`, `APP_VARIANT=production`, build number auto-incremented).
- **ready**: store builds use the `fingerprint` update policy (`app.config.ts`): an over-the-air update reaches only
  builds whose native code it matches. Expo Go and the `preview` channel keep `sdkVersion`, so testing in Expo Go is unchanged.
- **owner**: Apple Developer account connected to EAS (`eas credentials`), then
  `eas build --profile production --platform ios` and `eas submit --platform ios` (TestFlight).
- **owner**: Play Console account for Android, then `eas build --profile production --platform android`.
- After the first store build: publish its updates with `APP_VARIANT=production eas update --channel production`.
- **next build**: switch crash reporting to `@sentry/react-native` for native crashes (lib/sentry.ts explains why it is
  a small built-in client today); reports already say which build they came from (`production` / `preview`).

## 2. Universal links (ezvisa.net links open the app)
- **ready**: app side: `associatedDomains` / Android `intentFilters` (`app.config.ts`) and the path mapping
  (`lib/linkRoute.ts`, checked by `scripts/link-route-check.ts`).
- **ready**: website side: `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` (main).
- **owner**: on Vercel, set `APPLE_TEAM_ID` (Apple Developer → Membership) and `ANDROID_CERT_SHA256`
  (`eas credentials` → Android → keystore SHA-256, or Play Console → App signing). Until then both files return 404
  and links keep opening the website.

## 3. Live data
- **ready**: one shared applications list for every screen (`lib/appsCache.ts`); Realtime on `visa_applications`
  (migrations/0009 block 2, applied 2026-10-30), so status changes arrive within a second.

## 4. Payments
- **owner**: switch the payment gateway from test to live mode on the website (Vercel environment). The app has no
  payment keys: it always pays through the website's `/api/create-payment`, so nothing changes in the app.
- Check one real 249 AED payment end to end (pay, webhook marks paid, app shows Payment received), then refund it.

## 5. Sign-in
- **owner (later)**: Google shows the Supabase address until a custom domain (e.g. auth.ezvisa.net, Supabase
  add-on) is set up. The app's session key is already stable across that change (`lib/supabase.ts`).

## 6. Tests on the real build
- **ready**: Maestro flows in `.maestro/` (guest start, sign-in and a tab tour):
  `maestro test .maestro` (sign-in flow needs `-e EMAIL=... -e PASSWORD=...` for a test account).
- Run them on an iPhone simulator and an older Android phone before each store release.
