# Sign-in on the website (and the app)

One Supabase Auth project serves https://www.ezvisa.net and the EZvisa app, so a customer signs in with the same
email on both and sees the same applications.

## What the website offers

| Method | Page | Notes |
|---|---|---|
| Email + password | `/login` | `signInWithPassword` |
| Email link (magic link) | `/login` → "Email me a link" | `signInWithOtp`, creates the account if new |
| Create account | `/signup` | password ≥ 8 characters, confirmation email |
| Forgot / reset password | `/forgot-password`, `/reset-password` | reset link → `/auth/callback?type=recovery` → `/reset-password` |
| Google | `/login`, `/signup` | always shown; works once the Google provider is enabled in Supabase (below), until then it says "Google sign-in isn't set up yet" |
| Apple | `/login`, `/signup` (and `/ar`) | hidden unless `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED=true`. When on, Apple's own button. Works once the Apple provider is enabled (below). Until then the button says "Apple sign-in isn't set up yet" |
| Demo accounts | `/login` | cookie-based sandbox, no Supabase user |

Every email link and OAuth round trip lands on **`/auth/callback`** (`app/auth/callback/route.ts`), which exchanges
the code for a session (PKCE), accepts `token_hash` links, turns Supabase error parameters into a short message on
`/login?error=…`, and continues to `?next=` (internal paths only). `/api/auth/callback` only forwards older emails.

Messages are the same short sentences as the app (`lib/auth/errors.ts` mirrors `mobile/lib/authErrors.ts`; the
sync check compares them).

## Supabase configuration (owner, dashboard → Authentication)

1. **URL configuration**
   - Site URL: `https://www.ezvisa.net`
   - Redirect URLs (allow list):
     - `https://www.ezvisa.net/auth/callback`
     - `https://ezvisa.net/auth/callback`
     - `https://*-kirolosedward1-gmailcoms-projects.vercel.app/auth/callback` (preview deployments)
     - `http://localhost:3000/auth/callback`
     - the app's `ezvisa://auth/callback` and, while testing in Expo Go, `exp://**/--/auth/callback`
   A redirect that is not on this list silently falls back to the Site URL. With the Site URL still on
   `localhost`, every confirmation / magic / reset link sends customers to a page that does not exist: this is the
   usual cause of "sign-in doesn't work".
2. **Providers → Google** (makes "Continue with Google" work on the website and shows it in the app):
   1. Google Cloud Console → APIs & Services → *OAuth consent screen*: External, app name "EZvisa", support email
      `support@ezvisa.net`, authorised domain `ezvisa.net`, publish the app (otherwise only test users can sign in).
   2. *Credentials → Create credentials → OAuth client ID → Web application*:
      - Authorised JavaScript origins: `https://www.ezvisa.net`, `https://ezvisa.net`
      - Authorised redirect URI: `https://dravvaykssrbktztmrlj.supabase.co/auth/v1/callback`
        (the live project's ref; copy it from Supabase → Project Settings → General if it differs)
   3. Supabase → Authentication → Providers → Google: switch on, paste the client ID and client secret, save.
   4. Supabase → Authentication → URL configuration: make sure `https://www.ezvisa.net/auth/callback` is on the
      redirect allow list (step 1), or Google sign-ins land on the Site URL instead of the dashboard.
   No website deploy is needed: the button is already there and reads the project's settings.
3. **Providers → Apple** (Kirolos; required before the button can complete a sign-in, and required by Apple once
   Google sign-in ships on iOS). Do this in the Apple Developer account first, then in Supabase. Nothing in the
   website deploy turns the provider on.

   **Apple Developer account**
   1. Identifiers → App ID for the iOS app (`net.ezvisa.app`): enable the Sign in with Apple capability.
   2. Identifiers → Services ID (a separate identifier, used by the website): enable Sign in with Apple, configure
      it, and set the return URL to the Supabase callback
      `https://dravvaykssrbktztmrlj.supabase.co/auth/v1/callback`
      (Authentication → Providers → Apple shows this same URL). Domains on the Services ID:
      `ezvisa.net`, `www.ezvisa.net`, and `dravvaykssrbktztmrlj.supabase.co`.
   3. Keys → create a key, enable Sign in with Apple, and download the key file (`.p8`). It can be downloaded
      once. Keep the Key ID. The Team ID is on the membership page (and in the top right of the developer account).
   4. Generate the client-secret JWT from that `.p8` (Services ID, Team ID, Key ID). Supabase takes this JWT,
      not the raw `.p8`. It expires every 6 months. When it expires, Apple sign-in stops until a new JWT is
      generated from the same key, Key ID and Team ID.
   5. Sign in with Apple for Email Communication (Private Email Relay): register the domain that sends mail to
      customers (`ezvisa.net`, and the Resend sending domain if it differs). Add the SPF and DKIM records Apple
      shows. Without this, mail to a Hide My Email address (`@privaterelay.appleid.com`) bounces. Hide My Email
      creates a separate account. Linking it to an existing email account from settings comes later.
   6. Do not register Vercel preview domains with Apple. Add the preview `/auth/callback` URLs on Supabase's
      redirect allow list instead. That list accepts wildcards. Apple's Services ID does not, and previews are
      not registered there.

   **Supabase → Authentication → Providers → Apple**
   - Turn the provider on.
   - Services ID (client id), Team ID, Key ID, and the client-secret JWT generated from the `.p8` (not the raw key file).
   - Also list the iOS bundle id `net.ezvisa.app` under client IDs so the app's native Apple button can share
     the same accounts. For Expo Go testing, add `host.exp.Exponent` as well.
   - Redirect URLs (Authentication → URL configuration, the same list as step 1): `https://www.ezvisa.net/auth/callback`,
     `https://ezvisa.net/auth/callback`, `http://localhost:3000/auth/callback`, and the preview `/auth/callback`
     hosts (a wildcard is accepted here). The button always returns through `/auth/callback`. A missing allow-list
     entry sends the person to the Site URL instead of the dashboard.
4. **Email**: the default Supabase SMTP is rate-limited (a handful of emails per hour). Configure custom SMTP
   (Resend is already used for transactional mail) so sign-up confirmations and magic links are delivered.
5. **Email templates**: keep `{{ .ConfirmationURL }}` (PKCE `?code=`), or use `{{ .TokenHash }}` with
   `?token_hash=…&type=…`; `/auth/callback` handles both.

## Vercel

The production project (`e-zvisa-anitgravity`) defines both `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_ezvisaSUPABASE_URL` / `NEXT_PUBLIC_ezvisaSUPABASE_ANON_KEY`.
`lib/supabase/client.ts` and `server.ts` read either name, so the browser bundle always has real values. Both pairs
must point at the live project (`ezvisa-uae`, ref `dravvaykssrbktztmrlj`), the same one the app uses.

## Checking it works

1. `/signup` with a fresh email → confirmation email → link opens `/auth/callback` → lands on `/dashboard`.
2. `/login` → "Email me a link" → link signs in.
3. `/forgot-password` → link opens `/reset-password` with the email shown → new password saved → `/dashboard`.
4. Open a confirmation link in a different browser → `/login` shows "Email confirmed. Sign in with your email and
   password." (PKCE code verifier lives in the browser that asked).
5. With Google enabled: "Continue with Google" → Google → `/dashboard`; the same Google email signs in to the app.
