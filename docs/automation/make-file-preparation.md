# File preparation automation (Make.com)

The website tells Make when a case is ready for file preparation; Make's AI agent reads that one case, prepares
drafts, and writes them back to the **File preparation** board, where a specialist reviews them and presses
**Assemble and mark Ready**. Make never gets the database key.

## 1. Settings (Vercel, Production)

| Name | Value |
|---|---|
| `MAKE_API_SECRET` | A long random string you create (for example 48+ characters from a password manager). The same value goes into Make. |
| `MAKE_WEBHOOK_URL` | The URL of the Make scenario's **Custom webhook** trigger (`https://hook.<region>.make.com/...`). |

Both are needed before anything is sent. Settings > Integrations in the console shows whether they are set.
Never put either value in code or chat.

## 2. Event from the website (Make: Custom webhook)

Sent when the last document is approved (case moves to Preparation), when staff change the stage to Preparation,
or when someone presses **Draft with automation** on File preparation.

```json
{ "event": "case.ready_for_preparation", "application_id": "<uuid>", "reference": "EZ-…", "reason": "all_documents_approved | stage_changed | manual", "sent_at": "<ISO time>" }
```

Header `X-EZvisa-Signature: sha256=<hex>` is HMAC-SHA256 of the raw body with `MAKE_API_SECRET`; check it in Make
before continuing (Tools > Set variable with `sha256(body; MAKE_API_SECRET)`, or a filter). No personal data is
in the event.

## 3. Read the case

`GET https://www.ezvisa.net/api/automation/cases/<application_id>` with header `Authorization: Bearer <MAKE_API_SECRET>`.

Returns `application` (name, contact, destination, dates, passport), `answers` (the questionnaire),
`documents` (approved uploads with download links valid 15 minutes), `checklist` (the case's document checklist
with provided / missing / to_prepare) and `parts` (current state of the six file parts). Only paid, open cases
from Preparation on are readable; others return 409. Every read is in the audit log.

## 4. Upload a prepared file (optional)

1. `POST /api/automation/cases/<id>/upload-url` with `{ "part": "flight", "file_name": "flight.pdf", "size": 123456 }`
   (PDF, JPG or PNG, at most 5 MB) returns `{ path, signed_url, content_type }`.
2. `PUT` the file bytes to `signed_url` with that `Content-Type`.
3. Register it in step 5 with `parts.flight.file_path = path`.

## 5. Write the drafts back

`PUT https://www.ezvisa.net/api/automation/cases/<application_id>/parts` with the same bearer header and the agent's
JSON output:

```json
{
  "status": "ready_for_review | needs_info | to_book_by_staff",
  "main_destination": "France",
  "missing_info": ["…"],
  "warnings": ["…"],
  "notes_for_specialist": "…",
  "drive_folder_url": "https://drive.google.com/…",
  "parts": {
    "form":         { "summary": "…", "drive_file_url": "https://…" },
    "cover_letter": { "body": "<letter text>" },
    "flight":       { "summary": "…", "file_path": "<path from step 4>" },
    "hotel":        { "summary": "…" },
    "itinerary":    { "body": "<day by day>" },
    "checklist":    { "items": [{ "item": "Bank statement", "status": "provided" }] }
  }
}
```

Each part is saved as **Draft** on File preparation (a part a person already marked **Done** is never
overwritten). The status, missing information, warnings and Drive folder become an internal note on the case
(pinned when information is missing). The response lists `saved` and `skipped` parts.

## 6. Make scenario outline

Custom webhook → verify signature → HTTP GET case → (download documents to Google Drive) → AI Agent (make-agent-prompt.md) → HTTP upload-url / PUT file (reservations) → HTTP PUT parts →
(optional) notify the team. The agent prompt is in make-agent-prompt.md. Keep Make's "Data is confidential" option on so run data is not stored, and set the
scenario's data retention to the shortest available.
