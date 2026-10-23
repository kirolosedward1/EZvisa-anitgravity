# Admin dashboard — implementation plan

> Staff console for tracking and working visa applications at `/admin`. Replaces the current secret-key page
> (`app/admin/page.tsx`) with a proper, signed-in, role-gated dashboard. The first admin is **info@topsuite.net**,
> who will sign in with **Google** (Supabase Auth, same project as customers and the app).
>
> Status: plan only. Nothing in this document is built yet. Phase 0 and Phase 1 are the MVP.

---

## 1. Goals and non-goals

**Goals**

- One place to see every application, what state it is in, and what staff need to do next.
- Work a case end to end: review answers, check uploaded documents, request missing ones, prepare the dossier,
  upload the final package, mark it ready, book the appointment, close the case.
- Every staff action is logged (who, what, when) and the customer-facing status stays consistent with what the
  website dashboard, tracking page, emails and the mobile app already show.
- Access by Google sign-in for allow-listed staff emails only. No shared secret in the browser.

**Non-goals (for now)**

- Editing the customer's wizard answers on their behalf (read-only in Phase 1; see open questions).
- Issuing refunds through Ziina from the dashboard (Phase 2 records a refund; the money moves in the Ziina dashboard).
- Anything that changes the website ↔ app contract (`lib/shared/wizard-contract.ts`). The admin reads the same
  statuses and labels; it does not add new ones.

---

## 2. What exists today (starting point)

| Piece | State | Keep / change |
|---|---|---|
| `app/admin/page.tsx` | Client page; asks for `ADMIN_API_SECRET`, stores it in `sessionStorage`, hard-coded dark slate styling (violates the token rules in CLAUDE.md §4) | **Replace** with the shell + pages below |
| `GET/PATCH /api/admin/cases` | Bearer secret; list + search; status update with optimistic-concurrency check; audit written into `email_logs` (a hack) | Keep the logic, **switch auth** to the session gate, move audit to `application_events`, drop the non-contract `preparation` status |
| `POST /api/admin/trigger-email` | Sends one of the 5 Resend templates; `documents.ready` also checks `final_package.pdf` exists and sets status `ready` | Keep; call it from the new status workflow |
| `POST /api/admin/generate-documents` | Renders cover letter / itinerary / checklist / dossier HTML into `visa_documents/<id>/` | Keep; surface in the Documents tab |
| `visa_applications` table | All customer data; `additional_notes` is a JSON blob written by website **and** app (`ApplicationNotes`) | Read everything; **never store staff-only data in `additional_notes`** (both clients rewrite it) |
| `email_logs` | Idempotent send log, unique `(event_type, entity_id)` | Read in the Timeline; see §7 for the idempotency caveat |
| `visa_documents` bucket | Private; path `<applicationId>/<type>_<uploadId>.<ext>`; staff file `final_package.pdf`; generated `v1_<ts>_*.html` | Signed URLs only, from the server |
| Auth | Supabase Auth; `/login` and `/signup` offer Google (`components/auth/social-buttons.tsx`); `/auth/callback` honours `?next=` | Reuse unchanged; admin lands via `/login?next=/admin` |
| Status vocabulary | `APPLICATION_STATUSES`, `STATUS_LABEL`, `FILE_READY_STATUSES` … in the contract; customer mapping in `lib/application-status.ts` | Single source of truth for the admin too |
| Middleware | Refreshes Supabase cookies on `/dashboard`, `/account`, `/continue`, `/trip`, `/receipt` | **Add `/admin`** |
| Header / footer | Task, account and marketing modes; `robots.ts` already disallows `/admin/` | Admin gets its own shell (no `SiteHeader`); add an "Admin console" entry to `user-menu.tsx` for admins only |

---

## 3. Access model

### 3.1 Who is an admin

A row in a new table `admin_users` (email lower-cased, `role`, `active`). Seeded with `info@topsuite.net` as
`owner`. An env fallback `ADMIN_EMAILS` (comma-separated) is honoured too, so the first login works even before
the migration has run, and so a locked-out owner can be restored from Vercel.

Roles (two are enough for now):

| Role | Can |
|---|---|
| `owner` | Everything, plus manage `admin_users` and settings |
| `agent` | Work cases (all case pages and actions), no team/settings |

### 3.2 How sign-in works

