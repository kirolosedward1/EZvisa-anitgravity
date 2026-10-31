# Build the in-app file preparation agent: full instructions

This file has three parts:

- **Part A:** what the owner does before starting.
- **Part B:** the prompt to paste into a new Claude Code session.
- **Part C:** what the owner does after the build.

The flow canvas (a picture of how it all works) has its own prompt: `docs/automation/flow-canvas-prompt.md`. Build the
canvas first if you want to see the flow before the work starts. The two sessions are independent.

## Part A: owner steps before starting

Never paste a key or password into a chat. Keys go only into Vercel (project `e-zvisa-anitgravity` → Settings →
Environment Variables), marked **Sensitive**, for **Production** and **Preview**.

1. **Anthropic API key** (needed)
   - At console.anthropic.com, create a workspace named "EZvisa production".
   - Set a **monthly spend limit** for it (for example $50 to start).
   - Create an API key in that workspace.
   - In Vercel, add `ANTHROPIC_API_KEY` with that key.
2. **Mode switch** (needed): in Vercel, add `FILE_PREP_AGENT` = `off`. It stays off until the testing in Part C.
3. **Google Drive** (optional; without it, the Drive steps are skipped)
   1. In Google Workspace, create a **Shared Drive** named "EZvisa case files". A Shared Drive is needed because a
      service account has no storage of its own: files it creates in a personal My Drive fail, while files in a
      Shared Drive belong to the company.
   2. In Google Cloud Console:
      - create a project;
      - enable the **Google Drive API**;
      - create a **service account**;
      - create a **JSON key** for it.
   3. Add the service account's email to the Shared Drive as **Content manager**.
   4. In Vercel, add:
      - `GOOGLE_SERVICE_ACCOUNT_JSON`: the whole JSON file;
      - `DRIVE_ROOT_FOLDER_ID`: the ID at the end of the Shared Drive's web address;
      - `DRIVE_SHARE_WITH`: the team email that should see the folders.
4. **Flight and hotel search** (optional; can wait): the build session will say which provider it chose and the
   variable names it needs. Without it, staff book the flight and hotel themselves.
5. **A test case**
   - Make an account with an invented test person.
   - Pay in test mode.
   - Upload test documents (not a real passport) and approve them in the console, so the case reaches Preparation.
   - Note its reference.
6. **Decide two things** to tell the session:
   - a test budget (for example $10);
   - whether the agent may read the uploaded documents themselves (better checks, more cost, and the documents go to
     the AI provider) or only the typed answers.
7. **Start the session**
   - Open a new Claude Code session on `kirolosedward1/EZvisa-anitgravity`.
   - Choose the **Opus 5.5** model. Fable 5.1 also works; it is slower and uses more of the plan.
   - Paste Part B.

## Part B: prompt for the build session

Paste everything between the two lines.

---

You are building the **in-app AI file preparation agent** for EZvisa (www.ezvisa.net), a Schengen visa preparation
service for UAE residents. Everything you build lives in this repository, runs inside the EZvisa website, and is
controlled from the staff console at `www.ezvisa.net/staff` (`app/admin`, `components/staff`, `lib/staff`).

Build no separate app, service or dashboard. Every part of the agent must be visible and controllable from the
console, and every action must be recorded in the console's audit log.

### Step 0: read, then plan (stop and wait for the owner)

Read these before writing anything:

- `CLAUDE.md`, `AGENTS.md`, `DESIGN.md` and `docs/STATUS.md`;
- `docs/automation/make-file-preparation.md` and `docs/automation/make-agent-prompt.md`;
- `docs/releases/2026-10-30-admin-console/README.md`;
- every file named under "What already exists" below.

Their rules override this prompt where they differ.

Then send the owner a short plan with:

1. The background-job choice. Check this project's current Vercel plan and limits (function maximum duration,
   `after()` from `next/server`, Vercel Queues or Workflow, cron) and pick the simplest reliable option.
2. The migration you will add (step 2), in full, for his approval.
3. The flight and hotel search provider you recommend. Check that its sign-up and terms are currently open for
   search-only use; do not assume. Give its environment variable names.
4. The estimated cost per case.
5. Which steps need a real API call, and the cost of each test.

