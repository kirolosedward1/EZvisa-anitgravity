# Website ↔ App sync

The EZvisa website (this repository, branch `main`, deployed by Vercel to https://www.ezvisa.net) and the EZvisa
mobile app (Expo, `mobile/` on the `mobile-app` branch of this repository; never merged into `main`) are two clients
of the same product. They share one Supabase project, one `visa_applications` table, one Ziina checkout and one set
of rules. This document says what is shared, where it lives, and how to change it without the two drifting apart.

## 1. What must stay identical

| Rule | Website source | App source |
|---|---|---|
| Price: 249 AED, ×2 when the spouse travels | `lib/shared/wizard-contract.ts` (`PRICE_AED`, `priceAed`) | `mobile/lib/wizard.ts` |
| Wizard answers, defaults, step order, validation | `lib/shared/wizard-contract.ts` (`WizardAnswers`, `visibleSteps`, `validate*`) | `mobile/lib/wizard.ts` |
| Country, nationality, emirate and option lists (values **and** labels) | `lib/shared/wizard-contract.ts` | `mobile/lib/wizard.ts` |
| Statuses, labels, "paid", "finished", "takes documents", "needs the after-payment step" | `lib/shared/wizard-contract.ts` | `mobile/lib/wizard.ts`, `mobile/lib/data.ts` |
| Document types → `has_*` flag, bucket, path scheme, size/MIME limits | `lib/shared/wizard-contract.ts` (`DOC_FLAG`, `DOC_BUCKET`, …) | `mobile/lib/data.ts` |
| Required-documents checklist (NOC only for employees) | `lib/shared/wizard-contract.ts` (`REQUIREMENTS`, `requiredFlags`) | `mobile/lib/data.ts` |
| `additional_notes` JSON written to the row (`wizard`, `uploads`, `source`, `platform`, …) | `lib/shared/wizard-contract.ts` (`applicationColumns`, `ApplicationNotes`) | `mobile/lib/data.ts` |
| Case reference `EZ-` + first 8 hex of the id | `referenceOf` | `mobile/lib/data.ts` |
| Saved travellers (`public.travellers`): keys, relationships, dedupe key, answers ↔ traveller ↔ row mapping | `lib/shared/wizard-contract.ts` (`TRAVELLER_KEYS`, `travellerKey`, `travellerFromAnswers`, `applyTraveller`, `travellerToRow`, …), server side `lib/travellers.ts` | `mobile/lib/wizard.ts` (same block), `mobile/lib/travellers.ts` |
| Auth messages and Supabase error-code mapping | `lib/auth/errors.ts` | `mobile/lib/authErrors.ts` |
| Payment return: the server prices the case, URLs are forced onto the official domain | `app/api/create-payment/route.ts`, `app/app-return/page.tsx` | `mobile/lib/payments.ts`, `mobile/app.json` (`scheme`) |

The website's copy is the **contract**. `lib/shared/wizard-contract.ts` has no imports, so Node can load it directly
and the app can mirror it one-to-one.

## 2. Server routes the app depends on (must exist on `main`)

| Route | Used by the app for |
|---|---|
| `POST /api/create-payment` | Ziina checkout for an application id (price computed server-side) |
| `GET /api/check-payment?applicationId=` | Payment status after returning from Ziina |
| `POST /api/webhooks/ziina` | Verified webhook that marks the row paid |
| `POST /api/upload-document` (`Authorization: Bearer <session>`, multipart `file`, `applicationId`, `documentType`, `uploadId`) | Document uploads; sets the `has_*` flag and `additional_notes.uploads` |
| `GET /api/upload-document?id=` (Bearer) or `?token=` | Checklist status + `required` flags |
| `POST /api/continue-application` | After-payment step (passport number + employment), same JSON as the app's `saveContinueAnswers` |
| `GET /app-return` | Hands Ziina's return back to the app (`ezvisa://payment-return`) |
| `GET /api/app-config` | The whole contract as JSON (price, lists, steps, statuses, document types, traveller keys) |
| `GET /api/travellers` (Bearer) · `POST` · `PATCH /api/travellers/[id]` · `DELETE` | Saved travellers of the account: the list (backfilled once from past paid/submitted cases), add, edit / mark used, remove. The app reads through GET and writes to the table directly (RLS). |

## 3. The customer journey, same on both

1. **Wizard** — personal → spouse (if married and travelling together) → trip details → payment. No passport number,
   employment or documents before payment. Drafts are saved to one `draft` row per email and can be resumed on either
   platform (`/apply?draft=<id>` on the website). Signed in with saved travellers: a **"Who is travelling?"** drop-down
   (website traveller step) / question (app, right after the destination) fills the traveller fields from
   `public.travellers`; the picked id is kept in `additional_notes.travellerId`.
2. **Payment** — Ziina, 249 AED (498 with spouse). The server computes the amount.
3. **Continue application** — passport number + employment, stored in `additional_notes.wizard` and
   `passport_number`. Website: `/dashboard/continue?id=` or `/track/<token>/continue`. The spouse step offers the
   saved travellers too (`additional_notes.spouseTravellerId`).
   **Saved travellers** are written automatically: when a case becomes paid (`lib/ziina.ts applyIntentStatus` →
   `lib/travellers.ts rememberTravellersFromApplication`: main applicant, plus the spouse when travelling together),
   after `/api/continue-application` (website) and after `saveAfterPayment` (app, `mobile/lib/travellers.ts`).
   Customers manage them under Account → Saved travellers on both platforms. Schema: `scripts/007_travellers.sql`
   = `mobile/migrations/0015_travellers.sql` (applied on `ezvisa-uae` 2026-10-23; owner = account email, owner-only RLS,
   rows deleted with the account).
4. **Documents** — passport, photo, bank statement and (employees) NOC. Website: `/dashboard/upload?id=` or
   `/track/<token>/upload`.
5. **Tracking** — same status labels, next-step card and reference on `/dashboard`, `/track/<token>` and in the app.

## 4. Keeping them in sync

### Automatic checks

```bash
pnpm sync:check                                   # app files from ./mobile, or from origin/mobile-app
pnpm sync:check -- --mobile ../other-checkout/mobile
pnpm sync:check -- --ref origin/mobile-app --contract-ref origin/main
```

`scripts/check-app-sync.mts` loads both copies and compares lists, option values, answer keys and defaults, step
order, validators (same verdicts on the same fixtures), statuses, document types, the price rule, the auth messages,
the payment call shape, the deep-link scheme and a few website files that must import from the contract instead of
keeping private lists. It exits 1 on any drift.

`.github/workflows/app-sync.yml` runs it on every push and pull request to `main` and `mobile-app`, so a change on
one side fails CI until the other side catches up.

### `GET /api/app-config`

The contract as JSON, cached 5 minutes, with an ETag. The app can fetch it at launch and prefer it over its bundled
copy (lists, price, labels), so an already-released build follows the website for data-only changes. Code-level rules
(validators, step logic) still need an app release.

### Change procedure

1. Edit `lib/shared/wizard-contract.ts` on a `main` branch/PR. Bump `CONTRACT_VERSION` for breaking changes.
2. Mirror the change in `mobile/lib/wizard.ts` (and `data.ts`/`authErrors.ts` when relevant) on a `mobile-app`
   branch/PR.
3. Run `pnpm sync:check` locally pointing at the other checkout; CI runs it too.
4. Merge both. If only one can ship first, ship the **website** first: the app falls back to `/api/app-config`.
5. Never merge `mobile-app` into `main`; `tsconfig.json` excludes `mobile/` from the website build.

### Database

Both platforms write the same columns. Schema or RLS changes on the live project (`ezvisa-uae`,
ref `dravvaykssrbktztmrlj`) need the owner; keep migrations in `scripts/*.sql` (website) and `mobile/migrations`
(app) in step. The live table has no `tracking_token` for app-created rows, so website links fall back to
`/dashboard?id=` (see `lib/applications.ts`).

## 5. Known leftovers

- The separate `ezvisa-mobile-app` GitHub repository is a stale prototype with a committed `.env`; the real app is
  `mobile/` on the `mobile-app` branch here. Archive the old repository and rotate the keys it exposed.
- App-side follow-ups: fetch `/api/app-config` at launch; keep `mobile/lib/wizard.ts` in step with the contract
  (the CI check enforces it).
