---
name: EZvisa
description: An open travel studio led by Globi and the original EZvisa blue.
colors:
  primary: "#0436dc"
  primary-hover: "#062db1"
  sky: "#edf4ff"
  ink: "#102347"
  paper: "#fff"
  secondary: "#f1f5fc"
  muted-foreground: "#52617a"
  border: "#dee5f0"
typography:
  display:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(70px, 7.5vw, 96px)"
    fontWeight: 600
    lineHeight: 0.97
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(34px, 3.6vw, 52px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  process-headline:
    fontSize: "clamp(40px, 4vw, 60px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  title:
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontSize: "13px"
    fontWeight: 500
  arabic:
    fontFamily: "IBM Plex Sans Arabic, DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
rounded:
  square: "0px"
  photograph: "4px"
  field: "6px"
  task-panel: "8px"
  wizard-field: "10px"
  pill: "999px"
spacing:
  compact: "12px"
  small: "16px"
  mobile-gutter: "20px"
  standard: "24px"
  large: "40px"
  section-mobile: "60px"
  section-desktop: "100px"
  page-gutter: "clamp(20px, 5vw, 80px)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  button-start:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 12px 10px 24px"
  button-start-hover:
    backgroundColor: "{colors.primary-hover}"
  starter-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "10px"
    padding: "14px 16px"
  wizard-field:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.wizard-field}"
    padding: "0 12px"
  task-panel:
    rounded: "{rounded.task-panel}"
  destination-frame:
    backgroundColor: "{colors.sky}"
    rounded: "{rounded.photograph}"
  process-panel:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
  button-inverse:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "15px 24px"
---

# Design System: EZvisa

## Overview

**Creative North Star: "An open travel studio"**

Globi makes the paperwork approachable, while the real documents establish credibility. The visual world is clean and lively: EZvisa’s original blue, pale blue fields, open white surfaces, supplied dimensional animation, destination photography, and actual document samples.

The character is an unboxed host beside useful actions. Marketing pages have generous space, expressive large type with italic emphasis, and lightly tilted destination photographs; application pages narrow the reading and input area while keeping a contextual Globi guide close to the next task. English and Arabic share the hierarchy with language-specific font treatment.

**Key Characteristics:**

- Original blue actions and a full blue process section against pale blue and white surfaces.
- Open, transparent Globi video with task-specific guidance.
- Expressive italic headings, uneven and lightly tilted destination photographs, and real document previews.
- Flat surfaces with visible focus and restrained state changes.

This records the revised system in `app/globals.css` beginning at the “open travel studio” block and including the “Travel personality”, “The journal”, and final “Inner pages” overrides, together with the implemented hero, destination, process, header, wizard, continuation, next-step, journal, article, shared inner-hero, catalogue, document, pricing, contact, legal, and travel-tool components. It describes the current light presentation; legacy dark-theme definitions are not a second approved visual direction.

## Colors

A concentrated original blue anchors cool, light surfaces and dark ink. The frontmatter owns the exact values.

### Primary

- **Original blue** (`primary`): primary actions, italic headline accents, linked text, selected-step strokes, caret, focus, and the full process-section background.
- **Deep action blue** (`primary-hover`): the homepage starter’s hover state; shared buttons instead use a black mix of primary in their existing variant.
- **Open sky** (`sky`): hero, FAQ, and quiet photo placeholders.

### Neutral

- **Ink** (`ink`): revised headings and body copy.
- **Paper** (`paper`): page background, fields, action text, and the inverse process-section headline and button.
- **Cool surface** (`secondary`): secondary semantic surface.
- **Quiet ink** (`muted-foreground`): supporting guidance and metadata.
- **Soft divider** (`border`): useful separation between rows and containers.

**The Original Blue Rule.** Use the original brand blue for primary actions, expressive headline emphasis, the process section, active indicators, links, and focus; let the supplied media provide other hues.

## Typography

**Display and body font:** DM Sans, with UI sans-serif fallbacks. The source variable is still named `--font-poppins`; `app/layout.tsx` loads DM Sans into it.

**Arabic font:** IBM Plex Sans Arabic for Arabic glyphs; Latin remains DM Sans. Arabic headings generally use medium weight; the final hero override uses weight 600 with 500 for its emphasized phrase. Hero/inner-page headlines retain their more-specific Arabic line height (1.2).

