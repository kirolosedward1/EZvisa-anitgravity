# Prompt: build the in-app file preparation agent

Paste everything below the line into a new Claude Code session on the `kirolosedward1/EZvisa-anitgravity` repository.

---

You are building the **in-app AI file preparation agent** for EZvisa (www.ezvisa.net), a Schengen visa preparation service for UAE residents. Read `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `docs/automation/make-file-preparation.md`, `docs/automation/make-agent-prompt.md` and `docs/releases/2026-10-30-admin-console/README.md` before changing anything. Follow every rule in `CLAUDE.md` and `AGENTS.md`; they override this prompt where they differ.

## Goal

When a paid case reaches Preparation, an AI agent running inside the EZvisa website (not Make.com) prepares **drafts** of the visa file, and saves them on the staff console's **File preparation** board for a specialist to review:

1. **Data check**: required data present and valid, or a precise list of what is missing.
2. **Itinerary**: day by day, matching the travel dates exactly.
3. **Cover letter**: one page, in English, to the embassy or consulate of the main destination in the UAE.
4. **Application form answers**: the Schengen application form, field by field, from the client's data only.
5. **Checklist**: each item marked provided, prepared or missing.
6. **Flight and hotel options**: when a search provider is configured; otherwise the case is marked for staff to book.
7. **Google Drive case folder**: when Drive is configured.

A human always reviews. The agent never submits anything to an embassy, visa centre, airline or hotel, never pays for anything, and never contacts the customer.

## What already exists (reuse it, do not duplicate it)

- `lib/automation/make.ts`
  - `PART_KEYS`: the six part keys: `form`, `cover_letter`, `flight`, `hotel`, `itinerary`, `checklist`.
  - `notifyAutomation()`: sends the Make webhook.
  - `automationConfigured()`: whether the Make connection is set up.
  - `isAutomationRequest()`: the Bearer `MAKE_API_SECRET` check.
- `lib/automation/case-payload.ts`
  - `caseForAutomation()`: allows only paid, open cases from Preparation on.
  - `buildCasePayload()`: the case's application fields, questionnaire `answers`, approved `documents` (15-minute signed links), `checklist` and current `parts`.
  - `answersFrom()`.
- `lib/automation/compose.ts`
  - `composePartBody()`: builds the text saved for one part.
  - `composeNote()`: builds the internal note for the specialist.
- `app/api/automation/cases/[id]/parts/route.ts`
  - Writes parts as `draft`.
  - Never overwrites a part whose state is `done`.
  - Adds the agent's summary as a case note.
  - Writes an audit row (`actor_type: "automation"`).
  - **Move this write logic into a shared function in `lib/automation/`**, so the HTTP route and the in-app agent use the same code.
- `app/api/automation/cases/[id]/route.ts` (read) and `.../upload-url/route.ts` (signed uploads to `<id>/prep/<part>.<pdf|jpg|png>`, 5 MB maximum, the storage bucket's limit).
- `app/admin/files/actions.ts` → `sendToAutomation()`, and `components/staff/send-to-automation.tsx` (the "Draft with automation" button).
- Cases are sent automatically from `app/admin/cases/[id]/actions.ts`:
  - `reviewDocument`, when the last document is approved and the case moves to Preparation;
  - `changeStage`, when staff move a case to `preparation`.
- `lib/staff/file-prep.ts` (`PARTS`, `partsFrom`, `fileKind`) and the `file_parts` table (migration 007):
  - columns: `application_id`, `part`, `state` (`todo` | `draft` | `done`), `body` (≤ 40,000 characters), `file_path`, `file_name`, `updated_by`, `updated_at`;
  - unique on `(application_id, part)`.
- `case_notes` (author_id may be null), `audit_events` (types are limited by a check constraint; see migration 005 and the live database).
- Settings → Integrations (`app/admin/settings/page.tsx`) shows the connection status.

## Live database facts (project `dravvaykssrbktztmrlj`)

- `visa_applications` has **no** `travel_start_date`, `travel_end_date` or `paid_at` columns. Travel dates are `entry_date` / `exit_date`, or the questionnaire answers `travelStartDate` / `travelEndDate`.
- Live statuses in use: `draft`, `submitted`, `reviewing`, `awaiting_documents`, `preparation`, `ready`, `appointment_booked`, `completed`, `cancelled`.
- The questionnaire answers live in `additional_notes` (JSON text), under `wizard`; some older keys sit at the top level.
- Guard triggers on `visa_applications` let service-role writes through. Never write as a customer.
- Applied migrations: `002`, `005` to `013`. New migrations go in `supabase/migrations/` with the next number, and the owner must approve them before they are applied. Do not apply one without the owner's OK.

## Design to implement

1. **Mode switch.**
   - New environment variable `FILE_PREP_AGENT` with values `in_app` | `make` | `off`.
   - Default: `off`, unless `ANTHROPIC_API_KEY` is set and the value is `in_app`.
   - `sendToAutomation`, `reviewDocument` and `changeStage` call one function, `startFilePreparation(caseId, reason)`. It runs the in-app agent, sends the Make webhook, or does nothing, according to the mode.
2. **Runs table** (new migration `014_automation_runs.sql`; RLS on, no client policies).
   - Columns: `id`, `application_id`, `status` (`queued` | `running` | `succeeded` | `needs_info` | `failed`), `reason`, `model`, `input_tokens`, `output_tokens`, `cost_usd` (numeric), `error`, `started_at`, `finished_at`.
   - At most one `queued` or `running` row per case: a second start while one is active returns "already running".
   - Show the latest run's status, time and cost on File preparation, next to the button.
3. **Running in the background.**
   - A full case can take several minutes.
   - Check the current Vercel limits for this project's plan (function maximum duration, `after()` from `next/server`, Vercel Queues or a job service), then choose the simplest reliable option.
   - The staff action must return at once ("Started. Drafts appear here in a few minutes").
   - If a run is cut off, mark it `failed` with a clear error, so it never stays `running` forever.
4. **The agent: Claude API with tool use, using the official TypeScript SDK `@anthropic-ai/sdk`.**
   - Load the `claude-api` skill before writing any Claude code, and follow it exactly. Do not guess SDK names.
   - Model `claude-opus-5-5`, with adaptive thinking.
   - Set effort explicitly to `high`; this model's default is `medium`.
   - Use streaming with `finalMessage()`.
   - Enable the server-side refusal fallback (`fallbacks: "default"`, with the matching beta header the skill names), and tell the owner it is on.
   - Forced `tool_choice` (`any` / `tool`) returns a 400 on this model. Use `auto`, `strict: true` tool schemas, and a prompt instruction instead.
   - Use the SDK's Tool Runner with Zod tools (`betaZodTool`), with a hard cap on loop iterations and a task budget, so one case can never run away with cost.
   - Always check `stop_reason`, including `refusal`, before using the output.
5. **Tools the agent gets** (each validates its input, logs to `audit_events`, and returns short JSON):
   - `submit_file_preparation`: the final result. Same shape as the `PUT /parts` body in `docs/automation/make-file-preparation.md`. The system prompt tells the agent to call it exactly once at the end. The server writes the parts through the shared function.
   - `search_flights` and `search_hotels`:
     - behind a provider interface, with Amadeus or Duffel as the first implementation;
     - **search only**: never book, never hold a fare that costs money;
     - when no provider key is set, return `{ "configured": false }`, so the agent sets status `to_book_by_staff`.
   - `drive_prepare_case_folder` and `drive_save_file`:
     - Google Drive API with a service account;
     - folder `<reference> – <full name> – <destination>` under `DRIVE_ROOT_FOLDER_ID`, with subfolders `01 Application form`, `02 Cover letter`, `03 Flight reservation`, `04 Hotel reservations`, `05 Itinerary`, `06 Client documents`, `07 Checklist`;
     - share with the EZvisa team account only, never "anyone with the link";
     - when Drive is not configured, return `{ "configured": false }`.
   - The case data is given in the first user message (from `buildCasePayload`), not through a tool.
   - The approved documents may be attached as PDF or image content blocks so the agent can cross-check names and dates. Only attach them if the owner approves the extra cost and data flow.
6. **System prompt.**
   - Adapt `docs/automation/make-agent-prompt.md` (role, tasks, rules), keeping its rules: client data only, "TO CONFIRM" for anything missing, reservations only, no payments, nothing sent to other websites.
   - Keep the system prompt stable and cache it (prompt caching), with the per-case data after it.
7. **Country checklists.**
   - Add `lib/automation/checklists.ts`: one entry per Schengen country in `SCHENGEN` (`lib/shared/wizard-contract.ts`), building on the generic `REQUIREMENTS`.
   - Each entry carries a `verified_by` and a `verified_on` field.
   - Mark every country you have not confirmed from that country's official visa page as unverified.
   - The agent must say so in its warnings for unverified countries and must never invent requirements.
8. **Console.**
   - File preparation shows the run status, the agent's note and the drafts (the existing flow).
   - Settings → Integrations shows "File preparation agent: in app / Make / off" and which keys are set. Never show the values.
9. **Documents and policy.**
   - Update the user guide `lib/staff/guide.ts`: the File preparation section, `GUIDE_UPDATED`, `WHATS_NEW`. The tests require a section for every board.
   - Update `docs/automation/`.
   - Name **Anthropic** as the AI model provider in the privacy policy, in both `content/legal/privacy-policy.en.md` and `.ar.md`.
   - Then run `node scripts/build-legal-content.mjs`.

## Rules

- **Credentials:** Never put credentials in code, docs or chat, and never print environment values. The owner adds these in Vercel himself:
  - `ANTHROPIC_API_KEY`, `FILE_PREP_AGENT`;
  - `GOOGLE_SERVICE_ACCOUNT_JSON` (or client email plus private key), `DRIVE_ROOT_FOLDER_ID`, the team email to share folders with;
  - the flight/hotel provider keys.
- **The demo staff session** (`/api/auth/demo-login?scenario=staff`) must never call the Claude API, Drive or a search provider, and never write data. Return a "Demo:" message, as other console actions do.
- **Every real model call costs money.** Get the owner's OK and a budget before any test that calls the API. Never test on a real customer's case without the owner's OK; use a test case he creates.
- **Payments stay in test mode.** Customer-facing copy says "payment gateway", never the provider's name.
- **Update English and Arabic together** wherever customer-facing text changes.
- **Branches:** work on your designated branch. A push to `main` deploys production; push to `main` only when the owner says so.
- **Before you report work as done**, run all of these and make sure they pass:
  - `./node_modules/.bin/tsc --noEmit`
  - `pnpm test`
  - `node scripts/check-app-sync.mts --ref origin/mobile-app`
  - `pnpm build`
- **Add unit tests** for:
  - the mode switch;
  - the one-active-run rule;
  - every tool's input validation;
  - the "never overwrite done" rule;
  - checklist lookup;
  - cost calculation from `usage`.
- **Report honestly.** Say what was verified with real keys and what was only checked in demo mode or with mocks.

## Done means

- With `FILE_PREP_AGENT=in_app` and a valid key, "Draft with automation" on a paid test case in Preparation:
  - creates a run;
  - saves draft parts the specialist can edit;
  - adds an internal note with what is missing;
  - records tokens and cost, and logs everything.
- Without the search or Drive keys, the run still completes, with status `to_book_by_staff` and the Drive steps skipped.
- With `FILE_PREP_AGENT=make` the existing Make webhook flow still works unchanged. With `off`, nothing is sent.
- The guide, docs and privacy policy are updated, and all checks pass.

Start by reading the files above. Then give the owner a short plan, including: the background-job choice, the new migration (for his approval), the environment variables he must add, and the estimated cost per case. Wait for his OK before applying the migration or calling the API.
