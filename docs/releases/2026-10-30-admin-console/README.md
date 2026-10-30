# Staff console build — from 30 October 2026

Builds the "EZvisa admin console" canvas (25 boards) board by board on branch `claude/trusting-bell-9yvqmh`, in the
agreed order. The console stays at `https://www.ezvisa.net/staff` (hidden: a normal missing page for anyone who is not
staff; `/admin` and the `/ar` versions are always missing). Nothing here reaches production until the owner asks for a
push to `main`.

## Decisions agreed before the build

- Sign-in stays as it is: normal Google or email sign-in. Staff are the emails in `ADMIN_EMAILS` (always admins;
  info@topsuite.net is the super admin) plus active rows in `staff_users`. No separate staff login page.
- No visa outcome anywhere: no "Refused by embassy", no outcome filters or refund rule. Old rows with the legacy
  `rejected` status show as Closed.
- Prices stay as the shared contract (249 AED per person, ×2 with a spouse). No child price, no rush add-on.
- Refund policy is fixed in code; the refund modal opens at the policy amount. Offline "mark paid" waits for the owner.
- `document_reviews` is extended, not rebuilt. Staff changes go to a new `audit_events` table; the customer timeline
  stays in `application_events`.
- WhatsApp Business API, insurance partner, CRM and ad-cost data are not connected: those screens use our own data and
  say "Not connected". Mobile layouts use the same routes.

## Steps

| Step | Status | What changed |
| --- | --- | --- |
| 1–4. Roles, audit helper, shell, Overview | done | `005_staff_console.sql` (staff_users, audit_events, case_assignments, case_notes; RLS on, no client policies). `lib/staff/*`: roles and permission matrix, staff session, `staffWrite` audit helper, case model with SLA clocks, demo data. Console shell with the grouped sidebar per role and the top bar. Overview board. Boards not built yet show a placeholder. |

## Overview (step 4)

- Screenshots: `overview-1440.jpg`, `overview-390.jpg`, `overview-390-menu.jpg`, `compare-overview-1440.jpg` (board
  left, build right), `overview-support-1440.jpg` (Support role sidebar and tiles).
- SLA clocks are worked out from each case's own timestamps: first document check 24h after the upload, file 2
  business days (Mon–Fri, Dubai) after the last approval, appointment help 8h after the request.
- "Waiting on customers" does not say reminders are sent automatically: no reminder automation exists yet.
- The money tile and money alerts only show for roles that can view payments (Admin, Finance).
- "Paid this month" uses the payment time when migration 002 is applied, otherwise the application's creation time.

## Demo session (local and preview builds only)

`/api/auth/demo-login?scenario=staff&role=admin|specialist|support|finance` opens the console with invented cases. It
never reads or writes the database, and the staff API routes reject it (401). Production ignores it.

## Owner actions

1. Apply `supabase/migrations/002_appointment_step.sql` (still missing in production: appointment saves, help requests
   and the download stamp depend on it).
2. Apply `supabase/migrations/005_staff_console.sql`. Until then the console works with `ADMIN_EMAILS` only, every case
   shows as unassigned and audit rows are not stored.