The shared face is friendly and legible. The hero combines a semibold opening line with a medium, blue italic phrase; destination and process headlines use lighter italic phrases. This emphasis adds personality while application questions keep their existing functional hierarchy.

### Hierarchy

- **Display:** the incumbent display token remains available for the established large-marketing hierarchy. The owner-approved homepage heading is now exactly “Your Schengen visa, made simple.” Its longer copy has a scoped final override of `clamp(38px, 4.2vw, 56px)` and line height 1.08, changing to `clamp(34px, 8.2vw, 42px)` at or below 767px. Its emphasized phrase remains original blue at weight 500 and italic. This copy-specific measure does not redefine the global display token.
- **Headline:** responsive section headings use the frontmatter headline role; mobile resolves to 34px. Destination emphasis is blue and italic at weight 400. The blue process section uses the process-headline role, resolving to 40px on mobile; its italic phrase is weight 400 and its text is white.
- **Title:** contextual Globi guidance uses the title role. Destination names are 23px on desktop and 20px on mobile, with medium weight and tight tracking.
- **Body:** the default is 16px from 768px and 15px below it. Hero copy is 17px with 1.65 line height and a 440px maximum width, reducing to 16px with 1.6 line height on mobile.
- **Label:** application labels use 13px medium text; starter labels and compact metadata use 12px. Site navigation is 14px medium.
- **Task question:** pre-payment wizard questions use `clamp(28px, 2.6vw, 36px)` at weight 500, line height 1.15, and −.03em tracking; below 1024px they use 28px. Continuation and other existing wizard contexts retain 22px/1.27 at weight 600, rising to 28px/1.2 from 768px. These are functional hierarchies distinct from marketing headings.

The journal extends this hierarchy locally without changing the shared typography tokens: its masthead base is `clamp(56px, 6.7vw, 92px)` at weight 500, line height 1.04, and −.04em tracking (60px on mobile). Lead-story titles use `clamp(28px, 2.8vw, 40px)` with line height 1.16; mobile uses 30px. Other story titles use 24px/1.3. Article titles use `clamp(34px, 4.5vw, 60px)` with line height 1.12. All titles remain complete, without line clamps. Reading text is 18px/1.85, reducing to 17px/1.8 on mobile; article section headings use 30px/1.25 (26px on mobile), and subheadings use 23px/1.35. These are editorial-context sizes rather than replacements for application typography. The journal masthead’s blue emphasized word uses Lora italic at weight 400, loaded through `next/font/google` into `--font-journal-serif` on the masthead only. Arabic emphasis explicitly uses IBM Plex Sans Arabic with normal font style. The masthead has no introductory eyebrow.

Inner-page titles use a scoped `clamp(38px, 4.5vw, 66px)` at weight 500 and line height 1.06, with 38px mobile titles. Functional tools use the smaller `clamp(34px, 4vw, 52px)` title measure. Their descriptions are 17px/1.75 with a 650px maximum width (16px on mobile); tool descriptions may extend to 780px. Legal titles use `clamp(36px, 4vw, 56px)` at weight 500 and line height 1.1. These component-context measures preserve the shared families and colors.

## Layout

Marketing sections center within a 1440px maximum width and use the fluid page gutter token. The hero uses a 1280px inner maximum, two equal columns, and a 40px gap. The starter is at most 540px wide with two country pickers above one full-width action. Below 480px, the pickers stack in one column. At 767px and below, its reading order is heading, copy, Globi, fields; gutters become 20px. The hero’s Globi area includes an angled introduction and a UAE-to-destination caption; on mobile the area is 250px high with 250px artwork.

Destination photographs form four uneven columns (`1.2fr 1fr 1fr 1fr`) with a 32px gap. Their differing heights, vertical offsets, and small rotations create the travel rhythm. Mobile uses two columns with a 22px horizontal and 34px vertical gap; retain the content order. Destination-section padding is 90px above/105px below on desktop and 65px above/75px below on mobile.

