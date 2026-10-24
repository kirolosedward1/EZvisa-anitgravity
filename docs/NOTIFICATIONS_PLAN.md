# Notifications: plan (service + marketing)

> Covers every message EZvisa sends a customer or staff member: account, payment, case progress, reminders, staff
> alerts and marketing, across email, app push, an in-app inbox and (later) WhatsApp.
> Status: PLAN, 2026-10-24. Nothing here is built yet. Section 10 lists the owner decisions it waits on.

---

## 1. What exists today (findings, 2026-10-24)

| Piece | Where | What it does | Gap |
|---|---|---|---|
| Email service | `lib/email/service.ts`, templates `lib/email/templates/index.ts` (EN + AR) | Resend; logs to `email_logs`; dedupes on `(event_type, entity_id)` | Only 5 templates. The dedupe key allows **one email per event per case ever**, so a second document rejection or a second reminder can never send. No `List-Unsubscribe`, no bounce handling. |
| `email_logs` table | `supabase/migrations/001_email_logs.sql` | Log + idempotency | **Not on the live project** (checked 2026-10-24: public tables are `blog_posts`, `visa_applications`, `wizard_events`, `device_tokens`, `travellers`). So today every dedupe check silently passes and no email is logged: a payment confirmation can go out twice if the webhook and polling race on the same transition, and there is no record of what was sent. |
| `application.submitted` | `app/api/submit-application/route.ts:453` | Email on submit | Fine. |
| `payment.completed` / `payment.failed` | `lib/ziina.ts` `sendPaymentEmail` | Email on the paid/failed transition (webhook, polling or cron) | No email for `expired` or `refunded`. No receipt PDF link (`lib/receipt-pdf.ts` exists). |
| `documents.ready` / `documents.requested` | `app/api/admin/trigger-email` | Sent **only when staff call the endpoint by hand** | Status changes in the admin don't email. |
| App push | `mobile/migrations/0006_push_notifications.sql` trigger → edge function `notify-status` (`mobile/migrations/functions/notify-status/*`), tokens in `device_tokens` | Push on staff status change or a newly rejected document. Lock-screen text is deliberately generic ("There's an update on your application.") | Push only. The same trigger does not email, so a web-only customer hears nothing when status changes. |
| App local reminders | `mobile/lib/reminders.ts` | Opt-in, on-device: trip in 7 days / tomorrow, passport expiry | Device only; no web/email equivalent. |
| Contact form | `app/api/send-email` (+ legacy `lib/email-templates.tsx`) | Contact form only | Separate template system; keep but don't extend. |
| Cron | `vercel.json`: `reconcile-payments` daily 03:17 | Payment safety net | No scheduler for timed messages. |
| Marketing | `privacy-policy` says marketing emails are sent on **consent** with opt-out at any time; retention "until you unsubscribe + 2 years" | Nothing is built: no consent checkbox, no consent record, no unsubscribe, no lists. | Whole area missing. |
| Web "continue" nudge | `components/continue-application-notification.tsx` | localStorage banner on the site | Only while the customer is on the site. |

---

## 2. Principles (apply to every message)

1. **Four categories, decided per event, never per send.**

   | Category | Examples | Can the customer turn it off? | Legal basis |
   |---|---|---|---|
   | `account` | verify email, password reset, sign-in from new device | No | Contract / security |
   | `service` | payment, status changes, documents needed, file ready, refund | No (email). Push follows OS permission. | Contract |
   | `reminders` | unfinished application, unpaid checkout, appointment, trip, passport expiry, data-deletion notice | Yes, one toggle. Default **on**. | Legitimate interest, tied to an open case |
   | `marketing` | newsletters, seasonal offers, destination guides, "planning another trip?" | Yes. Default **off**: opt-in only | Consent (PDPL; GDPR where it applies) |

   Anything not about a case the person already started is `marketing`. When in doubt, it is `marketing`.
2. **Owner-confirmed facts only** (CLAUDE.md §1). 249 AED / 498 AED with spouse; 1–2 days to prepare; no approval
   promise; no approval rates, customer counts or ratings; visa refusal is not refunded. A refusal message never hints
   at a refund; a marketing message never says "guaranteed" or "99%".