1. Admin opens `/admin` → not signed in → `redirect("/login?next=/admin")`.
2. On `/login` they click **Continue with Google** and sign in as `info@topsuite.net` (a Google Workspace
   account works exactly like a Gmail one for Google OAuth). `/auth/callback` already redirects to `?next=`.
3. `/admin/layout.tsx` (server) calls `requireAdmin()`:
   - `supabase.auth.getUser()` via `lib/supabase/server.ts` (validates the JWT with Supabase, not just the cookie)
   - lower-case `user.email`, look it up in `admin_users` (`active = true`) or in `ADMIN_EMAILS`
   - signed in but not an admin → render a 403 page ("This account has no staff access") with sign-out
   - admin → render the shell
4. Every `/api/admin/*` route and every admin Server Action calls the same `requireAdmin()`; the API routes also
   accept `Authorization: Bearer <ADMIN_API_SECRET>` so scripts and the cron can keep using them.

Supabase settings the owner must check (`docs/AUTH_SETUP.md` §2 already covers Google):

- Google provider enabled; `https://www.ezvisa.net/auth/callback` on the redirect allow list.
- **Confirm email** stays on for email/password sign-ups, so nobody can register `info@topsuite.net` with a
  password and take the seat: without the inbox the account is never confirmed, and Supabase links the verified
  Google identity to the same email on the first Google sign-in.

### 3.3 Where the data access happens

All reads and writes in the admin use the **service-role client** (`serviceClient()` in `lib/applications.ts`),
server-side only, **after** `requireAdmin()` passed. RLS on `visa_applications` stays as tightened in
`scripts/006_tighten_visa_applications_rls.sql` (customers read their own rows only). New admin tables get RLS
enabled with **no policies**, so only the service role can touch them.

New helper module:

```
lib/admin/auth.ts         requireAdmin(), getAdmin(), isAdminEmail(), AdminUser type
lib/admin/applications.ts listApplications(filters), getApplication(id), countsForOverview(), customersByEmail()
lib/admin/workflow.ts     allowed status transitions, side effects (email event per transition)
lib/admin/events.ts       logEvent(applicationId, type, actor, payload)
lib/admin/documents.ts    listFiles(id), signedUrl(path), uploadStaffFile(id, name, file), reviewDocument(...)
lib/actions/admin.ts      Server Actions used by the UI (each starts with requireAdmin())
```

---

## 4. Data model changes — `scripts/007_admin_dashboard.sql`

```sql
-- Staff allow list
create table if not exists public.admin_users (
  email        text primary key,                       -- stored lower-case
  role         text not null default 'agent' check (role in ('owner','agent')),
  display_name text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   text
);
alter table public.admin_users enable row level security;   -- no policies: service role only
insert into public.admin_users (email, role, display_name, created_by)
values ('info@topsuite.net', 'owner', 'EZvisa admin', 'migration')
on conflict (email) do nothing;

-- Staff-side case fields (never in additional_notes, which both clients rewrite)
alter table public.visa_applications
  add column if not exists assigned_to            text,                      -- admin_users.email
  add column if not exists priority               text not null default 'normal'
                                                  check (priority in ('low','normal','high','urgent')),
  add column if not exists staff_summary          text,                      -- one-line internal summary shown in the list
  add column if not exists appointment_at         timestamptz,
  add column if not exists appointment_centre     text,
  add column if not exists appointment_address    text,
  add column if not exists appointment_reference  text,
  add column if not exists ready_at               timestamptz,
  add column if not exists completed_at           timestamptz,
  add column if not exists outcome                text check (outcome in ('approved','refused','withdrawn')),
  add column if not exists outcome_at             timestamptz;
create index if not exists idx_visa_applications_assigned on public.visa_applications(assigned_to);
create index if not exists idx_visa_applications_entry    on public.visa_applications(entry_date);

-- Audit trail + internal notes (one table, typed rows)
create table if not exists public.application_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.visa_applications(id) on delete cascade,
  type           text not null,   -- status_changed | note | document_reviewed | document_requested | email_sent
                                  -- | file_uploaded | assigned | priority_changed | payment_updated | appointment_set
                                  -- | outcome_set | customer_edit (reserved)
  actor_email    text not null,   -- admin email, or 'system' / 'customer'
  note           text,            -- free text for type = note, or the reason for a rejection
  payload        jsonb,           -- { from, to } for status, { path, status, reason } for documents, …
  created_at     timestamptz not null default now()
);
create index if not exists idx_application_events_app  on public.application_events(application_id, created_at desc);
create index if not exists idx_application_events_type on public.application_events(type);
alter table public.application_events enable row level security;

-- Per-file review state (uploads live in storage + additional_notes.uploads; the verdict lives here)
create table if not exists public.document_reviews (
  application_id uuid not null references public.visa_applications(id) on delete cascade,
  path           text not null,   -- storage object path in visa_documents
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason         text,
  reviewed_by    text,
  reviewed_at    timestamptz,
  primary key (application_id, path)
);
alter table public.document_reviews enable row level security;
```