**Wait for his OK.** Do not apply a migration, call the Claude API, or touch a real case before he says yes.

### Goal

When a paid case reaches Preparation, the agent prepares **drafts** of the visa file and saves them on the console's
**File preparation** board for a specialist to review:

1. **Data check:** required data present and valid, or a precise list of what is missing.
2. **Itinerary:** day by day, matching the travel dates exactly.
3. **Cover letter:** one page, in English, to the embassy or consulate in the UAE of the main destination.
4. **Application form answers:** the Schengen application form, field by field, from the client's data only.
5. **Checklist:** each item marked provided, prepared or missing.
6. **Flight and hotel options:** when a search provider is set up; otherwise the case is marked for staff to book.
7. **Google Drive case folder:** when Drive is set up.

A person always reviews. The agent never submits anything to an embassy, visa centre, airline or hotel, never pays
for anything, and never contacts the customer.

### What already exists (reuse it, do not duplicate it)

- **`lib/automation/make.ts`**
  - `PART_KEYS`: `form`, `cover_letter`, `flight`, `hotel`, `itinerary`, `checklist`.
  - `notifyAutomation()`: the signed Make webhook.
  - `automationConfigured()`.
  - `isAutomationRequest()`: the Bearer `MAKE_API_SECRET` check.
- **`lib/automation/case-payload.ts`**
  - `caseForAutomation()`: paid, open cases from Preparation on only.
  - `buildCasePayload()`: application fields, questionnaire `answers`, approved `documents` (signed links valid
    15 minutes), `checklist`, current `parts`.
  - `answersFrom()`.
- **`lib/automation/compose.ts`**: `composePartBody()` and `composeNote()`.
- **`app/api/automation/cases/[id]/parts/route.ts`**: writes parts as `draft`, never over `done`, adds the summary
  as a case note, and writes an audit row (`actor_type: "automation"`).
