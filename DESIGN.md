# EZvisa design and layout guide

**Start here before changing the website UI.** This is the shared design brief for people and AI agents continuing EZvisa. Last reviewed: **29 October 2026**.

This document records the owner's accepted decisions and maps them to the implementation. It replaces the earlier design draft in this file. New explicit owner instructions take precedence; update this guide when a decision changes. Read the actual component and the **last applicable CSS rule** before editing: `app/globals.css` contains historical rules followed by scoped overrides.

## Quick orientation

- Production website: https://www.ezvisa.net
- Redesign alias: https://new.ezvisa.net
- Preserved previous design: https://old.ezvisa.net
- Website branch: `main`; native app branch: `mobile-app`. Do not merge the app branch into the website branch.
- Framework: Next.js App Router, React, TypeScript, Tailwind CSS, Radix primitives, Framer Motion.
- Main visual source: [`app/globals.css`](app/globals.css). Font setup: [`app/layout.tsx`](app/layout.tsx).
- Release details and known verification gaps: [`docs/releases/2026-10-29-redesign.md`](docs/releases/2026-10-29-redesign.md). Treat deployment IDs there as dated evidence, not live configuration.

## Design intent

A clean, lively travel website, with the original EZvisa blue and Globi as the recognizable guide. The owner rejected generic AI-looking layouts, oversized headings, repetitive cards, unnecessary badges and decorative clutter. Use clear composition, useful content, real document previews, contextual animation and considered photography to create character.

Triips was a reference for inspiration, not a template to copy. Preserve the website's own identity and existing features. Avoid introducing another color palette, glass effects, gradient-heavy sections or a new font system to make a page feel different.

## Non-negotiable owner decisions

| Area | Decision |
| --- | --- |
| Brand | Keep the original blue. |
| Homepage heading | Exactly **“Your Schengen visa, made simple.”** Keep its reduced size. |
| Globi | Leads the homepage and wizard. Use supplied videos, with visually transparent backgrounds, autoplay, muted, inline and looping. No visible pause icons. |
| Navigation | Public header includes Blog and Videos. Hide language switcher and Travel tools. Signed-in header contains only **My applications**, **New application**, **Help**, plus account and WhatsApp controls. |
| Active state | Account links use a blue-text pale-blue pill, with **no underline**. Dropdown links use a pale-blue hover/keyboard-focus fill without an outer border or outline. Public links use their existing underline treatment. Do not combine both styles. |
| Homepage starter | Searchable nationality/destination fields with flags; small Start application button beside fields when space permits. No price inside this box. Button corners match fields: 6px. |
| Nationalities | Short list of common UAE resident nationalities plus **Show all nationalities**. Do not delete valid nationalities to shorten the list. |
| Journey under Globi | UAE flag + **UAE**, arrow, selected country flag + country name. Country names share typography. No “From the” or “Explore your destination” subtitle. |
| Founder | Quote after **Your file, taken care of** on home and also on About. No “A word from our founder” heading. |
| Founder wording | “I believe everyone has the right to travel and explore the world. You just need to do it right!” — **Kirolos Edward, EZvisa Founder**. |
| Homepage sections | Keep the four-step illustrated walkthrough. Do not restore “Plan the practical details” on home or append a generic visa guide to every page. |
| App page | No decorative section badges. Keep the phone illustration restrained. Store link stays `#` until the owner supplies a real URL. |
| Support | Always use the shared WhatsApp icon. Do not claim support hours. Chat plugin is hidden for now. |
| Payment copy | Say **payment gateway**, not the provider's brand. Internal integration identifiers are technical details, not UI copy. |
| Passport | Collect passport number after payment in the continuation flow. Do not reintroduce the pre-payment requirement. |
| Insurance | Dashboard-only step named **Insurance**, after Preparation and before Ready, offers an EZvisa purchase/quote option and an own-policy option. Quote separately; do not add an invented premium to the service fee. |
| Account creation | Name and birthdate; minimum age 18; explicit unchecked 18+ declaration. Do not expose “Explore demo accounts” on login/signup. |
| Social login | Use name, email and avatar when supplied. Never invent age/DOB. Ask for missing required details in the completion flow. |
| Resume | Show a dismissible saved-application box with destination flag and Continue application. Dismissal must not erase answers. |

## Tokens and typography

Use semantic variables and shared components before adding hard-coded values.

| Token | Value | Use |
| --- | --- | --- |
| `--ez-blue` / primary | `#0436dc` | Actions, active states, links, focus |
| Primary hover | `#062db1` | Existing starter hover |
| `--ez-sky` | `#edf4ff` | Hero, companion area, calm section backgrounds |
| `--ez-ink` / foreground | `#102347` | Main text |
| Background | `#ffffff` | Page surface |
| Secondary | `#f1f5fc` | Quiet supporting surface |
| Muted foreground | `#52617a` | Secondary copy |
| Border | `#dee5f0` | Dividers and functional field borders |
| Page gutter | `clamp(20px, 5vw, 80px)` | Shared section edges |