Notes:

- `appointment_*` columns already exist in `lib/types/visa-application.ts` but not in any migration; this adds them
  `IF NOT EXISTS`. The app's `additional_notes.appointment` stays untouched; the admin writes the columns.
- The existing `email_logs` "audit" rows written by `/api/admin/cases` are replaced by `application_events`
  (`type = status_changed`). Leave the old rows alone.
- Add the new columns to `VisaApplication` in `lib/types/visa-application.ts`; they are optional and the app
  ignores unknown columns. Run `pnpm sync:check` after: nothing in the contract changes, so it must still pass.

---

## 5. Case workflow (what "working an application" means)

Statuses are the contract's `APPLICATION_STATUSES`; labels are `STATUS_LABEL`. Staff can move a case along these
edges (`lib/admin/workflow.ts`); anything else is refused server-side:

```
draft ──────────────► cancelled                        (unpaid, abandoned)
submitted ──────────► reviewing | cancelled | rejected
reviewing ──────────► awaiting_documents | approved | cancelled | rejected
awaiting_documents ─► reviewing | cancelled | rejected
approved (dossier being prepared) ─► ready | reviewing
ready ──────────────► appointment_booked | completed | reviewing
appointment_booked ─► completed | ready
completed / rejected / cancelled ─► (terminal; owner may reopen to reviewing)
```

Side effects per transition (all through the existing `EmailService` and templates; nothing is sent without a
template):

| Transition | Email event | Other |
|---|---|---|
| → `awaiting_documents` | `documents.requested` | Event `document_requested` with the list of missing items |
| → `ready` | `documents.ready` (only if `<id>/final_package.pdf` exists, as today) | sets `ready_at` |
| → `appointment_booked` | **new template** `appointment.booked` (date, centre, address, reference) — Phase 2 | sets `appointment_*` |
| → `completed` | **new template** `application.completed` — Phase 2 | sets `completed_at`, asks for `outcome` |
| → `rejected` / `cancelled` | none automatic (staff decide; a note is required) | |

Customer-facing effect of each status is already defined in `lib/application-status.ts` (`getStatusDisplay`) and
mirrored in the app, so no customer page changes are needed for Phase 1.

What the dashboard must show staff to make these decisions:

- **Answers**: everything in `additional_notes.wizard` (`WizardAnswers`), grouped as the wizard groups them
  (destination & residence, contact, passport, marital & spouse, employment & income, trip, funding, history).
  Labels come from the contract's option lists (`label(MARITAL, v)` etc.). Passport number is masked in the list
  view and shown in full only on the case page.
- **After-payment completeness**: `missingDetailSteps(app)` (trip / passport / spouse / employment) and
  `requiredFlags(employmentStatus)` for documents, so staff see exactly what the customer still owes.
- **Documents**: the row's `has_*` flags, `additional_notes.uploads[]` (type, path, name, at), the storage listing
  (catches files not recorded in notes), per-file review state, and generated/staff files.
- **Payment**: `payment_status`, `payment_amount`, `payment_id` (Ziina intent), `paid_at`, with a
  "Refresh from Ziina" action that reuses `fetchIntent` + `applyIntentStatus` from `lib/ziina.ts`.
- **Timeline**: `application_events` ∪ `email_logs where entity_id = id`, newest first.
- **Urgency**: days until `entry_date`; the contract's `MIN_LEAD_DAYS` (15) is the embassy buffer, so a paid case
  with `entry_date` < 15 days away that is not `ready` is flagged.

---

## 6. Pages and navigation