The process is a full-width original-blue section, with a headline/Globi/action column beside a two-by-two step grid. Desktop columns are `minmax(260px, .85fr) minmax(0, 1.3fr)` with a fluid 40–110px gap, overridden to 35px at or below 1100px. At or below 767px, the intro stacks above the two-column steps and section padding becomes 60px/20px. Tool links remain divided rows, collapsing from paired text columns to stacked text on mobile.

The pre-payment wizard uses a 1440px maximum split canvas: a pale-sky Globi guide at logical start and a white form at logical end, in .85fr / 1.15fr proportions. At 1024px and above, progress sits above the form; the question and inputs stay within 560px. Globi uses 300–360px transparent looping video, followed by contextual guidance and an expandable application summary. Country and total remain visible when collapsed. The guide is sticky; expanded details are a labelled, keyboard-focusable scroll region. Below 1024px, progress, a compact horizontal guide, summary, and form follow in document order; summary expansion stays in normal flow. Continue sits below the fields on desktop and in a fixed bottom bar on mobile. Step transitions use opacity only so the mobile bar retains the viewport as its containing block. Continuation pages retain their existing 1152px outer maximum, 560px form, 340px guide and 50px gap. The dashboard next-step pattern places a 145px Globi beside the action, reducing it to 92px on mobile.

Use logical start/end spacing and existing locale-aware navigation. Keep horizontal scrolling for long step lists instead of shrinking labels beyond readability.

The journal and articles share a centered 1280px shell using the existing fluid page gutters. Journal entry padding is 142px above and 96px below, reducing to 112px/64px on mobile. The lead story pairs photograph and copy in `1.35fr 1fr` columns with a fluid 28–64px gap. Its photograph has aspect ratio 1.38, becoming 1.5 when stacked below 768px. The story library uses three columns with 54px vertical/32px horizontal gaps; it changes to two columns at or below 1023px and one column with a 40px gap at or below 767px. Ordinary story images use a 3:2 aspect ratio.

Articles pair a reading column of at most 740px with a 220–280px contents sidebar and a 64px gap. Below 1024px, the reading column centers and the sidebar is hidden. Desktop contents stick 112px from the top and scroll within the remaining viewport. Cover photographs use aspect ratio 2.7, reducing to 1.5 on mobile. Use the existing photograph radius for story, cover, and reading images.

Public inner-page heroes use a transparent 1200px inner panel with 64px gaps and 130px top/64px bottom outer padding. Copy/Globi columns are `minmax(0,1.5fr) minmax(260px,1fr)`; country-photo variants use `minmax(0,1.3fr) minmax(0,1fr)`. At or below 767px, these become one column with a 24px gap and 110px/24px/40px outer padding. The plain tool variant omits the artwork column and shortens the space beneath the hero to 40px.

The public destination catalogue has a 1200px maximum outer width, 24px horizontal padding, and an even three-column grid with 32px horizontal/48px vertical gaps. Below 768px it has two columns with 20px/34px gaps, and below 480px it has one column. Document-country links follow the same three/two/one column progression as ruled text rows. These catalogue rules do not change the homepage’s uneven, tilted destination composition.

Legal pages pair a 230px sticky policy navigation column with a reading column up to 760px, separated by 70px inside a 1160px container. Navigation sticks 120px from the top. Below 768px, the article comes first and the policy list follows in normal flow. The funds tool uses `1.15fr 1fr` input/result columns with a 48px gap; its guidance uses `1fr 1.4fr`. Both stack below 768px with 32px gaps. Appointment guidance uses three columns, stacking at the same breakpoint. Tool-directory entries use icon, explanation, and supporting-detail columns; mobile keeps the icon beside stacked text.

## Elevation & Depth

The revised presentation is flat: white, sky, and original-blue fields, useful borders, open images, and no raised mascot frame. Marketing destination images and revised task panels have no box shadow. Shared buttons retain a fine inset edge, while input focus uses a soft ring. These interaction treatments are not ambient card elevation.

### Shadow Vocabulary

- **Wizard focus:** `0 0 0 3px rgba(4,54,220,0.12)` accompanies the primary-colored field border.
- **Shared primary button edge:** `inset 0 0 0 1px color-mix(in srgb,var(--primary) 72%,black)`; hover uses 64% primary.

**The Open Surface Rule.** Separate content with space, tonal fields, and useful dividers; keep the mascot unboxed.