English uses **DM Sans**. The legacy CSS variable is named `--font-poppins`, but the font loaded into it is DM Sans: do not install Poppins to match the variable name. Arabic uses **IBM Plex Sans Arabic**. Lora italic is limited to the journal masthead accent.

| Context | Current scale |
| --- | --- |
| Homepage H1 | `clamp(38px, 4.2vw, 56px)`, line-height 1.08; mobile `clamp(34px, 8.2vw, 42px)` |
| Marketing section H2 | `clamp(34px, 3.6vw, 52px)`, weight 500, line-height 1.1 |
| Inner-page title | `clamp(38px, 4.5vw, 66px)`; 38px on mobile |
| Wizard question | `clamp(28px, 2.6vw, 36px)`; 28px below 1024px |
| Account page title | 36px; 30px on phones |
| Body | Usually 16px; comfortable line height around 1.6 |
| Navigation | 14px, weight 500 |
| Form labels | 12–13px, visible above the input |
| Hero route names | 21px, weight 500; 17px on mobile, both names identical |

Use blue italic emphasis sparingly in marketing headings. Keep task questions direct and readable. Do not truncate important article titles or form instructions. The first large H1 rule in the stylesheet is historical: the smaller override is the approved homepage size.

## Layout recipes

### 1. Homepage

Source: [`app/page.tsx`](app/page.tsx), [`components/hero-section.tsx`](components/hero-section.tsx).

Desktop hero: centered 1280px inner area, two balanced columns, copy and starter on one side, large unboxed Globi on the other. Pale-blue background, white header. Mobile stacks the content with a compact Globi and usable fields; it must not create horizontal overflow.

Current section order:

1. Header and hero with application starter.
2. Popular destinations and photography.
3. **Your file, taken care of** with actual document previews.
4. Founder photo and quote.
5. Four-step application walkthrough.
6. Applying independently vs. using EZvisa comparison.
7. Compact mobile-app promotion.
8. FAQ with the documents Globi pose.
9. Footer.

The starter uses a container query: at 480px of available component width, two fields and the action sit on one row. Narrower containers stack. Preserve searchable inputs, keyboard interaction, clear buttons, flags, and the preparation-time qualifier. Do not turn it back into a large price card.

### 2. Public inner pages

Use [`components/inner-hero.tsx`](components/inner-hero.tsx) and the established `.ez-inner-*` styles. Parent/back navigation, one strong title, short description, optional useful action, and relevant Globi or destination photography. No arbitrary eyebrow badge on every section.

- About: company story, founder quote and real portrait.
- How it works: clear process, document examples, service boundaries.
- Destinations: searchable catalogue, country photos and flags. No repetitive “Schengen Visa” subtitle under each menu country; no redundant arrow beside every country-card name.
- Documents: open applicant-provided list next to a pale-blue “We prepare” list. Use large enough line icons, aligned rows and clear supporting text.
- Pricing: included service and separate costs clearly distinguished. Do not imply embassy fees or insurance are included.
- Contact: open contact rows plus useful form. No invented hours.
- Legal pages: quiet reading layout with policy navigation and clear active state.
- Tools: compact functional layout; available routes may remain even when the header entry is hidden.

Shared section spacing is roughly 90–100px desktop and 60px mobile, adjusted to content. Use open rows and purposeful columns; do not fill all whitespace with cards. Photography is welcome where it adds travel context or balances a genuinely empty composition.

### 3. Application wizard

Source: [`app/apply/page.tsx`](app/apply/page.tsx), [`components/apply/wizard-shell.tsx`](components/apply/wizard-shell.tsx), [`components/apply/wizard-bar.tsx`](components/apply/wizard-bar.tsx).

Desktop: full-height pale-blue Globi companion on the left, focused white form on the right. Extend the companion background to the viewport edge; do not leave a white strip at the left. Keep the form readable rather than stretching inputs across the entire screen.

Progress uses numbered circles joined by a line, completed checks, and `aria-current="step"`. Globi pose and helper copy respond to the current task. Mobile stacks the companion compactly and keeps actions reachable. Summary expands rather than taking over the page.

Use dropdowns for emirate selection. Keep nationality/destination flags. The user icon beside Need help opens in-place sign-in and profile completion; signing in must preserve the draft and enable saved-traveller selection. Choosing a traveller must not silently replace the selected trip.