Route group `app/admin/**`. The layout renders its own shell (sidebar + top bar), not `SiteHeader`/`Footer`.

| Route | Purpose | Phase |
|---|---|---|
| `/admin` | **Overview**: KPI tiles + work queues (see below) | 1 |
| `/admin/applications` | **All applications**: filterable, searchable, paginated table | 1 |
| `/admin/applications/[id]` | **Case page**: header + tabs Overview · Documents · Payment · Timeline & notes | 1 |
| `/admin/customers` | One row per email: cases, total paid, last activity; links to the cases | 2 |
| `/admin/payments` | Paid / pending / failed / refunded; reconcile button (same logic as the cron) | 2 |
| `/admin/emails` | `email_logs` browser with filters and a "resend" action | 2 |
| `/admin/settings` | Team (`admin_users` CRUD, owner only), integration health (Supabase, Resend, Ziina env present), contract version | 2 |
| `/admin/forbidden` | Signed in, not an admin (also used by the layout) | 1 |

**Overview tiles** (each tile is a link to the list pre-filtered): New (submitted, paid, unassigned) · In review ·
Waiting on customer (documents / details missing) · Ready to prepare (`approved`) · Travelling within 15 days and
not ready · Unpaid for 24h+ (nudge) · Paid this week (count and AED total). Below the tiles: the "Needs action"
queue sorted by `entry_date` ascending.

**List filters**: status (multi), payment status, destination, nationality, source (`additional_notes.source`:
website / mobile-app), assigned to, priority, created range, travel range. Search box matches name, email, phone,
reference (`EZ-XXXXXXXX` → first 8 hex of the id), passport number, Ziina intent id. Sort by created, updated,
travel date. 50 per page, server-side (`range()`), total count via `{ count: "exact" }`. Saved views are
URL-only (query string), so they can be bookmarked and shared.

**Case page header**: name, reference, round flag + destination (`CountryFlag`), nationality, travel dates and
"in N days", status pill (same tones as `components/dashboard/status-badge.tsx`), payment pill, assignee picker,
priority picker, and the action bar: *Move to …* (only allowed transitions), *Request documents*, *Add note*,
*Open customer view* (`/track/<token>` in a new tab), *WhatsApp* (`wa.me` with a prefilled message that includes
the reference, via `lib/whatsapp.ts`), *Email* (`mailto:`).

**Documents tab**: checklist from `requirementsFor(employmentStatus)` with each requirement's uploads underneath;
per file: preview (signed URL, 10 minutes, opened from `GET /api/admin/documents?id=&path=`), approve, reject with
reason (writes `document_reviews`, logs an event, and offers to send `documents.requested`). Staff uploads section:
drop zone for `final_package.pdf` and any other staff file (`<id>/staff_<name>`), plus *Generate dossier drafts*
(existing route) with links to the generated HTML versions.

**Timeline & notes tab**: unified feed; a note composer at the top (internal only, never shown to customers).

**Navigation rules**

- `/admin` is intentionally **not** in the public header nav (CLAUDE.md §6 rule 2 is for customer pages). The link
  lives in `components/user-menu.tsx`, shown only when `GET /api/admin/me` says the viewer is an admin.
- Sidebar: Overview · Applications · Customers · Payments · Emails · Settings; collapses to a sheet on mobile
  (`components/ui/sidebar.tsx` + `sheet.tsx`). Top bar: global search (`command.tsx`, opens with ⌘K), "View site",
  admin chip with sign-out.
- `app/admin/layout.tsx` exports `metadata.robots = { index: false, follow: false }`.

---

## 7. Server actions and API routes

Mutations are **Server Actions** in `lib/actions/admin.ts` (Next 16 checks the Origin header, so no extra CSRF token
is needed). Route Handlers remain only where a URL is needed (file download, upload, export) or for script access.