## Shapes

Pill actions sit beside restrained rectangular content. Homepage country pickers use 10px corners and their popover menus use 12px corners; these are scoped control values. Wizard primary actions use the shared pill shape; revised dashboard panels use the task-panel radius. Existing wizard text inputs use the wizard-field radius. Destination photographs use the subtle photograph radius; service tabs and document preview regions remain square. The four destination links rotate by −2°, +2°, −1.5°, and +2° at rest. Circular geometry belongs to Globi and existing state indicators; it is not a reason to wrap whole content sections in decorative capsules.

The inner information hero introduces a scoped pale-sky silhouette behind transparent Globi artwork: an aspect-ratio-one ground with `50% 50% 44% 44%` corners, up to 360px on desktop and 190px on mobile. It has no border, shadow, padding, or surrounding card copy; it is a media ground rather than a new generic mascot-card style. Homepage and wizard Globi treatments stay unchanged. Inner country photographs use an asymmetric `8px 80px 8px 8px` crop, reducing to `5px 48px 5px 5px` on mobile. Public catalogue photographs use a modest 5px radius, and catalogue search uses 8px. These scoped values do not replace the shared radius scale.

## Components

### Buttons

Confident, direct actions. Shared primary and outline buttons use the frontmatter size and shape, 15px medium text, and a 150ms color/transform transition. The primary variant darkens with an 88% primary/black mix on hover; outline uses a neutral hover fill. Shared controls reduce to 98% scale while active, have a visible two-pixel focus ring and offset, and use half opacity when disabled. The homepage starter is at least 60px high, uses 16px medium text, and places a 20px blue SVG arrow inside a 38px white circle at the far end. Its padding is 10px vertically, 24px at logical start, and 12px at logical end; the circle mirrors the shared header action treatment. The arrow direction mirrors in RTL. Hover uses the existing deep action blue, and reduced-motion preference removes the background transition. Inside the wizard, inputs and selection buttons retain the smaller field radius; the main Continue/Pay action is a 54px pill with a trailing arrow. The process action is an inverse white pill with blue text and the frontmatter inverse padding; mobile uses 13px/18px padding and 14px text. It retains the global visible-focus outline without inventing a separate hover treatment.

Secondary controls use the existing quiet neutral fill; ghost controls gain that fill on hover. Plain blue links retain visible underlining where the revised component supplies it. Existing shared primary buttons and the homepage starter use white discs around trailing SVG arrows, with the larger starter circle sized for its taller action.

### Chips

Use compact pills or small badges for actual status. The continuation page’s payment-confirmation pill uses a ten-percent primary tint, primary text, 12px medium type, and 12px/4px padding. Status text must describe real state; it is not a decorative heading prefix.

### Cards / Containers

Destination cards are open image-and-caption links without a card background or border. Use cropped real photographs and a heading below the image. Hover scales the image to 1.04 over 600ms with `cubic-bezier(.2,.7,.2,1)`. Hover or keyboard focus straightens the whole link and raises it 6px over 300ms ease-out; a blue northeast SVG arrow sits beside the destination name. Reduced-motion preference removes both transitions and the link’s hovered/focused transform; the existing image hover scale remains instantaneous. Application panels use the task-panel radius and no shadow in the revised application view. Use the surrounding layout to establish their spacing rather than a new universal card padding.

### Inputs / Fields

The hero uses reusable searchable country pickers with persistent 12px labels, 15px selected text, 24px circular country artwork, and a chevron. An unselected field shows the globe SVG beside its placeholder. Trigger buttons use white fill, a thin divider-colored border, 10px corners, and 14px/16px padding; hover or open state turns the border blue, and the open chevron rotates 180 degrees. Truncated selected names retain the complete accessible label. Artwork is decorative beside the written country name; countries never rely on flag recognition alone.

The menu opens 8px from the trigger, aligns to logical start, and keeps 20px collision clearance. Its width is at least 300px or the trigger width, capped at viewport width minus 40px. It has 12px corners, a 52px search row with 16px input text, and an internally scrolling list bounded by 300px or available viewport height. Options are at least 46px high, with 24px circular flags, 14px text, 10px/12px padding, and 6px corners. The highlighted option uses sky and ink; the committed selection has a blue check. Search accepts the localized label and existing English/Arabic keywords. A localized empty-result message and a clear-selection row handle those states. The shared Radix/cmdk behavior provides keyboard search/selection, Escape dismissal, and focus return to the trigger; selecting closes the menu. Existing saved nationality/destination values and application query parameters remain the source of truth.

