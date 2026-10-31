# Working on EZvisa

Before making website UI changes, read [DESIGN.md](DESIGN.md). It records the accepted layouts, brand tokens, component map, accessibility requirements and owner decisions. Follow current user instructions when they change that brief, and update the guide after accepted changes.

- Website: Next.js App Router on `main`. Native app: `mobile-app` branch; see `mobile/AGENTS.md` when working there. Do not merge the mobile branch into main.
- Use shared components and the last applicable styles in `app/globals.css`; do not infer the current design from old CSS blocks or historical audit documents.
- For shared business-contract changes, read `docs/APP_WEB_SYNC.md` and verify both branches. Do not silently alter pricing, passport timing, payment status or upload rules during a visual change.
- Keep customer-facing payment wording generic: “payment gateway.” Keep secrets and server integration details out of UI copy.
- Update English and Arabic together. Preserve keyboard access, visible focus, responsive layouts and reduced-motion handling.
- Read applicable skills in `.agents/skills` for work involving those services.
- Validate changed behavior with suitable checks. `pnpm lint` is the TypeScript check; `pnpm test` runs the unit suite; `pnpm build` includes deferred-script validation. Do not add superficial tests for text-only edits.
- Do not claim real login, email delivery or completed payment works based on mocks or demo data. See `docs/releases/2026-10-29-redesign.md` for known verification limits.
- A push to `main` deploys production. Follow the user's release authorization, keep payments in test mode, and preserve `old.ezvisa.net` on the archive branch.
- Staff console (`/staff`, code in `app/admin`, `components/staff`, `lib/staff`): every change a staff member would notice must update the in-console user guide in `lib/staff/guide.ts` in the same commit: the matching section's steps, `GUIDE_UPDATED`, and a dated line in `WHATS_NEW`. `pnpm test` fails when a sidebar board has no guide section. Test console reads against the live column set too: demo data is not proof (see `lib/staff/data.ts` missing-column handling).