| Action / route | Does | Writes |
|---|---|---|
| `changeStatus(id, to, { note, expectedUpdatedAt })` | validates transition, atomic update guarded by `updated_at` (keeps today's 409 behaviour), runs side effects | `visa_applications`, `application_events`, email |
| `addNote(id, text)` | internal note | `application_events` |
| `assign(id, email)` / `setPriority(id, p)` | | `visa_applications`, event |
| `reviewDocument(id, path, status, reason)` | | `document_reviews`, event |
| `requestDocuments(id, items[])` | sends `documents.requested`, moves to `awaiting_documents` if in review | event, email |
| `setAppointment(id, {...})` | Phase 2 | columns, event, email |
| `refreshPayment(id)` | `fetchIntent(payment_id)` → `applyIntentStatus` | `visa_applications`, event |
| `markRefunded(id, { amount, reference, note })` | Phase 2; records only | `payment_status = refunded`, event |
| `GET /api/admin/me` | `{ admin: true, role }` or 401/403; used by the user menu | — |
| `GET /api/admin/documents?id=&path=` | admin check → signed URL → 302 | — |
| `POST /api/admin/applications/[id]/files` | multipart upload to `visa_documents/<id>/…`; `final_package.pdf` keeps its exact name so `download-document` and `trigger-email` find it | storage, event |
| `GET /api/admin/applications/export?…filters` | CSV of the current list (no passport numbers) | — |
| existing `cases`, `trigger-email`, `generate-documents` | auth swapped to `requireAdmin()` **or** bearer secret; audit → `application_events` | |

**Email idempotency caveat**: `email_logs` has a unique `(event_type, entity_id)` index and `EmailService.sendEvent`
returns early when a row with `status = sent` exists. So `documents.requested` can be sent **once per case** today.
For repeat requests the admin passes `entityId = \`${id}:${eventRowId}\`` (same trick the current audit code uses)
and the Timeline joins on the prefix. Do this inside `lib/admin/workflow.ts` so no template changes are needed.

**Rate limiting**: admin routes are behind auth; apply `RATE_LIMITS.standard` on the upload and export routes only.

---

## 8. UI and design system

Follow CLAUDE.md §4 exactly; the current admin page does not and gets replaced.

- Semantic tokens only (`bg-background`, `bg-secondary/40` page wash as on `/dashboard`, `text-muted-foreground`,
  `border-border`). No slate/zinc literals, no dark theme.
- Dense data UI from `components/ui`: `table`, `badge`, `tabs`, `select`, `command`, `sheet`, `dialog`,
  `alert-dialog` (confirm cancel/reject), `textarea`, `skeleton`, `pagination`, `tooltip`, `sonner` toasts.
- Status pills: reuse `components/dashboard/status-badge.tsx` tones; labels from `STATUS_LABEL`.
- Flags: `components/country-flag.tsx` only (round).
- Icons: Lucide. Headings `font-semibold tracking-tight`. Pill chips for section labels.
- Mobile: the sidebar becomes a sheet; the applications table renders as a card list below `md`; the case page tabs
  scroll horizontally. Verify 375 / 768 / 1280 as per CLAUDE.md §9.
- Loading: `loading.tsx` in `app/admin`, `app/admin/applications`, `app/admin/applications/[id]` with skeleton
  tables (`components/dashboard/dashboard-skeleton.tsx` is a good base). Error: `app/admin/error.tsx`.

---

## 9. Phased delivery

### Phase 0 — access and foundations (½ day)

1. `scripts/007_admin_dashboard.sql` (above); owner runs it on the live project (`ezvisa-uae`).
2. `lib/admin/auth.ts` with `requireAdmin()`; `ADMIN_EMAILS` fallback; `GET /api/admin/me`.
3. Add `/admin` to `SESSION_PATHS` and the matcher in `middleware.ts`.
4. `app/admin/layout.tsx` (server gate + shell) and `/admin/forbidden`.
5. "Admin console" item in `components/user-menu.tsx` (admins only).
6. Swap auth in the three existing `/api/admin/*` routes to `requireAdmin() || bearer secret`; drop `preparation`.
7. `lib/admin/events.ts`; existing status PATCH logs to `application_events`.

Done when: info@topsuite.net signs in with Google, lands on `/admin`, sees the shell; any other account sees the 403.

### Phase 1 — work the cases (2–3 days)

1. `lib/admin/applications.ts` queries + `lib/admin/workflow.ts` transitions.
2. `/admin` overview tiles and the Needs-action queue.
3. `/admin/applications` table with filters, search, pagination, CSV export.
4. `/admin/applications/[id]`: header + action bar; Overview tab (grouped answers, completeness); Documents tab
   (checklist, signed previews, approve/reject, staff upload incl. `final_package.pdf`, generate drafts);
   Payment tab (refresh from Ziina); Timeline & notes.
5. Server Actions: `changeStatus`, `addNote`, `assign`, `setPriority`, `reviewDocument`, `requestDocuments`,
   `refreshPayment`.
6. Delete the old `app/admin/page.tsx` UI (the route now renders the overview).

Done when: a real paid case can be moved submitted → reviewing → awaiting_documents → reviewing → approved →
ready (with the email going out and `/track/<token>` showing "File ready"), every step visible in the Timeline.

### Phase 2 — the rest of the console (2–3 days)

1. `/admin/customers`, `/admin/payments` (+ reconcile), `/admin/emails` (+ resend).
2. Appointment booking (`setAppointment`) + `appointment.booked` template; `completed` + `application.completed`
   template + outcome; `markRefunded`.
3. `/admin/settings`: team management (owner), integration health, contract version.
4. Saved-view shortcuts in the sidebar (Needs action, Urgent travel, Unpaid).

### Phase 3 — proactive tooling (later)

- Daily digest email to staff (new cases, urgent travel, stale "awaiting documents") via a Vercel cron
  (`vercel.json` already has one cron).
- Supabase Realtime subscription on `visa_applications` so the queue updates live.
- Analytics page with `recharts` (already a dependency): cases per week, paid conversion, time-to-ready, by
  destination and nationality, approval rate (needs `outcome`).
- Customer-answer editing with a `customer_edit` event and a customer notification (decide first; see §12).

---

## 10. Environment and configuration

| Variable | Status | Used for |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) | exists | all admin reads/writes |
| `NEXT_PUBLIC_*SUPABASE_URL` / `*ANON_KEY` | exists | session check in `requireAdmin()` |
| `ADMIN_EMAILS` | **new**, optional | fallback allow list, e.g. `info@topsuite.net` |
| `ADMIN_API_SECRET` | exists | scripts / cron access to `/api/admin/*` only; no longer typed into a browser |
| `RESEND_API_KEY`, `EMAIL_*` | exists | transition emails |
| `ZIINA_API_KEY` | exists | payment refresh |
| `CRON_SECRET` | exists | unchanged |

