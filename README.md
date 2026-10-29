# EZvisa

Schengen visa application assistance for UAE residents. The website uses Next.js App Router, React and TypeScript, with English and Arabic layouts.

## Start here: design and AI handoff

**[Read the design and layout guide → DESIGN.md](DESIGN.md)**

The guide records approved colors, typography, page layouts, Globi video usage, components, navigation, wizard behavior, accessibility, content rules and owner decisions. Read it before extending or redesigning the website.

- [Agent instructions](AGENTS.md)
- [Website ↔ mobile contract](docs/APP_WEB_SYNC.md)
- [Release record and known verification gaps](docs/releases/2026-10-29-redesign.md)
- [Blog implementation guide](docs/BLOG_SYSTEM_GUIDE.md)

## Environments

| Purpose | URL / branch |
| --- | --- |
| Current website | https://www.ezvisa.net — `main` |
| Redesign alias | https://new.ezvisa.net |
| Preserved previous design | https://old.ezvisa.net — `archive/pre-redesign-2026-10-29` |
| Native mobile app | `mobile-app` branch |

The connected Vercel project is `e-zvisa-anitgravity`. Pushing `main` triggers a production deployment. Preserve the archive domain and keep payments in test mode unless the owner explicitly changes that instruction.

## Development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use securely configured local environment variables; never commit credentials. Existing setup details are in [AUTH_SETUP.md](docs/AUTH_SETUP.md) and the relevant service documentation. Do not assume a successful local render verifies production integrations.

## Checks

```sh
pnpm lint       # TypeScript
pnpm test       # Unit tests
pnpm build      # Production build and deferred-script check
```

For shared contract changes, first refresh the remote mobile branch and follow [APP_WEB_SYNC.md](docs/APP_WEB_SYNC.md). Keep the native app and website branches separate.

## Source map

- `app/`: routes, API handlers, global layout and styles.
- `components/`: shared UI, wizard, dashboard, journal and Globi.
- `lib/`: domain rules, localization, auth, storage and payment helpers.
- `lib/shared/wizard-contract.ts`: shared website/app business rules.
- `content/`: article and legal content.
- `public/`: supplied character videos, photos, flags and document samples.
- `docs/`: implementation references and dated release/audit records. Historical design notes may be superseded by `DESIGN.md`.