3. **Documents are never requested or sent over email/WhatsApp.** Every "documents needed" message links to the
   upload page; it never asks for a reply with attachments and never attaches the customer's documents. The "file
   ready" email links to the signed-in download, it does not attach the PDF.
4. **Lock screens and previews carry nothing personal.** Keep the `notify-status` rule (no name, destination, reference
   or outcome in push text) and apply it to WhatsApp templates and email subject lines for `rejected` / `approved`
   ("There's an update on your application", details after sign-in).
5. **One event, one decision, fan-out to channels.** Code never calls Resend or Expo directly; it records an event,
   and the dispatcher decides channels from the catalogue + the person's preferences.
6. **Re-check before sending.** Any delayed message (reminders) re-reads the case at send time and drops itself if the
   condition no longer holds (paid already, documents uploaded, case cancelled).
7. **Bilingual.** Every template EN + AR, picked from `visa_applications.preferred_language` / account locale.
8. **Quiet hours.** No reminder or marketing between 21:00 and 09:00 UAE time (Asia/Dubai); they wait for 09:00.
   `account` and `service` send immediately.

---

## 3. Architecture

```
 code paths that change state                       scheduler (cron, every 15 min)
 (submit, ziina, continue, upload, admin,           finds due reminders + campaign sends
  DB trigger on visa_applications)                            │
            │ notify(event, entity, recipient, data)           │
            ▼                                                  ▼
   public.notification_outbox  ── one row per (event, entity, dedupe_key) ──►  dispatcher (lib/notifications)
                                                                                 │ category + preferences + quiet hours
                                     ┌───────────────┬───────────────┬───────────┴───────┬──────────────┐
                                     ▼               ▼               ▼                   ▼              ▼
                                  email          app push        in-app inbox       WhatsApp (ph. 3)  staff alert
                                  (Resend)   (Expo, notify-status) (notifications)  (Meta Cloud API)  (email/Slack)
                                     │
                       Resend webhooks: delivered / bounced / complained → suppressions + log
```

### 3.1 Shared catalogue (contract)

Add to `lib/shared/wizard-contract.ts` (zero imports, mirrored in `mobile/lib/wizard.ts`, checked by `pnpm sync:check`):

```ts
export const NOTIFICATION_CATEGORIES = ["account", "service", "reminders", "marketing"] as const
export const NOTIFICATION_EVENTS = {
  "payment.completed": { category: "service", channels: ["email", "push", "inbox"] },
  "documents.requested": { category: "service", channels: ["email", "push", "inbox"] },
  "reminder.continue":   { category: "reminders", channels: ["email", "push"] },
  // … every row of §4/§5
} as const
```

The app needs the event names for routing taps (`mobile/lib/notifyRoute.ts`) and for the preferences screen; the website
needs the same list for Account → Notifications. One list, both clients.

### 3.2 Server module `lib/notifications/`