The menu inherits the existing popover’s white surface, fine border, and `0 8px 24px rgba(10,15,31,0.08)` overlay shadow. This is a scoped floating-control treatment, not a new card-elevation rule. Picker border and chevron transitions are 180ms; reduced-motion preference removes those transitions. Use logical alignment for Arabic and the existing country-art component with its fallbacks. The Côte d’Ivoire asset uses the bundled ASCII filename alias; this is asset compatibility rather than visual guidance. Existing wizard inputs use a thin border, white fill, 15px text, 12px horizontal padding, and the wizard-field radius. Focus changes their border to blue and adds the focus ring above. Existing generic inputs retain their own library variant; do not treat every inherited form value as a new global token. Keep visible labels and adjacent error messages.

### Navigation

The site header is white and flat with 14px medium navigation. The language switcher is absent from desktop and mobile header navigation by explicit user request; English and Arabic routes and locale support remain available. Application progress is a semantic ordered list of three stages with 13px labels (12px on small phones). The active numbered circle uses original blue and `aria-current="step"`; previous stages use checkmarks. The compact application summary expands with `aria-expanded` and `aria-controls` and is not sticky on mobile.

### Journal and articles

Editorial stories extend the open photograph-and-caption pattern with complete titles and excerpts followed by category, date, and reading-time metadata. The article header follows the same order; category labels do not precede titles. The full story is one real link. The lead story adds an underlined reading cue with an SVG arrow. Photography remains level in the journal, without the destination gallery’s rotations. Story-image hover scales to 1.025 over 500ms ease; reduced-motion preference removes both the transition and hover transform. Hover also changes the title to original blue. Keep the shared keyboard-focus outline.

Category navigation is a horizontally scrollable rail with thin top/bottom rules and 58px minimum-height links. Actual article categories determine its options; each link filters through the URL query. Blue text and a two-pixel underline mark the current category, with `aria-current="page"`. This is navigation, not a row of filled filter chips.

Article reading uses muted ink for paragraphs and dark ink for headings/strong text. Lists retain their markers; links are blue and underlined; block quotes have a two-pixel blue rule on the logical start side and 24px inset. Paragraphs have 22px bottom spacing. Section anchors reserve 110px above their targets. The desktop contents list uses native anchor links, 14px text, indented subheadings, and blue underlined hover/current states with `aria-current="location"`.

Tags remain plain wrapping text. Share controls and the application entry remain after the reading body; the latter uses a flat sky-colored surface and the photograph radius. Up to three same-category related stories reuse the editorial grid on article pages. The journal remains accessible from site navigation/footer; it is not repeated as a generic guide block at the end of service pages. Existing article copy and photography supply the content, with one locale-selected body per article.

### Public inner-page heroes

Use the existing shared inner hero with a real parent-navigation link above the title, descriptive copy, and optional actions. The explicit contextual pose map is: `/about` → welcome; `/contact` → companion; `/pricing` → shield; `/how-it-works` → checklist; `/destinations` → destination; `/documents` → documents; `/tools` → calendar; `/videos` → documents. Arabic-prefixed routes use the same map. Country destination and document pages retain their supplied country photography. An explicit pose can override the map; `variant="plain"` suppresses artwork for functional tools. No random photo or badge is rendered by this component.

### Public catalogue and document rows

Catalogue cards have a level 5:4 photograph with a 36px circular flag near the lower logical-start corner and a white four-pixel ring. The country name and blue directional arrow sit below the photograph; supporting copy, fee label, and application link remain separate and readable. The name uses 27px medium type. A thin rule separates the fee/action row. Image hover scales to 1.035 over 350ms ease; reduced motion removes its transition, while the existing instantaneous hover scale remains. This is a different component from the homepage’s tilted destination links.

