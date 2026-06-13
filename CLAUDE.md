# EZvisa — Project Context for Claude Code

> Handoff document for Claude Code (or any AI assistant) to understand and work on the EZvisa codebase. Keep this file up to date when conventions or the design system change.

---

## 1. What is EZvisa?

**EZvisa** (https://www.ezvisa.net) is a Schengen visa application assistance service for UAE residents (largely Indian, Egyptian, Jordanian, Pakistani, and other expat communities living in the UAE).

**Value proposition:** Personally tailored visa applications by experts who know exactly what European embassies want to see. No templates, no guesswork.

**Key business facts:**
- Base price: **249 AED**
- Money-back guarantee if the visa is denied
- 98% approval rate, 5,000+ visas approved
- Covers all Schengen countries (27–29 depending on copy)
- Support via WhatsApp + Email + Phone, plus Crisp live chat

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (no `tailwind.config.js` — config lives in `app/globals.css` via `@theme inline`) |
| UI Library | shadcn/ui (Radix primitives) in `components/ui` |
| Animations | Framer Motion |
| Icons | Lucide React |
| Database / Auth | Supabase (PostgreSQL + Supabase Auth) |
| File Storage | Vercel Blob |
| Cache / Rate limiting | Upstash Redis |
| Payments | Ziina (UAE payment gateway) |
| CRM | HubSpot |
| Email | `app/api/send-email` + `lib/email-templates.tsx` |
| Analytics | Vercel Analytics + Google Analytics/GTM |
| Live chat | Crisp |
| Hosting | Vercel |

**Package manager:** `pnpm` (`pnpm-lock.yaml`). Use `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`.

**Font:** A single family — **Poppins** (`next/font/google`, weights 300–700), exposed as `--font-poppins` and applied via `font-sans`. There is no separate display/serif font.

---

## 3. Project Structure

```
/app                                  # Next.js App Router
  page.tsx                            # Homepage
  layout.tsx                          # Root layout: Poppins, metadata, GA/GTM, Crisp
  globals.css                         # Design tokens + Tailwind v4 theme
  error.tsx / not-found.tsx           # Error + 404
  robots.ts / sitemap.ts              # SEO
  /apply                              # Multi-step visa application wizard
    page.tsx, loading.tsx
    /thank-you                        # Post-submission page (+ thank-you-client.tsx)
  /about /contact /pricing /how-it-works /videos
  /news                               # Blog
    page.tsx, /[slug], not-found.tsx
  /documents                          # Required-documents hub
    page.tsx, layout.tsx, loading.tsx
    /required-documents-to-apply-for-a-tourist-visa-in-<country>  # one folder per country
  /payment-success /payment-failed
  /privacy-policy /terms-of-service /refund-policy
  /api
    /create-payment /check-payment /payment-retry   # Ziina
    /webhooks/ziina                                 # Ziina webhook
    /submit-application                             # visa form submission
    /send-email                                     # transactional email
    /hubspot/create-lead /hubspot/upload-files      # HubSpot CRM

/components                           # React components (see section 5)
  /ui                                 # shadcn/ui primitives
  /apply /blog /thank-you             # feature-specific component groups

/lib
  /supabase/{client,server}.ts        # Supabase clients (browser + server)
  /actions/visa-application.ts        # Server Actions
  /types/visa-application.ts
  countries.ts                        # Schengen country data
  blog.ts                             # Blog content helpers
  currency.ts  seo.ts  csrf.ts  sanitize.ts  rate-limit.ts  logger.ts
  form-types.ts  wizard-steps.ts  email-templates.tsx  utils.ts (cn helper)

/hooks                                # use-mobile.ts, use-toast.ts
/content                              # MDX/markdown blog content
/scripts                             # SQL migrations + blog seeding scripts
/public/images                       # Logos, country/destination photos
/docs                                # Internal docs (SEO, migration notes)
```

---

## 4. Design System (current — IMPORTANT)

The site was redesigned to feel like a **real, trustworthy professional service** and to deliberately avoid the "vibe-coded AI website" look. Honor this direction.

### Aesthetic direction
- Clean, bright, **Atlys-inspired** look: white surfaces, blue brand color, neutral grays.
- Headings are **semibold sans (Poppins)** with tight tracking — **no italic editorial/serif display type**.
- Section labels are compact **pill chips** (e.g. `inline-flex ... rounded-full bg-primary/10 text-primary text-xs font-medium`), not `— Eyebrow` dashes or `01 /` numbering.
- Depth comes from subtle shadows, soft gradients, masked dot grids, and gentle radial glows — **never decorative blobs, heavy mesh, grain, or glassmorphism**.

### Color tokens (defined in `app/globals.css` `:root`, OKLCH)
| Token | Purpose | Notes |
|---|---|---|
| `--background` | Page background | White |
| `--foreground` | Primary text | Near-black |
| `--primary` | Brand blue | `oklch(0.45 0.25 264)` |
| `--primary-foreground` | Text on primary | Near-white |
| `--secondary` / `--muted` | Soft backgrounds | Very light blue-gray |
| `--accent` | Lighter blue accent | `oklch(0.6 0.18 264)` |
| `--border` / `--input` | Borders | Light gray |
| `--ring` | Focus ring | Brand blue |
| `--radius` | Corner radius | `1rem` |

Usage rules:
- **Always use semantic tokens** (`bg-primary`, `text-foreground`, `bg-secondary`, `text-muted-foreground`). Never raw `bg-white`, `text-white`, `bg-black`.
- If you override a background color, override its text color too for contrast.
- Stay within the blue + neutral palette. **Never** use purple/violet prominently.

### Typography & spacing
- Headings: `font-semibold tracking-tight leading-tight` (sans).
- Body: `text-base leading-relaxed text-muted-foreground` for secondary copy.
- Use Tailwind's spacing scale only (`p-4`, `gap-6`, `py-20`) — no arbitrary values like `p-[17px]`.
- Use `gap-*` for spacing inside flex/grid; don't mix margin/padding with gap on the same element.

### Layout
- Container max-width around `max-w-6xl` / `max-w-7xl`; homepage hero uses `max-w-6xl`.
- Mobile-first; layer up with `md:` and `lg:`. Use flexbox/grid, not floats/absolute (unless necessary).

---

## 5. Key Components

| Component | Purpose |
|---|---|
| `site-header.tsx` | Sticky translucent (`backdrop-blur`) top nav, centered hover-pill links, mobile drawer. **New pages must be added here (desktop + mobile).** |
| `footer.tsx` | Dark footer with link sections + CTA |
| `hero-section.tsx` | Homepage hero: layered branded background (gradient wash + masked dot grid + radial glow), country selector, trust badges |
| `services-section.tsx` | 3-column services card grid |
| `how-it-works-simple.tsx` | Step process with icons |
| `comparison-section.tsx` | DIY vs EZvisa comparison |
| `testimonials-section.tsx` | Customer stories with star rows |
| `contact-section.tsx` | Homepage CTA section |
| `faq-section.tsx` | Accordion FAQ |
| `what-you-get-section.tsx` | Deliverables list |
| `top-destinations-carousel.tsx` | Animated destination/flag carousel (Embla) |
| `country-card.tsx`, `country-document-selector.tsx`, `document-requirements-page.tsx` | Documents flow |
| `start-application-box.tsx`, `fixed-cta-button.tsx`, `continue-application-notification.tsx` | Conversion helpers |
| `cookie-consent.tsx`, `scroll-restoration.tsx`, `scroll-to-top.tsx`, `theme-provider.tsx` | App-wide utilities |

---

## 6. Conventions & Hard Rules

1. **Responsive everywhere** — verify mobile (375px), tablet (768px), desktop (1280px).
2. **Any new page must be added to the nav** in `components/site-header.tsx` (desktop + mobile drawer).
3. **Domain is `ezvisa.net`** (use `https://www.ezvisa.net`). Never reference legacy `visa-help.eu`.
4. **Keep the design direction** from section 4 — no serif display headings, no decorative blobs/mesh/glass, no purple.
5. Server Components by default; add `"use client"` only when you need state/effects/browser APIs.
6. Use `next/link` for internal navigation and `next/image` for images.
7. Database: **no ORM** — use the Supabase JS client directly with parameterized queries. Scope queries to the user where relevant.
8. No `localStorage` for app data — use Supabase/cookies. (Wizard progress notifications are an existing exception.)
9. Always handle loading + error states; provide `loading.tsx` where routes fetch.
10. Accessibility: semantic HTML, `alt` text, ARIA labels for icon-only buttons, one `h1` per page.
11. Icons via Lucide — never emojis as icons.

---

## 7. Environment Variables (managed in Vercel)

```
# Supabase
NEXT_PUBLIC_ezvisaSUPABASE_URL
NEXT_PUBLIC_ezvisaSUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET

# Postgres (Supabase)
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING

# Storage
BLOB_READ_WRITE_TOKEN

# Cache / rate limiting (Upstash)
KV_URL
KV_REST_API_URL
KV_REST_API_TOKEN
REDIS_URL

# Payments (Ziina)
ZIINA_API_KEY

# CRM (HubSpot)
HUBSPOT_ACCESS_TOKEN
HUBSPOT_CLIENT_SECRET
```

Never log or expose secrets. Check the exact required names in the route/handler you're editing, since some integrations use prefixed variable names.

---

## 8. Common Tasks → Where to Look

| Task | Files |
|---|---|
| Add a page | `app/<route>/page.tsx` + add link in `components/site-header.tsx` |
| Change brand colors | `app/globals.css` (`:root` tokens) |
| Change the font | `app/layout.tsx` (Poppins import) + `app/globals.css` (`--font-sans`) |
| Edit homepage hero | `components/hero-section.tsx` |
| Edit testimonials / FAQ / footer | the matching `components/*-section.tsx` / `footer.tsx` |
| Add a Schengen country | `lib/countries.ts` + new `app/documents/required-documents-to-apply-for-a-tourist-visa-in-<country>/page.tsx` |
| Update pricing | `app/pricing/page.tsx` + price lines in hero/contact |
| Visa application logic | `app/apply/*`, `lib/wizard-steps.ts`, `lib/form-types.ts`, `lib/actions/visa-application.ts`, `app/api/submit-application` |
| Payments | `app/api/create-payment`, `app/api/webhooks/ziina`, `app/payment-success`, `app/payment-failed` |
| Email templates | `lib/email-templates.tsx` + `app/api/send-email` |
| Blog/news | `lib/blog.ts`, `/content`, `app/news/*`, `scripts/*blog*` |
| SEO metadata | `lib/seo.ts` + each page's `export const metadata` |
| DB migrations | `scripts/*.sql` |

---

## 9. Build & Verify

```bash
pnpm install      # install deps
pnpm dev          # local dev server
pnpm build        # production build — run before committing to catch type errors
pnpm lint         # eslint
```

- After UI changes, verify in the browser at mobile/tablet/desktop breakpoints.
- A passing build/lint is **not** proof of correct behavior — exercise the actual user path.

---

## 10. What NOT to Do

- Don't reintroduce serif/italic display headings, glassmorphism, `bg-mesh`/`bg-grain`, or decorative gradient blobs.
- Don't use purple/violet prominently.
- Don't use raw `bg-white`/`text-white`/`bg-black` — use semantic tokens.
- Don't hand-draw SVG maps — use a mapping library.
- Don't add localStorage-based data persistence.
- Don't add a new page without wiring it into the header nav.
- Don't reference `visa-help.eu`.
- Don't use an ORM; use the Supabase client.
- Don't use emojis as icons.

---

_Last updated: 2026-05-30 — reflects the current Poppins + bright-blue (Atlys-style) design system and the redesigned header/hero._