Supabase dashboard (owner): run migration 007; confirm Google provider + redirect URL (AUTH_SETUP §2); keep
email confirmation on.

---

## 11. Security checklist

- [ ] `requireAdmin()` on the layout, on **every** admin route handler and Server Action (grep before merging).
- [ ] Service-role client never imported into a client component; admin pages are Server Components, mutations are
      Server Actions.
- [ ] Storage access only through signed URLs (≤ 10 min) minted server-side; no public bucket.
- [ ] Passport numbers masked in lists and exports; full value only on the case page.
- [ ] Every mutation writes an `application_events` row with `actor_email`.
- [ ] Status transitions validated server-side against `lib/admin/workflow.ts`; `ready` still requires
      `final_package.pdf`.
- [ ] Optimistic concurrency kept (`expected_updated_at` → 409) so two staff don't overwrite each other.
- [ ] Logging via `lib/logger.ts` without PII (ids and codes only).
- [ ] `robots.ts` already disallows `/admin/`; layout metadata adds `noindex`.
- [ ] `pnpm sync:check` still passes (contract untouched); `pnpm lint` (tsc) and `pnpm build` clean.

---

## 12. Open questions for the owner

1. **Team**: will there be agents besides info@topsuite.net soon? (Determines whether Settings → Team ships in
   Phase 2 or can wait.)
2. **Emails per step**: should customers get an email when a case moves to *In review* and *Appointment booked*,
   and when it is *Completed*? Today only *documents requested* and *file ready* exist. (Drives the two new templates.)
3. **Editing answers**: should staff be able to correct a customer's wizard answers (typos in names, dates)? If yes,
   edits must be logged and the customer told; the app reads the same row.
4. **Refunds**: record-only in the dashboard (money moves in Ziina), or do you want a Ziina refund API call? The
   money-back guarantee makes this a frequent task.
5. **Appointment data**: is the appointment booked by EZvisa or by the customer? If by the customer, the fields
   become something they fill on `/track`, not an admin action.
6. **Outcome tracking**: do you want to record the embassy decision (approved / refused) per case for the 98%
   approval figure and for the guarantee? (Adds the `outcome` fields; they are in the migration but optional.)

---

_Last updated: 2026-10-23 — initial plan._