The catalogue toolbar contains a live result count and a search field, with thin rules above and below. Search also serves the appointment directory. Its input is 15px within a white field with 14px/18px padding and a visible two-pixel blue `focus-within` outline offset three pixels. Placeholders use full-opacity muted ink. Empty catalogue results supply a clear-search action. Document-country links use ruled rows with 22px vertical padding; the document-responsibility split stays flat, with an open applicant side and a sky service side identified by a three-pixel blue top rule.

### Service-value surfaces and contact

Pricing’s included-service area, the contact-form region, and the funds result share a sky background and a three-pixel original-blue top rule. Separate pricing costs remain on a white surface with a thin divider-colored top rule. Pricing uses a seven-to-five desktop split and stacks on smaller screens; amounts have an explicit per-application basis beside them. Treat the current content audit as the source for the service boundary and preparation-time qualifier, rather than turning these layouts into claims of visa approval.

Contact channels are open divided rows beside the form. Fields retain visible labels, 48px text-input height, white fill, and the existing generic form interaction states. The full-opacity placeholder override applies to contact inputs/textarea, catalogue/appointment search, and inner-hero action inputs. Pending, error, and success states remain textually explicit. No support-hours promise belongs in the contact layout; the owner removed those hours across the interface and confirmation email.

### Legal navigation and planning tools

The legal policy list uses 14px text, horizontal rules, and blue semibold current-page text with `aria-current="page"`; shared focus remains visible. Render only the requested language’s legal article. This is reading/navigation styling, not a new legal-policy interpretation.

Functional calculators and the appointment guide use plain compact heroes. Funds country choices use flag-and-text buttons with 6px corners and `aria-pressed`; the selected choice uses sky fill with a blue border/text. Number inputs use 18px text and 14px padding. The sky result surface has 32px padding (26px on mobile), a blue `clamp(38px, 4vw, 54px)` amount, and separated explanatory text. Keep planning assumptions, indicative conversion, and unsupported-result states visible; do not style an estimate as a guaranteed requirement.

Appointment filters use actual provider choices, followed by ruled official-route links with country flags, provider metadata, and outward SVG arrows. The empty state explains the selected directory’s limits. Its three advisory sections stack on mobile. The app-store placeholder link remains `#` by owner instruction; a design preview must not imply an available download.

### Globi

The FAQ uses the transparent looping `documents` pose in place of the Eiffel Tower visual. Keep it unboxed beside the questions on desktop (maximum 440px, sticky at 96px). Below 1024px, place a compact 200px character above the question list. It reuses the shared video loading, looping and offscreen pause.

The signature component is the supplied transparent WebM video in a square, transparent container with `object-fit: contain`. It autoplays muted, loops, and plays inline. Playback pauses when it is outside the observed viewport. The welcome pose preloads immediately; other poses load when near the viewport. No visible playback button is shown, as requested by the owner.

The hero welcomes visitors with a small rotated italic Globi introduction, without a speech bubble or frame. Its UAE journey caption updates from the actual selected destination and links to that country’s existing page; its live region announces the change. This is a selection-based interface detail, not a claim about an applicant’s travel history. The blue process section uses the looping checklist pose at 280px on desktop and 170px on mobile.

Use the welcome pose for the hero and task-specific poses for destination, traveller, review, trip, passport, spouse, and employment guidance. The pre-payment desktop guide uses 300–360px artwork with text beneath; below 1024px it uses 120px artwork beside guidance, reducing to 88px on small phones. Other guide contexts retain their existing sizes. The current dashboard implementation omits Globi for cancelled/rejected states. Keep the transparent artwork unframed; do not substitute an opaque video box or still image.

## Do's and Don'ts

### Homepage flight artwork

Reuse the original transparent `flight-path-2.png` as a static background accent in the documents, blue process, and FAQ sections. Place it in open margins or behind Globi at low opacity (8–16%), with a white treatment on blue. Scale and reposition for mobile and mirror in Arabic. Keep it clipped to each section, behind content, and non-interactive; do not repeat it across every section.

### Do:

- **Do** keep Globi as supplied transparent video, autoplaying muted and looping, without a visible playback control.
- **Do** use the contextual Globi pose and guidance beside the current application task.
- **Do** use real destination photographs and document samples for their respective content.
- **Do** preserve visible keyboard focus, readable labels, and English/Arabic direction support.
- **Do** use blue for the primary next action and make fees and progress readable.

