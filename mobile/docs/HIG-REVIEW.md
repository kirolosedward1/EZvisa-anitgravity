# Design review: EZvisa app (HIG pass, 2026-10-24)

Reviewed and fixed with two agent skills installed in this repo: **apple-design** (Apple's Human Interface Guidelines,
123 pages pulled from developer.apple.com) and **swiftui-pro** (Paul Hudson's SwiftUI reviewer). The app is React
Native (Expo Router, SDK 58) with no Swift code, so swiftui-pro's code rules (deprecated SwiftUI APIs, property
wrappers, Swift concurrency) do not apply. Its design, accessibility, localization and resizability references do,
and they are cited below as `swiftui-pro › <file>`. HIG citations are `<page>.md › <heading>`.

Before/after screenshots (web build at 390 pt, mock backend, default text and 2× text): `docs/screenshots/hig-review/`.

## Summary

Rating before: **Critical issues**. After this pass: **Good**, pending the device checks listed at the end.

The app's thesis is clear and right for the product: one calm task per screen, real case state, and a single brand
blue. Its signature is the Liquid Glass tab bar and the photo-led country screens. The foundations had drifted from
the platform, though. The type scale ran 2 pt under Apple's text styles, so body copy was 15 pt and the smallest text
10 pt. At large text sizes, page titles ended up the same size as body text. The tab bar mixed an action in with the
tabs and hid its labels. A claim on the country screen contradicted the owner's refund policy.

## Critical (fixed)

- **Type below Apple's sizes, and a 10 pt minimum.**
  - What: body 15 pt, subhead 13, footnote 12, caption 11, caption2 10 pt (`theme/typography.ts`), against Apple's
    17 / 15 / 13 / 12 / 11. The design-system doc claimed Apple's sizes, but the code had a "refined" smaller scale.
  - Why: `accessibility.md › Vision`: "Use recommended defaults for custom type sizes", with iOS default 17 pt and
    minimum 11 pt. `typography.md › Specifications › Large (default)` lists the sizes.
  - Fix: the scale is now Apple's text styles at the default size. Manual letter spacing is gone on native, because
    SF tracks itself (`typography.md › Using system fonts › "adjust tracking in interface mockups"`). Web keeps it.

