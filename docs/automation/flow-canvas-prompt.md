# Prompt: build the file preparation flow canvas

Paste everything below the line into a new Claude Code session on the `kirolosedward1/EZvisa-anitgravity` repository.
The session draws one page that shows how the file preparation agent works. It builds no features and changes no data.

---

You are drawing the **file preparation flow canvas** for EZvisa (www.ezvisa.net), a Schengen visa preparation
service for UAE residents. The page shows how an AI agent will prepare each paid case's visa file inside the EZvisa
website and staff console (`www.ezvisa.net/staff`), and how staff control and review it.

Read these first: `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `docs/STATUS.md`, `docs/automation/build-in-app-agent-prompt.md`,
`docs/automation/make-file-preparation.md`, `lib/staff/guide.ts` (File preparation section),
`components/staff/file-prep.tsx` and `app/admin/files/`. The content below must match them. If something below
disagrees with the code, the code wins: say so to the owner and draw what the code does.

## What to deliver

1. A single self-contained HTML page, saved in the repository as `docs/automation/file-prep-flow.html`.
2. The same page published as an Artifact (claude.ai page), private, titled **EZvisa File Preparation Flow**.
   - Use the Artifact tool's quickstart first, then follow its page rules.
   - Draw every diagram as hand-written inline SVG. Use no diagram or chart libraries.
3. Commit the HTML file on your designated feature branch and push it. Do not push to `main` unless the owner says
   so (a push to `main` deploys production).
4. Add one line to `docs/STATUS.md` (section 4) with the canvas link and the file path.
5. Give the owner the link.

## Look

- **EZvisa colours**, as tokens:
  - blue `#0436dc` (actions, the agent's path)
  - sky `#edf4ff`
  - ink `#102347` (text)
  - muted `#52617a`
  - border `#dee5f0`
  - page `#f6f8fc` with white cards
  - amber `#fff4de` / `#7a4b00` for "needs a person"
  - green `#e3f5e8` / `#135c2b` for done
- **Type:** DM Sans (Google Fonts), weights 500 and 600 only.
- **Themes and widths:** a light and a dark theme, and the page works at phone width (diagrams stack top to bottom
  on a phone and read left to right on a desktop).
- **Words:** short and plain, written for the owner and staff, not developers. Put technical names (tables, files,
  routes) in a small "For developers" line under each diagram.
- **Payments:** say "payment gateway", never the provider's name.
- **Status labels:** mark every step **Live** (exists today) or **To build** (planned), with a small label on the
  step itself. Never present a planned step as working.

## Content (draw exactly this; do not add features)

### 1. Header

- **Title:** EZvisa File Preparation Flow.
- **One line:** "When a paid case reaches Preparation, an AI agent drafts the visa file. A specialist checks every
  draft in the staff console before anything is used."

### 2. The whole journey (main diagram, swimlanes)

Lanes, top to bottom: **Customer**, **Website**, **Staff console**, **AI agent**, **Outside services**.

1. Customer pays the service fee through the payment gateway. *Live*
2. Customer answers the trip questions and uploads documents. *Live*
3. Staff review each document on the Documents board (approve or reject). *Live*
4. The last approval moves the case to **Preparation** automatically. *Live*
   - Staff can also move a case to Preparation by hand, or press **Draft with automation** on File preparation. *Live*
5. The website starts file preparation, using the mode chosen in Settings: **In app**, **Make** or **Off**. *To build*
   (the Make path is *Live*).
6. **In app:** a run is created and the agent works in the background (a few minutes). The staff member's screen
   returns at once. *To build*
7. The agent reads the case: application details, questionnaire answers, approved documents and the checklist.
   *To build*
8. The agent calls outside services:
   - flight and hotel **search** (options only, never a booking or payment);
   - Google Drive (creates the case folder);
   - Claude, the AI model, which writes the drafts.
   *To build*
9. The agent saves **drafts** on the File preparation board and adds an internal note listing what is missing.
   *To build* (the saving step already exists for Make and is *Live*)
