# Customer dashboard redesign — 30 October 2026

Implements the "EZvisa dashboard redesign" canvas (13 artboards) in five phases on branch `claude/trusting-bell-9yvqmh`. Not pushed to `main`; nothing here is deployed until the owner asks.

| Phase | Commit | What changed |
| --- | --- | --- |
| 1. Dashboard shell | `a7db89b` | Main, Ready, Payment and Empty: switcher, case card with one next step, documents, insurance row, progress, case details, support, empty-state starter. |
| 2. Upload desk | `a34e0b0` | Shared upload desk for `/dashboard/upload` and `/track/[token]/upload`; per-document states and the specialist's note; `document_reviews` migration. |
| 3. Account settings | `d698733` | Profile card, section rail, ruled settings, saved travellers with passport-expiry warning, notification switches, sign-in and language. |
| 4. Review, Appointment, Family | `9b19ff2` | "What we need from you", activity log and `application_events` migration, specialist name, appointment countdown and checklist, family trips. |
| 5. Mobile and Arabic | `a661157` | Collapsible progress card, sticky action bar, compact case card, chip switcher scrolls to the open case, accessibility fixes, these screenshots, DESIGN.md section 4. |

## Screenshots

Every state at 1280px and 390px, English and Arabic, captured from a local production build with the demo accounts. Files are named `<state>-<width>-<lang>.jpg`. The mobile action bar is pinned to the end of the page in the 390px captures; on a phone it stays fixed to the bottom of the screen.

| State (artboard) | How to reach it |
| --- | --- |
| `main` (Main) | Demo `multi`, `/dashboard` |
| `ready` (Ready) | Demo `multi`, `/dashboard?id=demo-app-multi-1` |
| `payment` (Payment) | Demo `multi`, `/dashboard?id=demo-app-multi-3` |
| `empty` (Empty) | `/dashboard?demo=empty` (preview and local builds only) |
| `upload` (Upload) | `/track/ez-demo-pending-es2026/upload` |
| `account` (Account) | Demo `multi`, `/account` |
| `review` (Review) | Demo `pending`, `/dashboard` |
| `appointment` (Appointment) | Demo `ready`, `/dashboard` |
| `family` (Family) | Demo `multi`, `/dashboard?id=demo-app-multi-4` |
| Mobile, MobileReady, MobileAppointment, Arabic | The `-390-` and `-ar` files of the states above |

Demo login: `/api/auth/demo-login?scenario=ready|pending|multi&next=/dashboard`.

## Checks

- `pnpm lint` (TypeScript) and `pnpm build` pass after each phase; `pnpm test` passes (50 + 55); `node scripts/check-app-sync.mts --ref origin/mobile-app` passes 284/284.
- Lighthouse 12 accessibility on the local build with a demo session: `/dashboard` 100 (mobile, desktop and Arabic), `/account` 100 (mobile in English, desktop in Arabic).
- `/track/[token]` still renders for a case without an account (demo token, HTTP 200).
- Insurance preference, payment status and document flags still come from the existing helpers and API routes.

## Owner actions before this is complete

1. **Apply two migrations in Supabase** after review (SQL editor). Both are additive, with read-only RLS for the case owner and no customer writes:
   - `supabase/migrations/003_document_reviews.sql`: per-document review results (approved, being checked, needs a new file + note).
   - `supabase/migrations/004_application_events.sql`: the activity log. The payment status writer, uploads, file download, appointment and insurance saves and staff status changes already record events; until the table exists those writes are skipped and the activity card is rebuilt from the application row.
2. **Give the team a way to write reviews and assign a specialist**: rows in `document_reviews`, and `specialist_assigned` events (or `additional_notes.specialist`). There is no staff UI for this yet.
3. Test with a real account: saving notification switches, the appointment checklist, and uploading after a "needs a new file" review.

## Limits and decisions to know

- Notification switches are stored on the profile (`user_metadata.notifications`); nothing reads them yet to decide whether to send WhatsApp, push or tips. No WhatsApp reminder is promised in the copy.
- Appointment checklist ticks are kept in the browser (per device); the file download and the saved appointment tick themselves from the case.
- "Open in Maps" from the Appointment artboard is not shown: the visa-centre component deliberately renders no map or directions links.
- Family trips are matched on email, destination and both travel dates (exact calendar days from the wizard). No `trip_id` column was needed. A trip opens the traveller who needs attention first; there is no separate trip page.
- The Crisp chat bubble is hidden while the mobile action bar is on screen (the bar carries WhatsApp); the chat plugin is hidden site-wide for now anyway.
- Demo references collide (`EZ-DEMOAPP…`) because demo ids share a prefix; real UUIDs do not.