- **Hierarchy collapsed at large text, and caption2 never scaled.**
  - What: `TYPE_SCALE` capped titles at 1.3–1.4× and body at 2×. At 2× text, large titles were 35 pt and body text
    30 pt. `caption2` was capped at 1×.
  - Why: `typography.md › Conveying hierarchy`: "maintain the relative hierarchy and visual distinction of text
    elements when people adjust text sizes". `accessibility.md › Vision`: "enlarge text by at least 200 percent".
  - Fix: reading text reaches 2×, and titles reach 1.75–2× (Apple's AX5 table grows Large Title 1.76×). Only
    deliberately fixed labels opt out, with their own cap: tab labels, avatar initials, the A–Z index, Home stories.
    The web preview's large-text simulation now honours those caps too (`components/ui/Text.tsx`).

- **Discard on the Applications list was gesture-only and hidden from VoiceOver.**
  - What: a discardable card had no visible control. Discard was a swipe or long press, and the trash button was
    removed from the accessibility tree at rest. Those cards also lost their chevron.
  - Why: `accessibility.md › Mobility`: "Offer alternatives to gestures… also make a button available".
  - Fix: each card exposes a "Discard" accessibility action (VoiceOver rotor, Switch Control, Voice Control). Every
    card now shows its chevron at rest (`app/(tabs)/applications/index.tsx`).

- **A money-back promise the business doesn't make.**
  - What: the country footer said "Money back if the visa is refused", and the "At a glance" EZvisa row repeated it.
  - Why: the root `CLAUDE.md` (owner-confirmed 2026-10-23) says there is no money-back guarantee and a refusal is not
    refunded. `design-principles.md` › Responsibility: act in people's best interest.
  - Fix: both claims are removed. The glance row now says what is included ("We prepare your file and a visa
    specialist checks your documents."), and `PRODUCT.md` matches the owner's facts.

## Improvements (fixed)

- **High · A tab bar that acted.**
  - The centre "+" button started an application.
  - Why: `tab-bars.md › Best practices`: "Use a tab bar to support navigation, not to provide actions."
    `swiftui-pro › resizability.md` says the same of `TabView`.
  - Fix: the "+" is removed. "New application" is now a toolbar button on Applications. Home shows a Start
    application button to guests, and the empty account card keeps its own button.

- **High · Tabs had no labels.**
  - Why: `tab-bars.md › Best practices`: "Include tab labels to help with navigation."
  - Fix: each tab is an icon over a single-word label, at a fixed size as on iOS. The selection is a capsule around
    both, with plain fill instead of glass on glass (`liquid-glass.md › Review checklist › Restraint`). Arabic
    labels fit and mirror.

- **High · The tab bar disappeared on every pushed screen.**
  - Why: `tab-bars.md › Best practices`: "Make sure the tab bar is visible when people navigate to different
    sections… The exception is when a modal view covers the tab bar."
  - Fix: the bar now hides only for the keyboard and modal screens. The country screen's footer sits above it via
    `useTabBarTop()`. The other detail screens already padded for the bar.

- **High · Large text truncated list rows and crowded titles.**
  - What: "Receipt · EZ-…" became "Recei…". The Countries view toggle and the Applications "+" collided with their
    titles, and grid cards split names mid-word ("Germa-ny").
  - Why: `typography.md › Supporting Dynamic Type`: "Keep text truncation to a minimum", "consider using a stacked
    layout", and "Reduce the number of columns when the font size increases".
  - Fix: at large sizes `ListRow` stacks its value under the title, grids drop to one column, and toolbar buttons
    move above the large title.

- **Medium · Icons stayed tiny next to doubled text.**
  - Why: `typography.md › Supporting Dynamic Type`: "Increase the size of meaningful interface icons as font size
    increases."
  - Fix: `useContentScale()` grows chevrons, icon tiles and the status timeline dots (capped at 1.5×). The dots stay
    centred on their labels.

- **Medium · Welcome assumed a tall phone.**
  - Why: `swiftui-pro › resizability.md › Choosing layouts`: "Give screens that assume everything fits, such as
    account setup… scrolling". iPhone Duo's outer display is wide and short.
  - Fix: Welcome scrolls, and the flag ring is sized from both width and height.

- **Medium · Untranslated accessibility labels and alerts.**
  - What: "Notifications, n unread", "Sign in", "Loading", "Section index", "Unread", "Select date", "Step x of y",
    "Tip:", the payment alert, and the document-type sheet were English in Arabic.
  - Why: `swiftui-pro › localization.md`.
  - Fix: all of these go through `t()`. Eleven new keys are in `lib/ar.ts`, and every key in the touched files is
    covered.

- **Medium · One colour, two meanings.**
  - What: the Notifications row used a red tile, while red means delete or discard everywhere else.
  - Why: `color.md › Best practices`: "Avoid using the same color to mean different things."
  - Fix: the row uses the neutral tile.

- **Medium · Private palettes instead of tokens.**
  - What: the trip calendar, the trip-length chips and the payment-stall buttons hard-coded brand hex values.
  - Why: `color.md › System colors`: "Avoid hard-coding system color values". `swiftui-pro › design.md`: "Prefer to
    place standard fonts, sizes, colors… into a shared enum of constants".
  - Fix: they read theme tokens. Two new tokens cover them: `accentMuted` for the range fill and `textDisabled` for
    past days.

- **Medium · An invisible progress track.**
  - What: the wizard's progress track was white on the off-white canvas, at 1.05:1.
  - Fix: the track uses the neutral fill, and the progress spring respects Reduce Motion (`accessibility.md ›
    Cognitive`).

- **Medium · Grouping on the application page.**
  - What: WhatsApp appeared three times (header Help, the Trip group, an unlabelled bottom group), and payments and
    support shared one unlabelled group.
  - Why: `layout.md › Visual hierarchy`: "Group related items".
  - Fix: the Trip group is only about the trip. Separate "Payments" and "Support" groups follow, and a footer says
    the reference is added to the message.

- **Low · Small view toggles.**
  - Countries' list/grid toggle was 36×30 pt. It is now 44×36 with vertical hit slop (`accessibility.md › Mobility`:
    44×44 default). Notification titles wrap to two lines instead of truncating at one.

- **Low · Unused in-app appearance switch.**
  - Account still defined a System/Light/Dark control, although it was never rendered.
  - Why: `dark-mode.md`: "Avoid offering an app-specific appearance setting."
  - Fix: the control is deleted.

## Craft notes

- **Medium · Structure that said nothing.**
  - What: every country card carried "STAY · 90 DAYS", which is identical for all 29 countries, in letter-spaced
    capitals over the photo.
  - Fix: the line is removed, and the country screen states the limit once, under At a glance. Names are title case.
    White on the darkest part of the fade is at least 4.7:1 even over a white sky.
- **Point of view:** keep it. The photo-led country screens and the glass tab bar are distinctive without fighting the
  platform. The palette stays one brand blue over neutrals, which `branding.md` and `color.md › Liquid Glass color`
  endorse for mostly monochrome content.

## What works (keep)

- One question per screen, with questions as titles, autosave and resume.
- Real statuses only, and a timeline that never invents dates.
- Inset-grouped lists and native date pickers.
- Reduce Motion fallbacks on every spring, haptics limited to primary actions and selection, and full RTL.
- The two-step account deletion: `accessibility.md › Cognitive` asks for confirmation twice for hard-to-undo actions.
- Guest checkout before sign-in, which follows `onboarding.md`: "delay sign-in".

## Platform notes and decisions left as they are

- **Dark mode stays off** (`PRODUCT.md`: "Dark mode is dropped for now"). `dark-mode.md` asks apps to look good in
  both appearances, so this is a known gap, not a choice the HIG endorses. The dark palette exists in
  `theme/colors.ts`, and re-enabling it means testing every screen in dark.
- **Custom tab bar, not the native one.** Expo Router's native tabs give the real system bar, including iPhone Duo's
  vertical bar. In SDK 58 they are still `unstable-native-tabs`, so the custom bar stays, using the native Liquid
  Glass view on iOS 26+. Revisit when native tabs are stable (`swiftui-pro › resizability.md › Tab bars and toolbars`).
- **Custom `Sheet`.** It has a grabber, drag to dismiss, a close button and a backdrop, which covers `sheets.md`. A
  system form sheet would also adapt around iPhone Duo's fold.
- **Android mirrors the iOS design** by product decision. `liquid-glass.md › React Native` notes that glass is costly
  on Android, which already uses an opaque fill.
- **Field labels in Title Case** ("Phone Number", "Email Address") stay as they are, because English strings follow
  the website's wording and are the Arabic dictionary's keys.

## Not verified here

- Checks covered the web build only: TypeScript, Expo lint (0 errors, 119 warnings, down from 129), the web
  navigation suite (all pass), the timeline check (all pass), and screenshots at default and 2× text, plus Arabic.
- Two existing checks were already broken on the base branch: `scripts/wizard-rules.test.ts` has a stale import, and
  `scripts/country-check.ts` reads website files. Neither file was touched.
- Still to check on an iPhone: native Liquid Glass and the tab selection drag, VoiceOver order and the new Discard
  action, real Dynamic Type at AX sizes, Reduce Transparency, iPhone Duo's outer display, and the larger type in the
  wizard with the keyboard up.
