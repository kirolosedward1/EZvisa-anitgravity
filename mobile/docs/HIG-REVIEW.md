# Design pass: EZvisa app (2026-10-24)

A review of the app against the **apple-design** skill (Apple's Human Interface Guidelines) and the **swiftui-pro**
skill. The app is React Native, so swiftui-pro's Swift code rules don't apply; its design, accessibility,
localization and layout rules do. Citations are `<page>.md › <heading>`.

**Owner direction (2026-10-24):** keep the original font sizes and the original tab bar, and enhance the design
within the existing style. A first version raised the type scale to Apple's defaults and rebuilt the tab bar with
labels and no centre action. Both were reverted, and those files match `mobile-app` again.

Before/after screenshots (web build, 390 pt wide, mock backend): `docs/screenshots/hig-review/`.

## What changed on screen

- **One card style.**
  - What: the Home status card, its error and empty-state cards, the FAQ and the status hero card had no hairline,
    unlike every other card.
  - Fix: they use the shared `card()` surface: white with a hairline and the same radius.
  - Why: `layout.md › Visual hierarchy` (group related items consistently).
- **One search field.**
  - What: Home had a grey search bar, Countries a white bordered field, and the wizard a white pill.
  - Fix: a new `SearchField` in `components/ui` uses Home's look, the iOS search-bar style, with a clear button.
    Countries and the wizard's country lists use it.
- **Matching country headers.**
  - What: the application page stacked the flag over the title, while Home's hero puts the title left and the flag
    right.
  - Fix: the application page now uses Home's layout, with the status pill and reference under the title.
- **Brand-tinted avatars.**
  - Fix: initials sit on the soft brand tint instead of grey, and Account shows the email under the name.
  - Why: `branding.md`: brand colour used quietly.
- **Country cards.**
  - What: every card repeated "STAY · 90 DAYS", which is the same for all 29 countries, in letter-spaced capitals.
  - Fix: the cards now show the flag and the name. The 90-day rule is stated once, on the country screen.
- **Application page grouping.**
  - What: WhatsApp appeared three times.
  - Fix: there is one labelled Support group, and payments have their own group (`layout.md › Visual hierarchy`).
- **Colour meaning.**
  - What: the Notifications row used the destructive red tile.
  - Fix: it is now neutral (`color.md › Best practices`: "Avoid using the same color to mean different things").
- **Tokens instead of hex values.**
  - What: the trip calendar, the trip-length chips and the payment-stall buttons hard-coded colours.
  - Fix: they read theme tokens, including the new `accentMuted` and `textDisabled`. The wizard's progress track,
    which was white on near-white at 1.05:1, is now visible.
- **Guest Home.**
  - Fix: a "Start application" button shows under "Where to next?". The tab bar's "+" is unchanged.

## Content

- **Removed both "Money back if the visa is refused" claims** (country footer, At a glance). The root `CLAUDE.md`
  (owner-confirmed 2026-10-23) says there is no money-back guarantee and that a refusal is not refunded.
- The glance row now says what is included: "We prepare your file and a visa specialist checks your documents."
- `PRODUCT.md` matches the owner's facts.

## Accessibility (no visual change at the default text size)

- **Discard:** on the Applications list it was swipe or long-press only and hidden from VoiceOver. It now has an
  accessibility action, and the cards keep their chevron (`accessibility.md › Mobility`: "Offer alternatives to
  gestures").
- **Translations:** labels, alerts and pickers that were English-only go through `t()`, with 11 new Arabic strings
  (`swiftui-pro › localization.md`).
- **When someone turns up the text size in iPhone settings:**
  - list rows stack their value under the title;
  - photo grids drop to one column;
  - chevrons, icon tiles and timeline dots grow with the text;
  - avatar initials stay inside their circle (`typography.md › Supporting Dynamic Type`).
- **Welcome** scrolls and sizes its flag ring to the window, so short or wide screens such as iPhone Duo's outer
  display keep the buttons visible (`swiftui-pro › resizability.md`).
- **View toggle:** the Countries list/grid targets are 44 pt wide (`accessibility.md › Mobility`).

## Kept as they are, by decision

- Font sizes stay at the app's own scale, which is smaller than Apple's defaults (body 15 pt against 17 pt).
- The tab bar: icon-only tabs with the centre "+", hidden on detail screens. `tab-bars.md` asks for labels, no
  actions in the bar, and a bar that stays visible. This is a known difference from the HIG, kept on purpose.
- Dark mode stays off, per `PRODUCT.md`.

## Checks

- **Passed:**
  - TypeScript.
  - Expo lint: 0 errors, 125 warnings (129 on `mobile-app`).
  - The web navigation suite and the timeline check.
- **Already broken on `mobile-app`:** `scripts/wizard-rules.test.ts` (stale import) and `scripts/country-check.ts`
  (reads website files). Neither file is touched here.
- **Not checked on an iPhone:** VoiceOver and the new Discard action, real Dynamic Type sizes, and iPhone Duo.