The website wizard order is **Destination → Traveller → Review & pay**. Insurance is not collected in the wizard or checkout. Show its choice card only on the dashboard of a paid application, and place it after Preparation and before Ready in that dashboard’s lifecycle tracker. Save the insurance preference in `additional_notes.insurancePreference` as `quote` or `own`; preserve it when continuing an application. A quote request is a preference, not a purchased policy. Existing applications without a choice display “Preference not recorded”; do not infer cover from payment. POST `/api/insurance` verifies the signed-in owner and paid status, preserves the other notes, and refuses conflicting concurrent changes. Native/legacy clients may omit this optional field. This web-only add-on leaves the shared mobile service-price contract unchanged.

Separate the **wizard stepper** from the **application lifecycle tracker**. They represent different things and need distinct state mappings. Do not mark insurance purchased just because a quote was requested or payment for the visa service succeeded.

### 4. Customer workspace

Sources: [`components/dashboard`](components/dashboard), [`components/user-menu.tsx`](components/user-menu.tsx), [`lib/application-status.ts`](lib/application-status.ts).

A compact account header, case heading with flag/photo, clear next action, progress tracker, documents and side summary. Desktop uses a main column plus approximately 320px summary sidebar; below 1024px sidebar content follows the case, and small phones stack.

Progress circles and connectors reflect real application state. Current, complete and upcoming states must be distinct beyond color. Status is derived from the shared status helpers, not invented in presentation components. Preserve loading, empty, error, retry, unpaid and refused/cancelled states.

Account settings use a profile column and ruled settings sections. Keep auth feedback readable. Do not use marketing hero sizes inside a dashboard. Receipt and print layouts remain clean, with printable controls excluded from printed output.

### 5. Authentication

Sources: [`components/auth`](components/auth), [`lib/auth/account-details.ts`](lib/auth/account-details.ts).

Use the shared split layout, compact forms and contextual Globi. Name, date of birth, email and clear validation stay readable on phones. Age confirmation starts unchecked. Preserve both browser and server validation and the one-time social profile-completion path.

Tracking-page introductions always use “View all your applications” linking to `/dashboard`. Do not add a second “Sign in” prompt beneath the heading. The dashboard performs its normal authentication check; tracking tokens still grant access to one case only.

A real successful login is not proven by a demo. Do not request passwords in chat or expose provider secrets in the browser. Keep return paths inside the site and preserve wizard state on modal sign-in.

### 6. Blog and articles

Sources: [`components/blog`](components/blog), [`app/news`](app/news).

Editorial hierarchy: featured story, level photographs, complete titles and excerpts, restrained metadata. Category navigation is a horizontal ruled rail, not a collection of decorative pills. Story hover can gently scale the photo and turn the title blue.

Articles use a readable body around 17–18px with generous line height. Desktop sidebar groups **Table of contents** and **Start your application** below it in the same sticky region. On mobile, content remains in normal reading flow. Avoid duplicate bottom application boxes and overlap with the sticky header. Keep section anchors, working links and article metadata.

### 7. Mobile-app page

Sources: [`components/app`](components/app), [`app/app`](app/app).

Moderate phone-preview scale, short product explanations and a clear walkthrough. Do not restore decorative badges or a huge phone dominating the hero. App Store remains a placeholder until configured; do not invent publication status. Customer copy uses “payment gateway.”

## Reusable components and visual assets

| Need | Reuse |
| --- | --- |
| Globi video / contextual guide | [`components/globi/globi.tsx`](components/globi/globi.tsx) |
| Country flag | [`components/country-flag.tsx`](components/country-flag.tsx) |
| Searchable country selection | [`components/country-picker.tsx`](components/country-picker.tsx) |
| WhatsApp icon | [`components/icons/whatsapp-icon.tsx`](components/icons/whatsapp-icon.tsx) |
| Localized links / copy | `LocaleLink`, `LangText`, locale provider, message dictionaries |
| Founder | [`components/founder-message.tsx`](components/founder-message.tsx) |
| Site animation | [`components/site-motion.tsx`](components/site-motion.tsx) |
| Process illustration | [`components/how-it-works-simple.tsx`](components/how-it-works-simple.tsx) |
| Resume notice | [`components/continue-application-notification.tsx`](components/continue-application-notification.tsx) |
| Cookie consent | [`components/cookie-consent.tsx`](components/cookie-consent.tsx) |
| Travel photo | [`components/travel-photo.tsx`](components/travel-photo.tsx) |

Globi uses supplied transparent video assets from `public`. Reuse poses such as welcome, destination, passport, documents, checklist, calendar, shield, companion and celebrate where they suit the task. Play muted and inline, loop while visible, and pause offscreen for performance. Do not add visible pause controls. Keep artwork contained and unclipped; decorative circles must remain circular at every breakpoint.