### Don't:

- **Don’t** replace Globi with a still image, generated substitute, decorative card, or photo hero.
- **Don’t** add decorative eyebrows, mascot speech bubbles, gradients, or shadows to the revised hero.
- **Don’t** turn inherited card shadows or duplicate neutral colors into defaults for new surfaces.
- **Don’t** use color alone to identify the active application step or selected choice.

Implementation drift, not canonized: old near-duplicate wizard neutrals and generic card shadows, and browser theme-color that differs from the original blue remain in source. The old font variable/comment naming also says Poppins although DM Sans is loaded. The later source-floor scan also reports inherited header-menu shadow color syntax and 11px text advisories; those untouched details are not new system tokens. These are compatibility/history observations, not rules for new screens; this documentation pass does not repair implementation.

Extension evidence — 29 October 2026: merged the authorized inner-page direction and content audit from `.design-review/inner-direction.md` and `.design-review/inner-content-review.md`, current inner-page source, and representative `inner-pricing-desktop.jpg` / `inner-catalog-desktop.jpg` captures. Colors follow CSS rather than the disclosed capture color cast. The only scoped review correction was the placeholder contrast override. The final reviewer accepted all three replacement captures and returned ship with no remaining material fixes; review evidence is tracked in `.design-review/inner-review.md`. Existing global token frontmatter was preserved byte-for-byte.

### Site-wide motion — 29 October 2026

Public pages share an opt-in entrance system: short 16px rises for headings and cards, quiet fades for Globi and FAQ rows, and a shallow clip reveal for inner-page photography. Entrances run once per element per route visit, use exponential ease-out, and last 420–700ms. Card groups stagger by 60ms with a 180ms maximum delay. The homepage, shared inner heroes, destination catalogue, planning links, and journal participate; founder motion and existing document-preview/wizard transitions retain their own implementations.

Content is visible in server-rendered markup and without JavaScript. A single observer registers streamed and newly filtered content; no page wrapper or scroll-position state is added. Focus cancels a running entrance so controls remain immediate. Reduced-motion preferences skip entrances and cancel active ones. Directional link arrows move 3–4px on pointer hover, mirror in Arabic, and preserve existing SVG rotations. FAQ expansion respects reduced motion. Globi keeps its existing transparent autoplay loops.

Verification: production build and deferred-script checks passed. Browser inspection confirmed destination cards transition from opacity .4 / 16px translation to opacity 1 / no translation; FAQ expands; journal category navigation updates from ten to three stories; 390px journal has no horizontal overflow. Shared how-it-works route and journal/home checks reported no browser console errors. Screenshots: `.design-review/site-motion-destinations.jpg` and `.design-review/site-motion-mobile.jpg`.

### Restored four-step walkthrough — 29 October 2026

The homepage’s former blue process block is replaced by a white editorial walkthrough after the founder message. This supersedes the earlier blue process layout guidance. A two-line heading with blue italic emphasis links to the full process. The left sky surface contains a supplied looping Globi pose and an illustrative application preview; the right column holds four numbered, connected step buttons with readable descriptions. The original blue marks the selected number. The preview shows nationality/destination, the service fee, the five prepared documents, or appointment preparation; it does not accept application data or process payment. Preparation time is qualified by receipt of complete details and documents.

Selecting a step changes the preview and contextual Globi pose, with a short 180ms fade/8px transition and a reduced-motion alternative. Native buttons use aria-pressed and point to the labelled preview region. On phones, four compact controls above the preview replace the long selectable timeline; the selected explanation and real application link remain below. The founder retains its position immediately after the document-service section.

Verification: production build and deferred-script checks passed. All four previews checked on desktop, including keyboard activation; English and Arabic phone layouts checked at 390px without horizontal overflow. Browser console reported no errors. Captures: `.design-review/walkthrough-desktop.jpg`, `.design-review/walkthrough-mobile.jpg`.

### Customer workspace extension — 29 October 2026

Account access and operational pages continue the open travel studio: original-blue actions, sky guidance, white task surfaces, supplied transparent looping Globi, and the existing English/Arabic font families. These are scoped component patterns, not replacements for the global tokens.

