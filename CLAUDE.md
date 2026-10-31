# EZvisa — Claude handoff

Read [AGENTS.md](AGENTS.md), then [DESIGN.md](DESIGN.md) before editing. The design guide is the owner's accepted brief; their newer instructions take precedence. [README.md](README.md) maps the repository. Detailed release history and verification limits are in [docs/releases/2026-10-29-redesign.md](docs/releases/2026-10-29-redesign.md).

## Current release — 29 October 2026

- Website is on `main`, deployed by the Vercel project `e-zvisa-anitgravity` to `www.ezvisa.net`, `ezvisa.net` and `new.ezvisa.net`.
- Use the current `main` HEAD and Vercel’s latest READY production deployment as the release reference. The original dashboard-insurance implementation was `1221e88`; later commits correct its position and remove the repeated tracking-page sign-in prompt.
- Previous design remains on `old.ezvisa.net`, deployment `dpl_B3LEF7gouDsxtm8DAjFVHqp6D15r`, branch `archive/pre-redesign-2026-10-29`. Preserve it.
- Native app is the separate `mobile-app` branch. Do not merge it into website `main`.
- This checkout is `/Users/kiro/Downloads/ezvisa-main-release`. `/Users/kiro/Downloads/ezvisa-redesign` is a mirrored local development workspace, not the Git repository.

## Last completed changes

- Staff console at `www.ezvisa.net/staff` (31 October 2026): all boards, editable settings and permissions, global search (Ctrl+K), user guide at `/staff/guide`. **Every console change must update `lib/staff/guide.ts`** (section, `GUIDE_UPDATED`, `WHATS_NEW`); the test suite enforces a section per board. Release notes: [docs/releases/2026-10-30-admin-console/README.md](docs/releases/2026-10-30-admin-console/README.md). Migrations 002 and 005 to 012 are applied to the live database.

- SEO pass (branch `claude/ezvisa-seo-improvement-2hdd3u`): per-language canonicals, en/ar hreflang, bilingual sitemap, destination `Service`/`BreadcrumbList` schema, 1200×630 share cards, corrected social profiles, `llms.txt`. Details and open recommendations: [docs/seo/2026-10-29-seo-audit.md](docs/seo/2026-10-29-seo-audit.md). New indexable pages should use `withArabicMeta()` or `localeAlternates()` and be added to `app/sitemap.ts`.

- Tracking-page intro uses a neutral “View all your applications” link to `/dashboard` for everyone. The repeated sign-in prompt is removed in English and Arabic. Dashboard authentication and token access restrictions are unchanged.

- Insurance is **after Preparation and before Ready, in the dashboard only**. Wizard: Destination → Traveller → Review & pay. Retired insurance deep links and saved step 5 resolve to review.
- Paid dashboard applications offer “Buy insurance through EZvisa” (separate quote) and “I’ll provide my own.” A preference never purchases a policy, confirms cover or changes the visa service fee.
- `components/dashboard/insurance-card.tsx` submits to `POST /api/insurance`. The route verifies the signed-in owner and paid status, changes only `additional_notes.insurancePreference`, preserves other notes, and uses a compare-before-write condition to prevent concurrent overwrites. The tightly scoped server write also supports paid cases already marked ready. No new database schema was needed.
- Public token tracking does not show the dashboard-only Insurance step. Demo choices never write real data or submit a quote.
- Account dropdown links use pale-blue hover/keyboard-focus fill, without the outer blue border/outline. Other controls retain accessible focus styling.
- DESIGN.md, AGENTS.md and README.md are in the repository root for future agents.

## Owner constraints to preserve

Keep existing blue branding, the approved hero heading, looping transparent-background Globi videos, and current responsive layouts. Use “payment gateway” in customer copy; do not expose its provider name. Passport number stays after payment. Insurance prices are quoted separately. Keep payments in **test mode** until explicitly instructed otherwise.

## Validation and remaining gaps

- Latest functional release: TypeScript passed; 87 unit tests passed; 284 shared-contract checks against `origin/mobile-app` passed. GitHub sync-check and unit-tests passed, and Vercel completed the production build.
- Browser checked: dashboard choice layout at desktop/mobile widths, Arabic copy, menu keyboard focus, wizard back navigation and retired-step draft restoration. Invalid insurance input returns 400; unauthenticated requests return 401 locally and in production.
- Real authenticated insurance preference saving has **not** been exercised against a customer account. The owner deferred real-account testing. Verify save/reload, ownership rejection, unpaid rejection and concurrent-edit handling with authorized test records before claiming end-to-end coverage.
- No automated insurance premium calculation, policy issuance or completed insurance purchase is implemented. Choices record a separately quoted request or own-policy preference.
- Email provider API key was last reported invalid. The owner explicitly authorized publication with email unresolved. Repair it securely in Vercel; never put credentials in source/chat. Confirmation/reset email delivery needs separate verification.
- Payment checkout creation was checked previously, but no completed real charge/webhook round trip was verified. Keep test mode.
- Social login: Google enabled, Apple previously disabled; account creation requires name, DOB and 18+ confirmation. Do not infer age from OAuth data.
- Local dev can report pre-existing deferred-script/hydration warnings from the customized Next script handling. Production has its deferred-script build check; do not describe demo checks as real authentication/payment proof.

## Useful commands

```sh
npm test
./node_modules/.bin/tsc --noEmit
node scripts/check-app-sync.mts --ref origin/mobile-app
npm run build
```

Use the explicit remote branch for the sync check: a stale local `mobile/` tree can give misleading failures. A push to `main` automatically deploys production. Verify the intended commit, successful CI/build, production aliases and preserved old-design alias after each release. Do not print environment values or credentials.
