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
| Google, Apple | `/login`, `/signup` | buttons appear automatically once the provider is enabled in Supabase |
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
2. **Providers → Google**: create a *Web application* OAuth client in Google Cloud with the authorised redirect
   URI `https://<project-ref>.supabase.co/auth/v1/callback`, then paste the client id and secret into Supabase and
   switch the provider on. The buttons on `/login`, `/signup` and in the app appear on their own (they read
   `/auth/v1/settings`); no deploy needed.
3. **Providers → Apple** (optional, required by Apple once Google sign-in ships on iOS): Services ID + key from the
   Apple Developer account, return URL `https://<project-ref>.supabase.co/auth/v1/callback`; add the app's bundle
   ids to the client ids list.
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