10. Staff get a notification; the run's status and cost show next to the button. *To build*
11. A specialist opens each draft, edits it, marks it **Done**, then presses **Assemble and mark Ready**. *Live*
12. The customer sees the case as Ready in their dashboard. *Live*

Arrows carry short labels such as "approves last document", "starts run", "reads case", "search only",
"saves drafts", "notifies" and "reviews and edits".

### 3. One switch, three modes (small diagram)

`Start file preparation` branches into three paths:

- **In app (recommended):** the agent inside the website. Data stays in EZvisa's systems.
- **Make:** a signed message to the Make.com scenario. Make reads the case through the secure endpoint and writes
  drafts back the same way. *Live*
- **Off:** nothing is sent.

All three branches end at the same box, **Drafts on File preparation**, because they save through the same code.
Show the emergency off switch: the `FILE_PREP_AGENT=off` setting in Vercel overrides the console choice.

### 4. Inside one run (agent loop)

Draw a loop:

1. Case data goes in.
2. Claude thinks.
3. Claude calls a tool: search flights, search hotels, prepare Drive folder, save file to Drive.
4. The tool's result comes back.
5. Repeat.
6. **Submit file preparation** (called once, at the end).
7. The website checks the result.
8. Drafts are saved.

Show the limits on the loop: "at most N steps" and "token and cost cap per run". A tool that is not set up answers
"not configured", and the agent carries on: no search key means staff book the flight and hotel; no Drive means the
Drive folder is skipped.

### 5. Run status (state diagram)

States: **Queued** → **Running** → one of **Succeeded**, **Needs info** (amber) or **Failed** (red, uses an error
colour token).

- A run that is cut off or runs too long becomes **Failed** with a reason; it never stays Running.
- Only one active run per case: pressing the button again while one runs shows "Already running".
- Staff can **Run again** after Failed or Needs info.

### 6. What the agent prepares

A table with columns **Part**, **What the agent drafts** and **Who finishes it**.

| Part | What the agent drafts | Who finishes it |
|---|---|---|
| Data check | What is present, what is missing | Specialist asks the customer |
| Itinerary | Day by day, matching the travel dates | Specialist checks |
| Cover letter | One page to the main destination's embassy | Specialist checks and signs off |
| Application form | Answers field by field | Specialist enters them on the official portal |
| Checklist | Each item: provided, prepared or missing | Specialist checks against the official list |
| Flight and hotel | Options from search | Staff place the reservations |
| Drive folder | Folder with seven subfolders | Staff add the final files |

### 7. Rules the agent never breaks (a short list with a "never" icon)

- Never submits anything to an embassy, visa centre, airline or hotel.
- Never pays for anything or books a paid fare.
- Never contacts the customer.
- Never invents information. Anything missing is written "TO CONFIRM".
- Never overwrites a part a person marked Done.
- The demo staff session never calls the AI, Drive or search.

### 8. Where you control it in the staff console

A small map of the console (sidebar boards as boxes) with what each one does for the agent:

- **File preparation:** start, run status, drafts, Run again.
- **Case page:** run history and the agent's note.
- **Settings → Integrations:** mode, monthly budget and which keys are set (never the values).
- **Notifications:** run finished or needs info.
- **Audit log:** every agent action.
- **Overview:** drafts waiting for review.
- **User guide:** how it works.

### 9. Before it can run (owner checklist)

- Anthropic API key, with a monthly spend limit.
- Google Shared Drive with a service account.
- An optional flight and hotel search key.
- A test case.
- A budget for tests.
- Approval of the new database table.

Each item is a checkbox-style row (static, not interactive storage).

### 10. Cost

About **$0.40 to $1.50 per case** with Claude Opus 5.5 ($4 per million input tokens, $20 per million output tokens),
before any flight or hotel search fees. Label it as an estimate, to be confirmed by the first test runs.

## Checks before you publish

- Every step's Live / To build label matches the code.
- No horizontal scrolling at 400px, except inside a diagram's own scroll box.
- Both themes are readable.
- The page has no lorem ipsum and no invented numbers.
- Do not change any code outside `docs/`.