If a new character pose is truly needed, the owner authorized preparing a prompt for Magnific. Preserve Globi's blue globe body, face, proportions and established materials. Do not substitute a generic mascot or use a still image as the main replacement for the requested video.

Use existing plane/flight-path artwork sparingly in open backgrounds, behind content and without intercepting pointer events. Preserve local document sample assets. New stock photos must be relevant and have suitable usage rights; do not remove a required credit without a licensed alternative.

## Components, interactions and accessibility

- Default primary actions may be pills; the homepage starter specifically uses **6px** corners. Do not apply a universal radius change to every control.
- Fields use white or pale-blue fill, useful borders, visible labels and adjacent error text. Generally 48–52px high; mobile text inputs should avoid browser auto-zoom.
- Icons inherit their surrounding text/action color. White text buttons need white icons; hover and disabled states must remain legible.
- Public active links and account active pills are separate classes. Keep `aria-current`, visible keyboard focus, semantic links and button labels.
- Country pickers support search, empty results, clear selection, arrows, Enter and Escape. Do not regress to an unstyled native select for this component.
- Use modest borders and selective shadows for floating surfaces. Avoid a card around every paragraph.
- Cookie consent is a compact lower-corner panel, with Reject optional and Accept all equally reachable, expandable preferences, and clearance above wizard actions.
- Dialogs need focus management, Escape dismissal and an accessible title. Dismissal should restore focus and retain form answers.
- Keep RTL behavior, logical spacing, mirrored directional arrows and isolated dates/amounts. Do not mirror country flags or brand marks.

## Motion

Motion belongs across the site, not only on the founder section. Use subtle entrance reveals, gentle image hover, step transitions and existing plane accents. Reuse the motion layer instead of introducing a second animation framework.

The homepage process has **one active index** shared by the scene, numbered steps and progress line. Desktop uses a stable pinned illustration beside the steps; mobile provides explicit controls. Avoid jumps, blank frames, overlapping scenes and repeated autoplay resets during scroll.

Respect reduced-motion preferences for nonessential CSS/Framer motion and keep all content visible without animation. Preserve Globi's owner-requested looping behavior; its offscreen pause is an optimization, not a visible control.

## Content rules

Use plain, specific language. Explain what happens next and what the customer needs to provide. Avoid inflated promises, generic filler, unverified approval claims, invented support hours or decorative labels that repeat the heading.

The service prepares documents; it does not guarantee a visa decision. Preparation timing is qualified by receipt of complete details/documents. Service fee, embassy fees and insurance must remain distinguishable. Use the existing currency helpers and server price rule rather than hard-coding a new total.

Update English and Arabic together. Legal source copy lives in `content/legal/*.md`; regenerate `lib/legal/content.generated.ts` with `node scripts/build-legal-content.mjs` after edits. Do not patch only the generated file.

## Safe continuation workflow

1. Read this guide, relevant component files, final CSS overrides and applicable skills.
2. Locate the source of the requested behavior before changing UI. Preserve routes, validation, saved drafts, auth and payment boundaries.
3. Implement the smallest coherent change using existing components. Do not rebuild unrelated pages.
4. Run `pnpm lint` (TypeScript) and appropriate tests. For shared contract changes, read [`docs/APP_WEB_SYNC.md`](docs/APP_WEB_SYNC.md) and verify both website and app. Fetch explicit current remote refs; do not trust a stale tracking branch.
5. Inspect the result in the browser: desktop and phone layout, selected/empty/error states as relevant, keyboard access and Arabic for changed copy/layout. Screenshots prove appearance, not real account/payment success.
6. Review `git diff`, commit only intended files, and follow the owner's release instruction. Git pushes to `main` trigger production deployment for `e-zvisa-anitgravity`.
7. Verify the deployment is READY and the intended domain points to it. Preserve `old.ezvisa.net` on the archive branch. Never overwrite the archive as part of a routine UI release.
8. Update this guide when an accepted design or flow changes. Report material verification gaps honestly.

Useful commands:

```sh
pnpm lint
pnpm test
pnpm build
node scripts/build-legal-content.mjs
node scripts/check-app-sync.mts --ref origin/mobile-app
```

## Operational boundaries for future agents

- Payments remain in **test mode** until the owner explicitly requests otherwise.
- The main-site launch was approved with email unresolved. At the last recorded check the transactional email API key was invalid; do not claim email delivery works without testing it.
- Owner-assisted real login, document upload/download and a completed test-payment round trip have not all been verified. Read the release note for the exact gaps.
- Do not reset production data, alter auth providers, change domain ownership, enable live payments or submit customer forms merely to review styling.
- App-native design guidance in `mobile/docs/design-system.md` does not supersede the website guide. The website and native app share business contracts but have distinct layouts.
