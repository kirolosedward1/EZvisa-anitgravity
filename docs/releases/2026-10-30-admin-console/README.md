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
| 5a. Cases | done | Queue with tabs, search, stage/owner/destination filters, four sorts, pages of 50, saved views and column choice (this device), bulk assign and CSV export, row menu, cancel with a required audit note. `lib/staff/queue.ts`, `app/admin/cases/actions.ts`, `GET /api/admin/export/cases`. |
| 5b. New case | done | Four steps (customer, trip, traveller and work, review). Saves a Payment due row with the shared wizard contract, auto-assigns the specialist with the fewest open cases, and gives the pay link to copy or send on WhatsApp. |
| 6. Case + DocumentReview | done | Header with stage and SLA pills, owner, WhatsApp, Change stage (note required; Ready needs `final_package.pdf`), More menu; stage bar; Overview, Documents, Application details, Payments and Activity tabs; customer card, internal notes, quick actions. Shared `DocumentReview` (approve, send back with quick reasons, undo); all approved moves the case to Preparation. |
| 7. Document review + Viewer | done | Queue of uploads waiting (oldest first, Over SLA, Re-upload), file preview with zoom and rotate, checklist per document type, compare box, A/R/J/K keys. Viewer with highlight boxes listed in the send-back note; `006_document_review_highlights.sql` stores them. |
| 8. File preparation | done | Queue of files due, six parts (generate from the existing templates and edit, or upload bookings), assemble `final_package.pdf` with pdf-lib in embassy order (parts, then the customer's documents) and move to Ready. `007_file_preparation.sql` (file_parts). |
| 9. Appointments | done | Week view by day with centre filter and previous/next week, help requests with an SLA and inline "Book and save", ready files with no appointment (WhatsApp nudge, call). |
| 10. Payments + Finance desk | done | Month totals, transactions, failed payments (pay link on WhatsApp), refunds and refund requests. Refund modal with the fixed policy, reason and note; Support and specialists request from the case, Finance/Admin approve, decline or mark sent. `008_refund_requests.sql`. |
| 11. Insurance | done | Quote requests (price typed by staff, quote sent on WhatsApp, ask for dates when flexible), sent quotes (remind, accepted, declined sets "own policy", issue policy PDF). `009_insurance_quotes.sql`. |
| 12. Messaging + Support desk | done | Customers waiting on us or on them with WhatsApp quick replies (English/Arabic templates filled from the case), broadcast audience by stage, destination and language with a live count and preview, recipient list copied with a log entry, registered app devices. Support sees it as the Support desk. |
| 13. Analytics | done | Marketing (started, paid, revenue with deltas, funnel to completed, paid per day, applications by source) and Operations (paid to ready, within SLA, review time, by destination, team), 7/30/90 days. |
| 14. Reports | done | Catalogue (revenue by destination, refunds, appointments per centre, SLA and owners, document send-backs), period, preview, CSV download (Export permission, audited), export history. |
| 15. Notifications | done | Feed from my cases (uploads, past SLA, help requests, appointment tomorrow), @mentions in internal notes, money items for Finance/Admin; mark all read; per-person preferences. Bell count in the top bar. `010_staff_notifications.sql`. |
| 16. Customers | done | Customers by email with segments and search, profile with cases and saved travellers, one-time sign-in link to share, data export (JSON). |
| 17. Team | done | Members (add, change role, deactivate; ADMIN_EMAILS stay admins), permission matrix, assignment rule and SLA targets. |
| 18. Settings | done | Read-only reference: destinations and document requirements, pricing and refund policy, message templates (English and Arabic), automations (not running), visa centres, integration status (configured or not, never values). |
| 19. Audit | done | Filters, detail panel with before/after, device and request id; Undo for assignments, notes and role/access changes, logged as a Reversal. |
| 20. States | done | Empty, error (with retry), permission denied and "Some data did not load" banners across boards; demo banner. |
| 21. Mobile | done | Same routes, responsive; phone tab bar (Queue, Inbox with unread badge, Appointments, Customers). |

## Overview (step 4)

- Screenshots: `overview-1440.jpg`, `overview-390.jpg`, `overview-390-menu.jpg`, `compare-overview-1440.jpg` (board
  left, build right), `overview-support-1440.jpg` (Support role sidebar and tiles).
- SLA clocks are worked out from each case's own timestamps: first document check 24h after the upload, file 2
  business days (Mon–Fri, Dubai) after the last approval, appointment help 8h after the request.
- "Waiting on customers" does not say reminders are sent automatically: no reminder automation exists yet.
- The money tile and money alerts only show for roles that can view payments (Admin, Finance).
- "Paid this month" uses the payment time when migration 002 is applied, otherwise the application's creation time.

## Cases (step 5a)

- Screenshots: `compare-cases-1440.jpg` (board left, build right), `cases-390-top.jpg`, `cases-bulk-1440.jpg`,
  `cases-menu-1440.jpg`, `cases-cancel-1440.jpg`.
- Search covers name, email, phone (any formatting), EZ reference and destination.
- "Saved views" and "Columns" are kept in this browser only (no shared saved views yet).
- Assigning: admins assign anyone; specialists can take an unassigned case for themselves (the board's "Assign to
  me"). Each assignment is one audit row (undoable later from Audit) and tells the customer's dashboard the
  specialist's first name. An ADMIN_EMAILS admin gets a staff_users row on first sign-in so cases can be theirs.
- WhatsApp: "WhatsApp the customer" and "Send document reminder" open WhatsApp with the message written; the bulk
  reminder is shown as not connected (WhatsApp Business API).
- "Resend tracking link" became "Copy tracking link" because the email provider key is not working.
- Cancel needs the Change stage permission and a note, uses a compare-before-write check, and does not refund; that
  stays a Payments step.
- Exports need the Export permission (Admin, Finance), cells that start with = + - @ are neutralised, and each export
  is an audit row.
- The old case tools (status changes, emails, document generation) stay at `/staff/cases/legacy` until the Case board
  replaces them.

## New case, Case, Document review and Viewer (steps 5b to 7)

- Screenshots: `newcase-review-1440.jpg`, `newcase-done-1440.jpg`, `newcase-390.jpg`, `case-1440.jpg`,
  `case-docs-1440.jpg`, `case-stage-1440.jpg`, `case-390.jpg`, `documents-1440.jpg`, `documents-390.jpg`,
  `viewer-1440.jpg` (demo cases have no files, so previews show a placeholder).
- New case: customers come from existing cases (by email) or are created inline; the email is how they sign in.
  Children and other family members get their own case (grouped as a trip by email and dates), because the price is
  per person with ×2 only for a spouse on the same application. No child price, rush option, promo code or offline
  "mark paid" (decisions above). The case is logged as entered by staff with the channel (WhatsApp, phone, walk-in…).
- Document decisions write `document_reviews` (with the reviewer's name) and a customer timeline event; a send-back
  note is required and is what the customer reads. Approving with checklist items unticked is allowed and logged.
- Stage changes need a note, use compare-before-write, and only Cancelled is possible before payment. "Notify the
  customer" means their dashboard: WhatsApp and email sending are not connected.
- Highlights: boxes work on image uploads; PDFs open in the browser's viewer and the area is described in the note.
  Cropped images on the customer's dashboard are not built; the numbered list in the note is what they see.
- "Edit on behalf of the customer" and "Sign in as" are left for the Customers board.

## File preparation and Appointments (steps 8 and 9)

- Screenshots: `files-1440.jpg`, `files-390.jpg`, `appointments-1440.jpg`, `appointments-390.jpg`.
- Assembly: generated parts become simple A4 text pages (characters the standard PDF font cannot draw, such as
  Arabic, become "?"; edit the text in English), uploaded PDFs are copied page by page, JPG and PNG uploads get their
  own page. Unreadable files are listed in the message and the audit entry. The old HTML generator route is kept.
- An "Arabic version generated automatically", a "Preview PDF" before assembling, and the 48-hour download reminder
  from the board are not built (no automation runner yet).
- Saving an appointment writes the same columns as the customer's own save, marks the help request booked, moves a
  Ready case to Appointment booked and adds the customer timeline entry. The 48h and 2h WhatsApp reminders and the
  "reminder not delivered" tile are not built (WhatsApp is not connected); the fourth tile counts the next 48 hours.
- Help requests need migration 002 (still missing in production); until then the list stays empty.

## Payments, Finance desk and Insurance (steps 10 and 11)

- Screenshots: `payments-1440.jpg`, `payments-390.jpg`, `finance-desk-1440.jpg`, `insurance-1440.jpg`, `insurance-390.jpg`.
- The console does not call the payment gateway. An approved refund is issued in the payment gateway's dashboard
  (test mode stays on) and then marked sent with its reference. Settlement, payout, webhook health, card details and
  reconciliation of unmatched gateway rows are not connected, so those cards are not shown.
- Finance sees the same board titled "Finance desk", opening on refund requests.
- Insurance: no insurer or rate card is connected; the policy PDF is stored with the case but the customer's dashboard
  does not show it yet. Declining sets the customer's choice to "I'll provide my own".

## Messaging, Support desk and Analytics (steps 12 and 13)

- Screenshots: `messaging-1440.jpg`, `messaging-390.jpg`, `broadcast-1440.jpg`, `analytics-1440.jpg`,
  `analytics-operations-1440.jpg`, `analytics-390.jpg`.
- No WhatsApp inbox: incoming messages, the 24-hour window, delivery and read receipts, scheduled broadcasts and quiet
  hours all need WhatsApp Business, which is not connected. Customers who switched WhatsApp off in their application
  are left out of broadcasts and quick replies.
- Analytics: website visits, campaign names and ad cost (Google Analytics/Ads), and customer ratings are not
  connected. Time to ready uses the stage-change events, so it fills in as cases move through the console.

## Reports to Mobile (steps 14 to 21)

- Screenshots: `reports-1440.jpg`, `notifications-1440.jpg`, `customers-1440.jpg`, `team-1440.jpg`,
  `settings-1440.jpg`, `audit-1440.jpg`, `mobile-390.jpg` (demo session: no audit history, no saved travellers).
- Not built, because they need services that are not working or connected: scheduled and emailed reports, email and
  push notifications, the daily digest and quiet hours (preferences are saved for later), invitations by email,
  changing a customer's email, unlinking Google/Apple, resetting 2-step, merging accounts, deleting a customer,
  editing settings in the console (values are in code so web and app cannot drift), automations, a VAT report (EZvisa
  is not VAT-registered), offline queueing on phones, and a "session expired" draft keeper.
- The sign-in link is generated by Supabase without sending an email; it is single use and should only go to the
  customer's own WhatsApp number. Customers without an account create one by signing in on the website.

## Follow-ups (31 October)

- **Uploads** (file parts, insurance policy) go straight from the browser to storage with a one-time signed upload
  URL; the server checks the file arrived and records it. Server functions on Vercel accept only about 4.5 MB.
- **Edit on behalf of the customer** (Case board, Application details): the answers are merged into the same shared
  contract the website and app write. The email never changes here; after payment a spouse cannot be added or removed
  (it changes the fee). A reason is required and each changed field is logged before and after (passport numbers
  are shortened in the log). Screenshot `case-edit-1440.jpg`.
- **Automatic owner on payment**: a newly paid case with no owner goes to the active specialist with the fewest open
  cases, logged as an automation and undoable from Audit. Best effort: it never blocks a payment and does nothing
  until migration 005 is applied and a specialist exists.
- **Security review fixes**: the customer sign-in link refuses staff emails (a link for an admin would let the person
  using the tool sign in as that admin) and returns only to our own hosts; the customer data export and saved
  traveller lookups match the email exactly (no wildcards); the older staff API routes behind "Old case tools" now
  need the matching permission (status changes and emails: Change stage; reviews: Review documents; document
  generation: Prepare files).

## Connected console and editable settings (31 October)

Owner request: more edit buttons and links, everything connected, and control from the console.

- **Settings are editable** (admins, logged in the audit, `011_console_settings.sql`): message templates in English and
  Arabic (used by quick replies and broadcasts), SLA targets (due times and "Past SLA" on every board), automatic
  assignment on payment (on/off and a cap per specialist) and the visa centres on the appointment form and filters.
  Each can be reset to the default. Destinations, document requirements and the service fee stay read only: they are
  the shared website/app contract, so the app and the website never disagree.
- **Case page**: the name opens the customer profile, the country and stage open the filtered queue, Email / Call /
  WhatsApp / Open in inbox sit under the title, the appointment can be saved or changed in place, "Edit details" opens
  the edit form directly (`?tab=details&edit=1`), the owner links to their cases, document titles open the viewer and
  the File preparation tab opens this case's file.
- **Queue**: the whole row opens the case; the flag, stage pill and owner filter the queue; an unassigned "?" assigns
  the case to you; the row menu adds Edit application details and Customer profile.
- **Every board**: KPI tiles are links; workload, team and analytics rows open that person's or country's cases;
  names open the customer profile; emails and phones are mailto / tel / WhatsApp links; audit events filter by type and
  person and link settings and team targets; notifications open from their text; ready files without an appointment
  can be saved from Appointments; staff can be renamed on Team.

### Also on 31 October

- **Live fix:** the console showed "Cases could not be loaded" because the live table has no `travel_start_date`,
  `travel_end_date` or `paid_at`. The case read now drops a column the database reports missing and retries.
- **Permissions by role** are edited on the Team board (`012_console_permissions.sql`). Admin always has everything;
  Team and Settings stay admin only; every role keeps View cases. Granting a permission also opens its board.
- **Internal notes** can be edited, pinned, unpinned and deleted by their author or an admin (old text kept in the
  audit).
- **Customer contact details** (name, phone, nationality) are corrected once on the Customers board and saved on every
  case under that email, with a reason for the audit. The sign-in email never changes there.

### Ready for daily use (31 October, later)

- **Search everywhere:** Ctrl+K / Cmd+K / "/" or the search box opens a search over cases (name, email, phone,
  EZ reference, tracking code, country), customers and boards.
- **Actions on every board:** search, guide, Refresh, New case and the bell stay at the top right on desktop and phone.
- **Boards refresh themselves** every 2 minutes while visible (not while typing or with a dialog open).
- **Hover preview** of any case link: stage, waiting on, owner, SLA, travel, appointment, contact, fee.
- **Cases list:** bulk move to a stage (with a reason, same checks as the case page), copy phone numbers, Undo after
  assigning, keyboard J/K/Enter/X.
- **Case page:** Next case, Undo after changing the owner, Activity with payments, refunds, insurance and notes.
- **User guide** at `/staff/guide` (sidebar and book icon): getting started, common tasks, every board, what's new,
  shortcuts. `lib/staff/guide.ts`; a unit test requires a section for every sidebar board, and AGENTS.md requires
  updating it with every console change.
- **Live-data checks:** the console's reads and writes were compared with the live database (columns, check
  constraints, guard triggers); demo data now has the same shapes as live rows.

## Demo session (local and preview builds only)

`/api/auth/demo-login?scenario=staff&role=admin|specialist|support|finance` opens the console with invented cases. It
never reads or writes the database, and the staff API routes reject it (401). Production ignores it.

## Owner actions

1. ~~Apply migrations 002 and 005 to 012~~: applied 31 October 2026 at the owner's request, in number order, and checked:
   every new table has row level security on with no client policies (server only), the new columns exist, and the
   database logged no errors afterwards. 002 replaced the older `visa_applications_guard_appointment` function with
   the reviewed version (customers can edit drafts and the after-payment answers as before; appointment fields only
   once the case is paid and the file was downloaded; no edits to other columns from Preparation on). The separate
   `visa_applications_guard_customer_update` guard is unchanged.
2. Test the console with a real account at `/staff` (assign, review a document, assemble a file) before pushing to main.