| File | Role |
|---|---|
| `index.ts` | `notify({ event, entityId, recipient, data, dedupeKey?, sendAt? })`: inserts into the outbox (unique on `event, entity_id, dedupe_key`), then, for immediate events, dispatches inline with a short timeout so payment paths are never held up (same rule as today's 8 s Resend timeout). |
| `dispatch.ts` | Loads catalogue entry + preferences + suppressions, applies quiet hours, fans out, records per-channel result. |
| `channels/email.ts` | Wraps today's `EmailService` (keeps its sanitising, sandbox redirect, Resend call); adds `List-Unsubscribe` + `List-Unsubscribe-Post` headers (RFC 8058) on `reminders` and `marketing`. |
| `channels/push.ts` | Calls the existing `notify-status` edge function (extend its body with an `event` field) so token handling and generic lock-screen text stay in one place. |
| `channels/inbox.ts` | Inserts into `public.notifications` (bell in the header account menu + app). |
| `channels/whatsapp.ts` | Phase 3. Meta Cloud API, pre-approved templates only. |
| `channels/staff.ts` | Staff alerts to `EMAIL_ADMIN_ADDRESS` (and optionally a Slack webhook). |
| `reminders.ts` | Pure planner: given a case, which reminders are due (unit-testable like `mobile/lib/reminders.ts` `planReminders`). |

`EmailService.sendEvent` callers (`submit-application`, `lib/ziina.ts`, admin trigger) switch to `notify()`; the old
signature can stay as a thin wrapper during migration.

### 3.3 Status changes → one source

Today the DB trigger `visa_applications_notify` posts status changes to `notify-status` (push only). Change it to post to
a new Next route `POST /api/notifications/hook` (same Vault secret header), which calls `notify()` for the right event
(`case.reviewing`, `documents.requested`, `documents.rejected`, `file.ready`, …). That route then sends email + inbox,
and push through the edge function. Result: every status change made anywhere (admin page, SQL, app) reaches web-only
customers too. Keep the `notify-status` function as the push channel; stop calling it from the trigger directly.

### 3.4 Scheduler

`GET /api/cron/notifications` (Bearer `CRON_SECRET`, like `reconcile-payments`):
1. sends outbox rows whose `send_at <= now()` and that are still `queued` (re-checking conditions, §2.6);
2. runs `reminders.ts` over open cases and enqueues due reminders (dedupe key = reminder id, e.g. `continue-d3`);
3. sends due campaign batches (§5).

Every 15 minutes needs **Vercel Pro** (Hobby allows daily crons only). If the project is on Hobby, use Supabase
`pg_cron` + `pg_net` to call the route instead (pg_net is already enabled by migration 0006).

---

## 4. Transactional catalogue (account, service, reminders)

Timing is from the triggering event. "Push" means app users with a token; "Inbox" is the in-app/site list. `ref` =
the `EZ-XXXXXXXX` reference.

### 4.1 Account (`account`)

| Event | Trigger | Channels | Notes |
|---|---|---|---|
| `auth.verify_email`, `auth.magic_link`, `auth.password_reset` | Supabase Auth | Email | Move Supabase's default mails to Resend SMTP + branded EN/AR templates (Supabase dashboard → Auth → SMTP + Email Templates). |
| `auth.email_changed`, `auth.password_changed` | Supabase Auth | Email to old + new address | Security. |
| `auth.account_deleted` | account deletion | Email | Confirms deletion and what is kept (payment records 5 years, per privacy policy §6). |

### 4.2 Before payment

| Event | Trigger | Channels | Category | Content |
|---|---|---|---|---|
| `application.submitted` | submit (exists) | Email | service | Received; what happens after payment; pay link. |
| `reminder.unpaid` | checkout created, not paid after **2 h**, then **24 h** | Email (+ push if app) | reminders | "Your application is saved", pay link, price (249 / 498 AED), what's included. Max 2. Cancelled on pay. |
| `reminder.draft` | draft (`application_status = draft`, email known) idle **24 h**, then **3 days** | Email | reminders | "Pick up where you left off" → `/apply`. Only for signed-in drafts or where an email was entered (see §10 decision D3). Max 2, then stop forever for that draft. |
| `payment.failed` | Ziina failed (exists) | Email, push | service | Not charged; retry link; WhatsApp help. |
| `payment.expired` | Ziina expired (**new**) | Email | service | Same as failed, softer. |

### 4.3 After payment (case progress)

| Event | Trigger | Channels | Content |
|---|---|---|---|
| `payment.completed` | paid (exists) | Email, push, inbox | Payment confirmed, **receipt link** (`/receipt`), next step: continue application. |
| `staff.case_paid` | paid | Staff | New paid case, ref, destination, travel date, link to admin. |
| `reminder.continue` | paid and `missingDetailSteps()` not empty (`lib/application-status.ts`), at **4 h**, **1 day**, **3 days** | Email, push | reminders | "We need a few trip details to start" → `/continue/[id]`. Cancelled once complete. After day 3 → `staff.case_stuck`. |
| `documents.requested` | status → `awaiting_documents` (exists as manual) | Email, push, inbox | List of document *types* still missing (from `has_*` flags), link to upload. Never "reply with". |
| `reminder.documents` | still `awaiting_documents` at **2 days**, **5 days** | Email, push | reminders | Same list. After day 5 → `staff.case_stuck`. |
| `documents.rejected` | a document review set to `rejected` (trigger exists) | Email, push, inbox | Which document type and the reviewer's reason, re-upload link. Dedupe key = document key + review timestamp, so each rejection sends. |
| `documents.received` | all required types uploaded | Email, inbox | "We have everything, a specialist is checking your file". Sets expectation: 1–2 days. |
| `staff.documents_uploaded` | any upload | Staff (daily digest + instant for first upload) | |
| `case.reviewing` | → `reviewing` | Push, inbox (email optional) | Low-noise. |
| `file.ready` | → `ready` (exists as manual; keep the `final_package.pdf` check) | Email, push, inbox | File ready; download after sign-in; how to book the visa-centre appointment for that country (facts from `documents/country-facts`); embassy fee paid at appointment; travel insurance reminder (optional extra). |
| `appointment.booked` | → `appointment_booked` | Email, inbox | Date/place, what to bring (originals checklist). |
| `reminder.appointment` | **3 days** and **1 day** before appointment date | Email, push | reminders | Checklist. Needs the appointment date as a real field (today `appointment?: unknown`); see D5. |
| `case.decision_check` | ~**15 days** after appointment, if still `appointment_booked` | Email | reminders | "Did you receive your passport back?" Two buttons (visa granted / refused / still waiting) that set the status. Internal use only, **not published** (no approval rates, §1 rule). |
| `case.completed` | → `completed` | Email, inbox | Thanks; "travelling with someone else next time? your saved travellers are ready"; a marketing opt-in offer if not opted in (one line, not pre-ticked). |
| `case.refused` | → `rejected` | Email, inbox | Careful tone. Subject has no outcome. What can be done (reapply, appeal routes), WhatsApp help. Does **not** mention refunds (refusal is not refunded, `/refund-policy`). |
| `case.cancelled` | staff → `cancelled` (customer-discarded drafts excluded, as `notify-status` already does) | Email | Reason if given; refund note only if a refund applies. |
| `payment.refunded` / `partially_refunded` | Ziina refund | Email, inbox | Amount, expected bank time. |

### 4.4 Long-tail reminders (opt-out-able)

| Event | When | Channels |
|---|---|---|
| `reminder.trip` | 7 days and 1 day before `entry_date` | Email (web users); app keeps its on-device version, so skip push for app users with reminders on |
| `reminder.passport_expiry` | 9 months and 6 months before expiry of a saved traveller's passport (`public.travellers`) | Email, push. Schengen needs 3 months beyond departure; text says that, nothing more. |
| `privacy.deletion_notice` | 7 days before documents are deleted (90 days after case close, privacy policy §6) | Email (service) — "download your file before {date}". This is a promise the policy already makes; the scheduler can also run the deletion. |

### 4.5 Staff alerts (`staff.*`)

`case_paid`, `case_stuck` (no continue after 3 days / no documents after 5 days), `documents_uploaded`, `payment_mismatch`
(reconcile changed a status), `notification_failures` (outbox rows failed 3×), `email_complaint` (spam report),
`cron_failed`. Daily 09:00 digest + instant for `case_paid` and failures.

---

## 5. Marketing

### 5.1 Consent capture (build this before sending anything)

| Where | Control |
|---|---|
| `/signup` + app sign-up | Unticked checkbox: "Send me travel tips and offers from EZvisa. Unsubscribe anytime." |
| Wizard review step (`/apply`, app review) | Same unticked checkbox, below the terms consent, never combined with it. |
| Account → Notifications (web) + app Account | Toggles: Reminders, Marketing email, Marketing push, (later) WhatsApp. |
| Footer newsletter field (optional, D6) | Email + double opt-in confirmation email. |
| Completed-case email | One-line offer to opt in. |

Every change writes a row to `marketing_consents` (who, channel, granted/withdrawn, source, policy version, IP/user
agent, timestamp): the privacy policy promises proof of consent kept for 2 years after unsubscribe.

App push marketing needs its own toggle (Apple guideline 4.5.4: explicit opt-in for promotional push, with an opt-out
in the app).

### 5.2 Unsubscribe

- Every `reminders`/`marketing` email: footer link + `List-Unsubscribe` one-click header (Gmail/Yahoo bulk-sender rule).
- Link → `/account?tab=notifications` when signed in, otherwise a token page (`/email-preferences/[token]`, signed,
  no sign-in needed) with "Unsubscribe from all marketing" as the first button. Linked from the footer's legal row so
  it satisfies the "every page reachable" rule without adding it to the marketing nav (D7).
- Resend `bounced` / `complained` webhooks → `notification_suppressions`; suppressed addresses get `account`/`service`
  only for bounces (retry once), nothing marketing ever again for complaints.

### 5.3 Where lists live

Use **Resend Audiences/Topics + Broadcasts** for marketing sends (already the email provider; a Resend connector is
attached to this workspace), synced from `marketing_consents` by the dispatcher: opted-in → contact added with
properties (`language`, `nationality`, `last_destination`, `customer: yes/no`, `last_trip_date`); withdrawn → removed
immediately. HubSpot stays the CRM for leads; it is **not** a second sending tool (two senders = two unsubscribe lists
that drift). If the owner prefers HubSpot marketing email, swap the target, keep one sender (D2).

### 5.4 Programmes

| Programme | Audience | Cadence | Content |
|---|---|---|---|
| Welcome series | New marketing opt-ins, not yet customers | 3 emails: day 0, 3, 7 | How it works, what we prepare vs what you provide (`documents/document-split`), destination guide for their nationality. Stops when they pay. |
| Seasonal planning | Opted-in, by nationality | ~6 per year | Summer (book Mar–May; appointment slots fill), Eid al-Adha / Eid al-Fitr, UAE National Day long weekend, Christmas markets. Real lead-time facts only (`MIN_LEAD_DAYS` 15). |
| Destination guides | Opted-in | Monthly max | New `/news` posts, country pages. |
| Next trip | Past customers, 9–12 months after trip | 1–2 per year | "Planning another trip? Your saved travellers are ready." |
| App install | Opted-in web customers without a device token | Once | `/app` page. |
| Win-back | Drafts abandoned > 14 days after both draft reminders | Once, **only if opted in** | Not sent to non-consenting people (reminders already covered them). |
| Referral (D8) | Past customers | Once after completed | Only if the owner sets up an offer; no invented discounts. |

Rules: **max 2 marketing messages per person per month** across channels; never to someone with an open paid case in
the last 48 h of a reminder; quiet hours; EN/AR by preference; every claim checked against CLAUDE.md §1 before
scheduling (run `marketing:brand-review` on each draft).

### 5.5 WhatsApp (phase 3)

WhatsApp is the community's main channel, but marketing via WhatsApp Business Platform needs a WhatsApp opt-in of its
own, Meta-approved templates, and pays per conversation. Start with **service templates only** (file ready, documents
needed, payment confirmed: no personal details in the template body, link to the site). Marketing on WhatsApp only
after the email programmes prove themselves, with its own checkbox.

---

## 6. Data model (sketch, new `scripts/008_notifications.sql`)

```sql
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event text not null, category text not null,
  entity_id text not null, dedupe_key text not null default '',
  recipient_email text, user_id uuid references auth.users(id) on delete set null,
  language text not null default 'en', data jsonb not null default '{}',
  send_at timestamptz not null default now(),
  status text not null default 'queued',            -- queued | sent | skipped | failed
  skip_reason text, attempts int not null default 0,
  channels jsonb not null default '{}',             -- { email: { status, provider_id, error }, push: {...} }
  created_at timestamptz not null default now(), sent_at timestamptz,
  unique (event, entity_id, dedupe_key)
);
create index on public.notification_outbox (status, send_at);

create table public.notifications (                  -- in-app inbox, owner = account email (same rule as applications)
  id bigint generated always as identity primary key,
  email text not null, event text not null, application_id uuid,
  title text not null, body text not null, url text,
  read_at timestamptz, created_at timestamptz not null default now()
);

create table public.notification_preferences (       -- one row per account
  email text primary key, reminders boolean not null default true,
  marketing_email boolean not null default false, marketing_push boolean not null default false,
  marketing_whatsapp boolean not null default false, language text, updated_at timestamptz not null default now()
);

create table public.marketing_consents (             -- append-only ledger (proof of consent)
  id bigint generated always as identity primary key,
  email text not null, channel text not null, granted boolean not null,
  source text not null, policy_version text not null, ip inet, user_agent text,
  created_at timestamptz not null default now()
);

create table public.notification_suppressions (
  email text primary key, reason text not null, created_at timestamptz not null default now()
);
```

RLS: outbox, consents, suppressions = service role only. `notifications` and `notification_preferences` = owner-only
select/update (`email = lower(auth.jwt() ->> 'email')`), same pattern as `device_tokens` / `travellers`. Keep
`email_logs` for history or fold it into `notification_outbox.channels` (preferred: one log).

---

## 7. UI

| Surface | Change |
|---|---|
| Header account menu (`components/user-menu.tsx`) | Bell with unread count from `notifications`; list → links into `/dashboard` cases. |
| `/account` | "Notifications" section: Reminders, Marketing email, Marketing push (app only), WhatsApp (phase 3). |
| `/signup`, wizard review | Unticked marketing checkbox (§5.1). |
| App | Same toggles in Account; inbox tab or list; `notifyRoute.ts` learns the new `type`s. |
| Admin (`/admin`) | Per case: notification history (outbox rows) + "resend" button; global failed-sends list. |
| Emails | Shared layout (`lib/email/layout.ts`) gets a category-aware footer: service = "You're receiving this because you have an EZvisa application"; marketing = unsubscribe + address. |

---

## 8. Rollout

| Phase | Scope | Done when |
|---|---|---|
| **0. Fix the base** (½ day) | Confirm/apply `email_logs` live; add `dedupe_key`; Resend domain verified with SPF/DKIM/DMARC on `ezvisa.net`; Resend webhook for bounces/complaints. | A second `documents.rejected` for the same case sends; a bounce lands in suppressions. |
| **1. Service events** (2–3 days) | `lib/notifications` + outbox; contract catalogue + `sync:check`; DB trigger → `/api/notifications/hook`; email for every §4.3 status; `payment.expired`/`refunded`; receipt link; staff alerts. | Changing a status in admin emails a web-only customer and pushes an app user, once. |
| **2. Reminders + inbox** (3 days) | Scheduler cron; unpaid/draft/continue/documents/appointment/trip/passport/deletion reminders; quiet hours; preferences table + Account toggles; inbox + bell; admin history. | Reminder cancels itself after the customer acts; turning Reminders off stops them. |
| **3. Marketing foundation** (2 days) | Consent checkboxes, ledger, unsubscribe page + headers, Resend audience sync. | Opt-in → contact in audience in < 1 min; one-click unsubscribe removes it. |
| **4. Programmes** (ongoing) | Welcome series, seasonal calendar, next-trip, app install; frequency cap. | First broadcast sent to opted-in list only. |
| **5. WhatsApp** (when approved by Meta) | Service templates, then opt-in marketing. | |

Verification for each phase: unit tests for the planner and catalogue (like `mobile/scripts/check-push.mjs`), a
sandbox run (`NODE_ENV=development` redirects to the admin inbox, already in `EmailService`), and an end-to-end walk
of the real path on a test case: submit → pay → continue → documents → ready.

---

## 9. Metrics

Per event: sent, delivered, opened/clicked (email), tapped (push), and the action it asks for (paid within 24 h of
`reminder.unpaid`; continue finished within 24 h of `reminder.continue`; upload within 48 h of `documents.requested`).
Marketing: opt-in rate at signup/wizard, unsubscribe and complaint rate per send (stop a programme above 0.3%
complaints), revenue from campaign UTMs in GA. Internal only, never published.

---

## 10. Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| D1 | Approve the four categories, and that reminders default **on** with an opt-out? | Yes. |
| D2 | Marketing sender: Resend Broadcasts or HubSpot Marketing? | Resend (already the sender, cheaper); HubSpot stays CRM. |
| D3 | Draft reminders to people who typed an email but never signed in? | Yes, max 2, with a one-click opt-out; the email field gets a one-line notice ("We'll email you a link to continue"). |
| D4 | Vercel plan for a 15-minute cron? | Pro, else Supabase pg_cron. |
| D5 | Store the appointment date (+ place) as real columns so appointment reminders work? | Yes; staff enter it when setting `appointment_booked`. |
| D6 | Footer newsletter signup for non-customers? | Later, with double opt-in. |
| D7 | Unsubscribe token page linked from the footer legal row rather than the main nav? | Yes. |
| D8 | Any real offer for referrals/seasonal campaigns (discount, spouse price)? | Only what the owner sets; nothing invented in copy. |
| D9 | WhatsApp Business Platform account (Meta verification, per-message cost)? | Phase 5, service templates first. |
| D10 | Ask completed customers for a private review (e.g. Google)? | Optional; reviews are not shown on the site until the owner supplies verified figures. |
