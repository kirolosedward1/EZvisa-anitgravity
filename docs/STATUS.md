# EZvisa project status and handoff (31 October 2026)

The single place to pick the project up again. Read it after `CLAUDE.md`, `AGENTS.md` and `DESIGN.md`. Update it at
the end of every working session: the date, what is live, and what is open.

## 1. What is live

- **Website:** `main` is deployed by the Vercel project `e-zvisa-anitgravity` to **www.ezvisa.net** (the owner works on
  www only). The old design stays on old.ezvisa.net (deployment `dpl_B3LEF7gouDsxtm8DAjFVHqp6D15r`, branch
  `archive/pre-redesign-2026-10-29`); keep it.
- **Mobile app:** the separate `mobile-app` branch. Never merge it into `main`. The website and the app share a
  contract (`lib/shared/wizard-contract.ts`); check it with `node scripts/check-app-sync.mts --ref origin/mobile-app`.
- **Staff console:** `www.ezvisa.net/staff`, built from `app/admin`, `components/staff` and `lib/staff`.
  - Boards: Overview, Cases, Case page, Documents, Files, Appointments, Customers, Messaging (including Website
    messages), Payments, Insurance, Analytics, Reports, Notifications, Team, Settings, Audit log, and the User guide.
  - Search from anywhere (Ctrl+K or `/`); hover previews of cases; bulk actions; Undo; auto-refresh.
  - Editable settings and permissions.
  - Release notes: `docs/releases/2026-10-30-admin-console/README.md`.
- **User guide:** `/staff/guide`, from `lib/staff/guide.ts`. Every console change must update it (the section,
  `GUIDE_UPDATED`, `WHATS_NEW`); the unit tests fail if a sidebar board has no section.
- **Contact form:** messages are saved in the database (`contact_messages`) and shown under Messaging → Website
  messages, so none are lost while email is broken.
- **Privacy policy (English and Arabic):** updated 31 October 2026 for automation and AI drafting, Make, Google
  Workspace, flight and hotel search providers and contact messages. Source: `content/legal/*.md`; rebuild with
  `node scripts/build-legal-content.mjs`.

## 2. Database (Supabase project `dravvaykssrbktztmrlj`)

- **Applied:** migrations `002` and `005` to `013` (013 = `contact_messages`).
- **Not applied, needs the owner's approval in the session:**
  - `0013_claim_device_token` from the mobile branch (`mobile/migrations/0013_claim_device_token.sql`). The owner
    approved it on 22 October, but the approval prompt timed out on 31 October. Until it is applied, a phone used by
    two accounts can receive the first account's notifications.
  - `001_email_logs`. The email service uses it to avoid sending the same email twice. Apply it when email is fixed.
  - Delete the test row "Live test (delete me)" in `contact_messages`.
- **Live schema differences to remember:** `visa_applications` has no `travel_start_date`, `travel_end_date` or
  `paid_at` columns. The console's read skips missing columns (`lib/staff/data.ts`); always test reads against the
  live column list, not only the demo data.

## 3. Open items for the owner

1. **Test with a real account:** a real-account save from the console has never been exercised (the demo never
   saves). Try: assign a case and press Undo, approve a document, change a customer's phone number, switch a
   permission and save, send a contact-form message and check Website messages.
2. **Email:** the email provider key is invalid (production logs: every contact email failed). Put a working key in
   Vercel, then verify that confirmation and reset emails arrive.
3. **Payments:** still in test mode, and no real payment has completed end to end. Switch to live only on the
   owner's word, then verify the payment is recorded on the case.
4. **Support email:** the website shows `hello@ezvisa.net`; emails and the app use `support@ezvisa.net`
   (`SUPPORT_EMAIL` in the shared contract). Decide which inbox is read, then align both, using the app sync check.
5. **Live testing from Claude sessions:** the cloud environment's network blocks www.ezvisa.net. Add `www.ezvisa.net`
   and `ezvisa.net` to Allowed domains (environment → Edit → Network access) so a session can open the live site.
6. **WhatsApp Business, the insurer, Google Ads and console push:** not connected; the console labels each one.

## 4. File preparation automation