- **`app/api/automation/cases/[id]/route.ts`** (read) and **`.../upload-url/route.ts`**: signed uploads to
  `<id>/prep/<part>.<pdf|jpg|png>`, at most 5 MB (the storage bucket's limit).
- **File preparation board:**
  - `app/admin/files/` and `components/staff/file-prep.tsx`, including **Assemble and mark Ready**;
  - `app/admin/files/actions.ts` → `sendToAutomation()`;
  - `components/staff/send-to-automation.tsx`: the **Draft with automation** button.
- **Automatic starts** in `app/admin/cases/[id]/actions.ts`:
  - `reviewDocument`, when the last document is approved;
  - `changeStage`, when staff move a case to `preparation`.
- **`lib/staff/file-prep.ts`** (`PARTS`, `partsFrom`, `fileKind`) and the `file_parts` table (migration 007):
  - columns `application_id`, `part`, `state` (`todo` | `draft` | `done`), `body` (40,000 characters at most),
    `file_path`, `file_name`, `updated_by`, `updated_at`;
  - unique on `(application_id, part)`.
- **Console plumbing:**
  - `case_notes` (`author_id` may be null) and `audit_events` (actor and event types are limited by check
    constraints: see migration 005 and the live database).
  - The `console_settings` table (migrations 011 and 012). It has a check constraint listing the allowed keys;
    values are validated in `lib/staff/console-settings.ts`, read in `console-settings-server.ts` and saved by
    `app/admin/settings/actions.ts`.
  - Permissions: `lib/staff/roles.ts` (`canOpen`, `PAGE_PERMISSION`, the `files` permission).
  - Search and preview: `app/admin/search-action.ts`.
  - The Notifications board, the Overview board and the Audit log board.
  - The user guide: `lib/staff/guide.ts`.

### Live database facts (Supabase project `dravvaykssrbktztmrlj`)

- `visa_applications` has **no** `travel_start_date`, `travel_end_date` or `paid_at` columns. Travel dates come from
  `entry_date` / `exit_date`, or from the questionnaire answers `travelStartDate` / `travelEndDate`.
- Live statuses: `draft`, `submitted`, `reviewing`, `awaiting_documents`, `preparation`, `ready`,
  `appointment_booked`, `completed`, `cancelled`.
- The questionnaire answers are in `additional_notes` (JSON text) under `wizard`; some older keys sit at the top
  level.
- Guard triggers on `visa_applications` let service-role writes through. Never write as a customer.
- Applied migrations: `002`, and `005` to `013`. New ones go in `supabase/migrations/` with the next number, and are
  applied only after the owner approves them in the session.
- Before any read, check the live column list (`mcp__Supabase__list_tables` or `information_schema`), not only the
  demo data.

### Step 1: shared foundation (no API calls)

1. **Shared write function**
   - Move the write logic of `PUT /parts` into `lib/automation/save-parts.ts` (validation, draft and never over
     done, the note, the audit row).
   - The HTTP route and the in-app agent both call it.
   - The Make flow must behave exactly as before; add tests that prove it.
2. **One start function**
   - Add `startFilePreparation(caseId, reason, actor)` in `lib/automation/start.ts`.
   - `sendToAutomation`, `reviewDocument` and `changeStage` call it instead of `notifyAutomation` directly.
3. **Mode**
   - The mode is read from the console setting `automation.mode` (`off` | `make` | `in_app`).
   - The environment variable `FILE_PREP_AGENT` acts as an emergency override: `off` stops everything, whatever the
     console says.
   - `in_app` is possible only when `ANTHROPIC_API_KEY` is set; `make` only when the Make variables are set.
   - Otherwise the start returns a clear message ("File preparation agent is off" or "AI key not set").
4. **Demo session:** every start in the demo staff session returns a "Demo:" message and calls nothing.

### Step 2: migration `014_file_prep_agent.sql` (owner approval required before applying)

1. **Table `automation_runs`**
   - Columns:
     - `id` uuid primary key;
     - `application_id` referencing `visa_applications`;
     - `status`: `queued` | `running` | `succeeded` | `needs_info` | `failed`;
     - `reason`: `all_documents_approved` | `stage_changed` | `manual` | `rerun`;
     - `mode`;
     - `model`;
     - `started_by` (staff id, or null for automatic starts);
     - `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`;
     - `cost_usd` numeric;
     - `steps` integer;
     - `error` text;
     - `summary` jsonb (the submitted result's status, missing info and warnings);
     - `created_at`, `started_at`, `finished_at`, `heartbeat_at`.
   - A partial unique index allows only one `queued` or `running` row per case.
   - RLS on, with no client policies (the same pattern as the other console tables).
2. **Settings key:** extend the `console_settings` key check constraint to allow `automation`.
3. **Audit types:** extend the `audit_events` type check constraint with the new event types you log
   (`automation_run_started`, `automation_run_finished`, `automation_tool_call` or similar). Read the current
   constraint from the live database first, and keep every existing value.
4. Additive only: change no existing column and delete no data.

### Step 3: running in the background

- The staff action returns at once: "Started. Drafts appear here in a few minutes."
- The run executes in the background mechanism chosen in step 0. It must survive the request ending, and stay within
  the function's maximum duration with margin.
- **Heartbeat and stale runs**
  - Update `heartbeat_at` during the run.
  - A run with no heartbeat for longer than the maximum duration is marked `failed` ("Stopped before finishing")
    when the console next reads it, and by the existing cron (`vercel.json`) if you add a sweep there.
  - A run must never stay `running` forever.
- **One active run per case:** a second start while one is active returns "Already running" (enforced by the
  database index, not only in code).

### Step 4: the agent

- **Load the `claude-api` skill before writing any Claude code, and follow it exactly.** Do not guess SDK names,
  parameters or beta headers.
- Use the official TypeScript SDK `@anthropic-ai/sdk`, added with pnpm.
- **Model:** `claude-opus-5-5`.
  - Thinking as the skill specifies for this model.
  - Effort set explicitly to `high` (the default is `medium`).
  - Streaming with `finalMessage()`.
  - The server-side refusal fallback (`fallbacks: "default"` with the beta header the skill names). Tell the owner
    it is on.
- **Tool choice:** forced `tool_choice` (`any` or `tool`) returns a 400 on this model. Use `auto` with `strict: true`
  tool schemas, and a system prompt instruction to finish by calling `submit_file_preparation` exactly once.
- **Loop:** the SDK's Tool Runner with Zod tools (`betaZodTool`), with:
  - a hard cap on loop steps;
  - a cap on total tokens per run;
  - the API's task budget feature, if the skill documents one for this model.
  When a cap is hit, end the run as `failed` with the reason.
- **Results:** always check `stop_reason`, including `refusal`, before using any output.
- **Cost:** compute `cost_usd` from `usage` (input, output, cache read, cache write) with the prices from the skill,
  in one tested function. Save tokens and cost on the run.
- **System prompt**
  - Adapt `docs/automation/make-agent-prompt.md` and keep its rules: client data only, "TO CONFIRM" for anything
    missing, reservations only, no payments, nothing sent to other websites, no contact with the customer.
  - Keep it stable and cached (prompt caching). The case data comes after it, in the first user message, from
    `buildCasePayload`.
- **Documents:** attach approved documents as PDF or image content blocks only if the owner said yes in Part A, and
  only from the 15-minute signed links. Otherwise use the typed answers only.

### Step 5: tools

Each tool validates its input with Zod, writes an audit row, returns short JSON, and never throws raw errors to the
model.

1. **`submit_file_preparation`**: the final result. Same shape as the `PUT /parts` body in
   `docs/automation/make-file-preparation.md`. Saved through `lib/automation/save-parts.ts`.
2. **`search_flights` and `search_hotels`**
   - Behind a provider interface in `lib/automation/travel/`, with the provider approved in step 0 as the first
     implementation.
   - **Search only:** never book, never hold a fare or room that costs money.
   - With no key, the tool returns `{ "configured": false }` and the agent sets status `to_book_by_staff`.
3. **`drive_prepare_case_folder` and `drive_save_file`**
   - Google Drive API with the service account, on the Shared Drive (`supportsAllDrives`).
   - The folder is named `<reference> – <full name> – <destination>`, under `DRIVE_ROOT_FOLDER_ID`, with these
     subfolders:
     - `01 Application form`
     - `02 Cover letter`
     - `03 Flight reservation`
     - `04 Hotel reservations`
     - `05 Itinerary`
     - `06 Client documents`
     - `07 Checklist`
   - Share only with `DRIVE_SHARE_WITH`, never "anyone with the link".
   - Reuse the folder on a rerun (store its ID or link with the run or case; do not create duplicates).
   - With Drive not set up, the tool returns `{ "configured": false }`.

### Step 6: country checklists

- Add `lib/automation/checklists.ts`: one entry per Schengen country in `SCHENGEN`
  (`lib/shared/wizard-contract.ts`), building on the generic `REQUIREMENTS`.
- Each entry has `verified_by` and `verified_on`.
- Mark as unverified every country you have not confirmed from that country's official visa page.
- The agent's warnings say when a country is unverified, and it never invents requirements.

### Step 7: connect everything to the staff console

The console is where staff run and control the agent. Build all of these, matching the console's existing design
(`app/admin/console.css`, `.ezc` classes) and its English copy style.

1. **File preparation board**
   - Next to **Draft with automation**: the latest run's status (Queued, Running, Succeeded, Needs info, Failed),
     time, steps and cost.
   - **Run again** after Failed or Needs info.
   - A link to the Drive folder.
   - The drafts appear in the existing part cards as **Draft**.
   - The page refreshes when a run finishes; the existing auto-refresh is enough if it shows the new state.
2. **Case page:** run history (each run's start, who or what started it, result, cost) in the case's full history,
   and the agent's internal note as today.
3. **Settings → Integrations, "File preparation agent" (new `automation` setting, admin only):**
   - mode (Off, Make, In app);
   - start automatically when a case reaches Preparation (on or off);
   - a monthly budget in USD: when this month's runs reach it, new runs do not start and staff see why;
   - may the agent read uploaded documents (on or off).
   Show which keys are set, never their values, and this month's runs and total cost.
4. **Permissions:** starting a run needs the `files` permission (the same as File preparation); changing the setting
   is admin only.
5. **Notifications:** an item when a run finishes (succeeded, needs info or failed) for the case owner, following how
   the Notifications board builds its items.
6. **Overview:** a count of cases with drafts waiting for review, linking to File preparation.
7. **Audit log:** every start, tool call and finish, with `actor_type: "automation"`, filterable like other events.
8. **Search:** a case's preview (`peekCase`) shows the latest run's status.
9. **Demo session:** shows realistic example runs from `lib/staff/demo.ts` and never calls anything or writes.
10. **User guide** (`lib/staff/guide.ts`):
    - update the File preparation and Settings sections;
    - add a "How the agent works" part (if the owner has published the flow canvas, link it);
    - update `GUIDE_UPDATED` and `WHATS_NEW`.
    The tests require a section for every board.

### Step 8: documents and policy

- Update `docs/automation/` (how it works, settings, troubleshooting) and `docs/STATUS.md`.
- Name **Anthropic** as the AI model provider (and Google Drive, and the search provider) in the privacy policy, in
  both `content/legal/privacy-policy.en.md` and `.ar.md`. Then run `node scripts/build-legal-content.mjs`.
  Update English and Arabic together.

### Step 9: tests and checks

Add unit tests for:

- the mode switch, including the environment override and the missing-key cases;
- the one-active-run rule;
- the stale-run rule;
- the monthly budget stop;
- every tool's input validation;
- the "never overwrite done" rule, through the shared function, for both Make and in app;
- checklist lookup and the unverified warning;
- cost from `usage`;
- the demo session never calling the API.

Mock the Claude client in tests. **No test calls the real API.**

Before you report anything as done, all of these must pass:

- `./node_modules/.bin/tsc --noEmit`
- `pnpm test`
- `node scripts/check-app-sync.mts --ref origin/mobile-app`
- `pnpm build`

Check the console in a browser with the demo staff session
(`/api/auth/demo-login?scenario=staff&role=admin`, then `specialist`) at 1440 and 390 pixels wide.

### Step 10: live test (only with the owner's OK and budget)

1. Use only the test case the owner names; never a real customer's case.
2. Ask the owner to set `FILE_PREP_AGENT=in_app` in Vercel and redeploy, and to switch the console setting to
   In app.
3. Run once. Report:
   - each draft;
   - the note;
   - the steps, tokens and real cost;
   - anything wrong.
4. Fix the problems and rerun within the budget.

### Rules

- **Credentials:** never put credentials in code, docs or chat, and never print environment values.
- **Payments:** stay in test mode. Customer copy says "payment gateway", never the provider's name.
- **Branches:** work on your designated branch. A push to `main` deploys production; push to `main` only when the
  owner says so. Merge `origin/main` into your branch before pushing (other sessions also push to `main`).
- **Data:** never write as a customer. Change no existing data. Apply no migration without the owner's OK.
- **Report honestly:** say what was verified with real keys and what only in demo mode or with mocks.

### Done means

- With mode In app and a valid key, **Draft with automation** on the test case in Preparation:
  - creates a run;
  - saves draft parts the specialist can edit;
  - adds an internal note with what is missing;
  - records steps, tokens and cost;
  - notifies the case owner;
  - logs every action in the Audit log.
- Without search or Drive keys, the run still finishes, with status `to_book_by_staff` and the Drive steps skipped.
- Mode Make still works exactly as before; mode Off sends nothing; the environment override stops everything.
- The monthly budget stops new runs when reached.
- The guide, docs, privacy policy and `docs/STATUS.md` are updated, and all checks pass.

---

## Part C: owner steps after the build

1. **During the build:** approve the step 0 plan, then the migration when the session asks. Give the test budget.
2. **For the live test:**
   - Set `FILE_PREP_AGENT` = `in_app` in Vercel, then **redeploy**: Vercel applies a changed variable only to new
     deployments.
   - In the console, open Settings → Integrations → File preparation agent and choose **In app**. Set the monthly
     budget.
3. **On the test case:** press **Draft with automation**. Within a few minutes, check every draft on File
   preparation, the note on the case and the cost shown.
4. **When happy:**
   - tell the session to push to `main`;
   - turn on "Start automatically when a case reaches Preparation";
   - keep checking the first real cases closely.
5. **To stop at any time:** choose Off in the console. In an emergency, set `FILE_PREP_AGENT` = `off` in Vercel and
   redeploy.