Login, signup, recovery, and reset share a full-height split layout: a sky welcome/recovery panel beside a white form, in .94fr / 1fr columns. The form stays within 410px; controls are at least 52px high, and sign-in method tabs use an underline. Below 1024px the brand panel is hidden and the compact logo remains beside the home link. At 639px and below, horizontal gutters are 20px and form headings reduce from 36px to 30px. The recovery guide uses the shield pose; other account-entry screens use welcome.

Dashboard and tracking put destination, current next action, and document rows in the main column, with a 292px summary/support sidebar and a 32px gap. The sky next-action surface holds contextual Globi at 190px, superseding the earlier 145px dashboard measure. Below 1024px the sidebar follows in two columns; at 639px and below it stacks, and the next action places a 140px-wide character above its content. Cancelled/rejected states continue to omit Globi. Account settings use a 1104px maximum shell with a 280px profile column, a 64px column gap, and white settings sections separated by rules. Below 1024px the profile column is 240px with a 32px gap; at 639px and below the layout becomes one column. Account and customer page titles use 36px/1.2, reducing to 30px on phones.

Appointment entry pairs a 380px sky guide with the form and a 64px gap. At 767px and below it stacks with a 24px gap; the guide becomes a compact 96px character beside text. Revised operational panels use the existing task-panel corners and flat borders. The dossier retains white paper with 4px corners and a sticky toolbar that wraps its print, download, and support actions without removing keyboard access; the toolbar is hidden in print. Arabic application creation reads “طلب جديد”. Existing forms, state-dependent actions, and validation remain the source of functional behavior.

Evidence and preservation notes are in `.design-review/customer-documentation.md`; this extension leaves the incumbent frontmatter and sidecar untouched.

### Cookie consent refinement — 29 October 2026

Cookie consent uses a compact non-modal white panel at the lower inline-start edge (420px desktop; 12px side gutters on phones), with a soft offset shadow, original-blue actions and a quiet sky footer. The brief notice expands into ruled preference rows with labelled native checkbox switches; necessary cookies show “Always on.” Reject optional and Accept all remain directly available, with a separate full-width save action in preferences. The heading receives focus on expansion, and Back restores focus to Manage preferences. RTL mirrors the panel and switches. Short screens scroll the preference rows while actions stay visible; the panel retains the measured clearance above the wizard bar. Existing consent storage, categories, expiry and script gating remain unchanged.

### Saved application entry — 29 October 2026

Returning visitors with an unfinished browser draft see a white bordered resume box before the homepage application starter. It identifies the destination with its flag and offers one original-blue Continue application action; the copy explicitly says the draft is saved on this device. Mobile places it after Globi and before the starter, with Arabic direction and localized links. Other public pages use a dismissible lower-end reminder, hidden while cookie consent is open and excluded from account, wizard and payment flows. Dismissing that reminder lasts for the browser session and does not remove the homepage entry. Empty and nationality-only prefilled forms do not produce a reminder.

Continue restores saved answers directly and returns to the saved wizard step. Ordinary application entry retains its existing restore/start-again choice. Starting afresh or confirmed payment clears the saved step together with the draft. Verification: production build, deferred-script checks, TypeScript and three focused draft/route tests pass. Browser checks cover direct restoration to Traveller with the saved France destination, desktop and 390px mobile, Arabic layout, cookie coexistence and dismissal. Captures: `.design-review/resume-desktop.jpg`, `.design-review/resume-mobile.jpg`.

### Four-step application story (October 29)
The homepage walkthrough uses a single pinned illustration beside four scroll-linked steps on desktop. Its scenes show the destination form, an itemized payment preview, real sample documents fanning into a file, and France with a file-ready message. The preview has a stable height and brief overlapping transitions; scroll position, numbered steps and illustration share one active index. Mobile uses four explicit step controls with one matching description. Reduced-motion users retain immediate state changes without the sheet animation. The service copy, separate embassy fees and embassy decision disclaimer remain intact.

### WhatsApp icon

Always use the shared `WhatsAppIcon` from `components/icons/whatsapp-icon.tsx` for WhatsApp links, buttons, contact labels and support features. Do not use generic chat bubbles or duplicate SVGs. Keep the icon decorative (`aria-hidden`) with a readable label; inherit the surrounding link color.