The goal is an AI agent that prepares each paid case's visa file (data check, itinerary, cover letter, application
form answers, checklist, flight and hotel options, Google Drive folder) as drafts for a specialist to review.

- **Built and live:** the secure connection for an outside tool such as Make, documented in
  `docs/automation/make-file-preparation.md`.
  - The website sends a signed webhook (ids only) when a case reaches Preparation.
  - `/api/automation/cases/:id` reads one case; `/upload-url` and `/parts` write drafts back. These open only with
    `MAKE_API_SECRET`, never the database key.
  - The "Draft with automation" button is on File preparation.
  - Vercel variables: `MAKE_API_SECRET`, `MAKE_WEBHOOK_URL`.
- **Agent instructions:** `docs/automation/make-agent-prompt.md`.
- **Recommended next step:** build the agent into the website with the Claude API instead of Make (data stays in
  EZvisa's systems; no per-step fees; tested with the site). Full instructions, in three parts (owner setup, the
  prompt for a new session, owner steps after): `docs/automation/build-in-app-agent-prompt.md`. The agent is built
  into this repository and controlled from the staff console (File preparation, Case page, Settings, Notifications,
  Overview, Audit log, guide).
- **Flow canvas:** a picture of the whole flow, drawn by a separate session from
  `docs/automation/flow-canvas-prompt.md` (saved as `docs/automation/file-prep-flow.html` once built).

### Options compared

| Option | For | Against |
|---|---|---|
| Make.com (connection ready) | Fastest start, no code | Per-step fees; client documents pass through another company; hard to test |
| n8n | Self-hostable, cheaper at volume | A server to run |
| Zapier | Easiest | Most expensive; weak for agents |
| **In-app with the Claude API (recommended)** | Data stays in EZvisa; versioned and tested; reuses the console flow | Development work |
| Claude Managed Agents | Anthropic hosts the loop | Still needs our tools for the database and Drive |

### Model choice for the agent

| | Claude Opus 5.5 (`claude-opus-5-5`), recommended | Claude Fable 5.1 (`claude-fable-5-1`) |
|---|---|---|
| Price per million tokens (input / output) | $4 / $20 | $10 / $50 |
| Estimated cost per case | about $0.40–1.50 | about $1–3.75 |
| Strength | Strong reasoning and tool use; fast enough for a background job | Anthropic's most capable widely released model; best for very hard, long multi-step work |
| Speed | Faster | Can think for many minutes on hard tasks |
| Settings | Thinking always on; effort default `medium` (set `high`); no forced tool choice | Thinking always on; effort up to `max`; no forced tool choice; requires 30-day data retention (not available under zero data retention) |

Start with Opus 5.5. If reviewed drafts show quality gaps on hard cases (multi-country trips, refusal history),
compare a sample of the same cases on Fable 5.1 before switching; it costs about 2.5 times as much.

### Practical limits (any option)

- Most flight and hotel services can search but cannot place a "visa reservation" without a real booking. Expect
  the agent to find options and staff to place holds.
- Official visa portals (France-Visas, VIDEX, VFS, TLS) need a person to enter the answers.
- Country document checklists must come from official sources and be verified by staff; the agent must never invent
  requirements.

## 5. How to work on the project

- Develop on a feature branch. A push to `main` deploys production; push to `main` only when the owner says so.
- Before reporting work as done, all must pass:
  - `./node_modules/.bin/tsc --noEmit`
  - `pnpm test`
  - `node scripts/check-app-sync.mts --ref origin/mobile-app`
  - `pnpm build`
- Use the console's demo session for browser checks (`/api/auth/demo-login?scenario=staff&role=admin|specialist|support|finance`,
  local and preview builds only). Demo data mirrors live data shapes, but demo checks do not prove real saves,
  emails or payments.
- **Rules:**
  - Never put credentials in code, docs or chat.
  - Customer copy says "payment gateway", never the provider's name.
  - Update English and Arabic together.
  - The passport number is collected after payment.
  - Insurance is quoted separately.
- **After a release:**
  - Check that the Vercel deployment for the intended commit is READY and aliased to www.ezvisa.net.
  - Check that old.ezvisa.net is unchanged.
  - Check the production error log (Vercel runtime errors) and the Supabase API logs.
