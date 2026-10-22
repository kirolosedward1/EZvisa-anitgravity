# EZvisa Mobile: Ground-up UI Overhaul Plan

Status: PLAN ONLY. No code has been changed. Target: Expo Go SDK 57 (iOS first, Android and web degrade gracefully).
Keep: the logo, all Supabase wiring (lib/data.ts, auth.tsx, google.ts, push.ts), minimal text with no sales copy, and email plus Google login.

---

## 0. Honest critique of the current screens (v3 screenshots and code)

1. **Generic, not designed.** The layouts are default Android-ish or web-ish. The screenshots render Roboto and web inputs, but even the iOS code uses ad-hoc font sizes (`largeTitle` 32/800) rather than the Apple type ramp. Nothing is memorable.
2. **No hierarchy rhythm.** Home is one H1, a giant blue button, and a carousel, followed by ~40% empty screen. Country detail is half photo and half void. Spacing values vary (16/20/24/96) with no grid.
3. **Photos do all the work and look cheap.** Low-resolution, over-saturated stock photos are used as list thumbnails (Countries), cards (Home) and headers. They compete with each other and with the brand blue. There is no consistent crop, ratio or overlay.
4. **The accent is overused.** A full-width saturated #0436DC button sits on every screen. The selected-country border, tab tint and links are all the same heavy blue, so nothing reads as primary.
5. **Lists aren't iOS lists.** Countries has a duplicate search (an icon plus a field), separators that don't align with text, a missing index scrubber, and rows that are 64pt tall with 56pt photos (too heavy).
6. **Apply feels like a web form.** HTML date inputs (on web), chips that look like tags, the weather card competing with the form, and a "Continue" button floating over the content with a 96px hack.
7. **Navigation is generic.** There are 4 equal tabs. "Apply", the single most important action, is just a tab, with no sheet presentation and no motion or haptics on key moments.
8. **Account and detail screens** were restyled last and still mix old Section styles. Status has no visual timeline. Upload has no progress indicator.
9. **Dark mode** is an inverted afterthought: pure black, with a lighter accent applied inconsistently and no elevation layering.
10. **No motion system.** There are no shared transitions, press states are web-like opacity changes, and there are no skeletons (spinners only).

Verdict: the problem isn't a lack of polish. The app lacks a system. The fix is a design-token foundation, native navigation chrome, flags instead of photos for identity, and one hero action.

---

## 1. Design direction

**References**
- **Apple iOS 26** (Wallet, Settings, Weather): grouped inset lists, large titles, Liquid Glass chrome, SF Symbols.
- **Airbnb 2025**: calm white canvas, one confident photo per screen at most, soft 16–24 radii, bottom sheet flows.
- **Revolut**: bold numeric typography, a single floating primary action, dense but quiet lists.
- **Wise**: flags as country identity, a clear step progress bar, honest status timelines.

**Principles**
- Chrome is native, content is calm.
- Flags identify a country; photos appear only once, as a hero on the country detail screen.
- One accent action per screen; everything else is neutral.

**Type scale** (iOS uses the system font (SF Pro). Android and web use system-ui. Sizes in pt, with line height and tracking.)

| Token | Size/LH | Weight | Tracking | Use |
|---|---|---|---|---|
| display | 40/44 | 700 | -0.8 | Home greeting, status hero |
| largeTitle | 34/41 | 700 | -0.4 | native large titles |
| title1 | 28/34 | 700 | -0.4 | sheet titles |
| title2 | 22/28 | 600 | -0.3 | section heroes |
| title3 | 20/25 | 600 | -0.2 | card titles |
| headline | 17/22 | 600 | -0.4 | row titles (emphasis) |
| body | 17/22 | 400 | -0.4 | row titles, inputs |
| callout | 16/21 | 400 | -0.3 | descriptions |
| subhead | 15/20 | 400 | -0.2 | secondary row text |
| footnote | 13/18 | 400 | -0.1 | section headers and footers |
| caption | 12/16 | 500 | 0 | tab labels, meta |

- Numbers (temperatures, prices, references) use `fontVariant: ['tabular-nums']`.
- Respect Dynamic Type via `allowFontScaling` and a `maxFontSizeMultiplier` of 1.4 on chrome.

**Spacing grid:** 4pt base. Tokens are 4, 8, 12, 16, 20, 24, 32, 40, 56.
- Screen side inset is 16 (20 for grouped lists, matching iOS insetGrouped).
- Section gap is 32; the gap from a header to its card is 8.
- Remove all magic numbers (for example the 96 padding hack).

**Colour usage**
- Light surfaces: `bg` #F2F2F7 (grouped) or #FFFFFF (plain); `surface` #FFFFFF; `surface2` #F7F7FA.
- Dark surfaces: bg #000000, surface #1C1C1E, surface2 #2C2C2E, with layered elevation via lighter surfaces rather than shadows.
- Text: label, secondaryLabel (60%), tertiaryLabel (30%), separator (iOS system values). On iOS, use `PlatformColor('label')` and similar so they adapt automatically.
- **Accent:** brand blue #0436DC (dark mode #5C7CFF). It is used only for the primary action, the selected tab and the step progress bar. Links use the accent at body weight.
- Status semantic colours appear as small tinted pills only (12% background, 100% text): draft is grey, submitted is blue, processing is orange, approved is green, rejected or cancelled is red.
- WhatsApp green appears only inside the support row icon.

**Corner radii:** 8 for chips and pills, 12 for inputs and small tiles, 16 for buttons, 20 for cards and grouped sections (iOS 26 inset lists are about 26, so use 22 on iOS 26), 28 for sheets (system), and fully round for flags, avatars and the FAB. Use `borderCurve: 'continuous'` everywhere on iOS.

**Elevation**
- Level 0 is flat lists.
- Level 1 is cards: light mode y2 blur 8 at 6% black; dark mode has no shadow and uses surface2 instead.
- Level 2 is floating chrome (FAB, sticky CTA): y8 blur 24 at 18%, plus Liquid Glass where available.

**Motion** (react-native-reanimated, which is bundled in Expo Go SDK 57)
- Press: scale 0.97, spring {damping 18, stiffness 300}, with a light haptic on primary actions.
- FAB: entrance spring from scale 0.6 and y +20, with a selection haptic. On press, scale 0.9, a medium impact haptic, then open the sheet.
- Step changes in Apply slide horizontally (Layout transitions `SlideInRight` and `SlideOutLeft`, 220ms).
- Lists animate in with `FadeIn.duration(180)`. There are no staggered bounces.
- Skeleton shimmer for data loading (applications, weather).
- Respect `useReducedMotion()`.

**Dark mode:** design both modes from the tokens; it isn't an inversion. Use system grouped colours. Photos get a 20% black overlay in dark mode. Flags get a 1px hairline ring (white at 12% in dark, black at 8% in light) so white-heavy flags stay visible.

---

## 2. Country icons

| Option | Expo Go SDK 57 | Quality | Licence | Notes |
|---|---|---|---|---|
| **HatScripts circle-flags** (SVG) via react-native-svg `SvgXml` | ✅ react-native-svg is already in Expo Go and installed | Excellent: designed circular, crisp at any size | **MIT** | Bundle only the ~30 SVG strings we need (~1–2 KB each) in `assets/flags.ts`. Works offline. |
| react-native-country-flag | ✅ (pure JS) | Medium: rectangular PNGs | MIT | Loads images from flagcdn over the network; not circular without clipping; adds a dependency for little value. |
| flagcdn.com images | ✅ (`<Image>`) | Good PNG/SVG, but rectangular | Flags are public domain; the service is free | Needs network on first load, depends on an external CDN, and needs a clip to a circle (crops awkwardly for CH, NP and similar). |
| Emoji flags | ✅ | iOS good, Android inconsistent, **web on Windows shows letters** | n/a | Can't make circular, varies by OS, looks toy-like at large sizes. |

**Recommendation: HatScripts circle-flags, vendored as SVG strings and rendered with `SvgXml`.** It's offline, sharp, MIT licensed, needs no new native code, and gives a consistent circular look. Wrap it in `<Flag code="fr" size={28|40|64} />` with a hairline ring, and fall back to an initials circle for an unknown code. Add the MIT notice to `assets/flags/LICENSE`.

---

## 3. Menu and navigation

**What actually renders in Expo Go SDK 57 on iOS**
- `expo-router/unstable-native-tabs` (NativeTabs, backed by react-native-screens' native bottom tabs) ships in Expo Go 57, and the build directory `NativeBottomTabsNavigator` is present in node_modules. The current `_layout.ios.tsx` uses it.
- On iOS 26 this gives a real UITabBar with Liquid Glass and minimise-on-scroll.
- SF Symbols via `expo-symbols` render in Expo Go.
- Native Stack large titles (`headerLargeTitle`, `headerTransparent` plus `headerBlurEffect`, and `headerSearchBarOptions`) all work in Expo Go.
- `expo-glass-effect` GlassView renders real glass on iOS 26 and falls back to a plain view elsewhere.

**Limitation:** a UITabBar can't host a custom raised centre button. NativeTabs only accepts icon, label and badge per tab, plus `role` (for example `search`).

**Options for the raised centre Apply button**

| Option | How | Pros | Cons |
|---|---|---|---|
| A. NativeTabs plus an overlaid FAB | Keep NativeTabs with 4 tabs and an empty spacer; absolutely position a GlassView button above the bar's centre in the root layout | True native glass tab bar, minimise on scroll | The overlay doesn't track the bar's minimise animation or height changes. A spacer tab is a hack: tapping it selects an empty screen, and VoiceOver order is wrong. Fragile across iOS versions. |
| B. NativeTabs with `role="search"`-style separated item | iOS 26 renders a separate trailing glass button | Native | It's trailing, not centred, and semantically "search". It doesn't meet the brief. |
| **C. JS Tabs (`expo-router` Tabs) with a custom `tabBar`** | Custom bar: a GlassView (iOS 26) or BlurView background, 4 SF Symbol tabs, and a raised 64pt circular button in the middle slot | Full control: centred, raised, spring and haptics, correct accessibility, identical on iOS, Android and web | Loses native minimise-on-scroll and the exact system glass bar, so the chrome has to be hand-tuned to look native. |

**Decision: Option C** (a custom JS tab bar on all platforms). Delete `_layout.ios.tsx` so there's one tab layout. Details:
- **Slots:** Home (`house` / `house.fill`), Countries (`globe.europe.africa` / `.fill`), **[Apply FAB]**, Applications (`doc.text` / `doc.text.fill`), Account (`person.crop.circle` / `.fill`). Notifications live inside Account, with a bell in the Home nav bar showing an unread dot.
- **Bar:** height 49 plus the bottom safe-area inset, a GlassView `glassEffectStyle="regular"` background (falling back to expo-blur `BlurView` with intensity 80 and tint `systemChromeMaterial`), and a hairline top separator. Labels use the caption token. Selected items take the accent colour; unselected items take secondaryLabel.
- **FAB:**
  - A 60pt circle raised 18pt above the bar.
  - Brand-blue fill with a white `airplane` SF Symbol at 24pt semibold (`plus` as an alternative). On iOS 26 there's an optional GlassView `tintColor` accent glass.
  - Level-2 shadow, and an accessibility label of "Start application".
  - Mount: spring in (scale 0.6→1, translateY 20→0, damping 14, stiffness 220) with a `Haptics.selectionAsync()`.
  - Press: scale 0.9, `impactAsync(Medium)`, then `router.push('/apply')`.
  - `/apply` becomes a root-stack `presentation: 'formSheet'` (or `modal` with `sheetAllowedDetents: [1]`, grabber, and corner radius 28) instead of a tab.
  - Long-press (optional, phase 2) opens a context menu of recent destinations.
  - The FAB hides with a spring when the keyboard is open and on pushed detail screens (the tab bar is hidden there).
- **Stacks:** every tab is a native Stack with `headerLargeTitle: true`, `headerTransparent` plus `headerBlurEffect: 'systemChromeMaterial'` on iOS, and `headerShadowVisible: false`. Countries uses `headerSearchBarOptions` (the native search field), which replaces the duplicate search.
- **Lists:** grouped inset style with rows at least 44pt (52pt with a 28pt flag). Separators are inset to the text start. Chevrons use `chevron.right` at 13pt in tertiaryLabel.
- **Fallback:** if a future Expo Go build supports custom NativeTabs accessories, revisit option A.

---

## 4. Screen by screen

The legend: `[==]` is the primary button, `( )` is a flag, `›` is a chevron, and `◉` is the FAB.

**Shared tab bar (all tab screens)**
```
┌───────────────────────────────────────┐
│                                       │
│                ╭─────╮                │
│  ⌂      🌐     │ ✈︎  │     📄      👤  │   ← 60pt FAB raised 18pt, glass bar
│ Home  Countries╰─────╯ Applications Account
└───────────────────────────────────────┘
```

### Home
- **Changes:** the giant blue button goes (the FAB owns Apply). Add a nav-bar logo plus bell, and a context-aware hero: if there's an active application show a status card, otherwise a short greeting. Popular destinations become a horizontal flag strip instead of big photos.
- **Components:** Logo, IconButton(bell plus dot), StatusHeroCard, FlagChip, SectionHeader, ListGroup and ListRow, Skeleton.
```
┌─────────────────────────────┐
│ [EZvisa logo]          🔔•  │
│                             │
│ Good morning, Sara          │ display
│                             │
│ ╭─────────────────────────╮ │
│ │ (FR) France  · EZ-1042  │ │ StatusHeroCard (only if active)
│ │ ●───●───○───○           │ │ 4-step mini timeline
│ │ Submitted        View › │ │
│ ╰─────────────────────────╯ │
│ Popular                See all
│ (FR)  (DE)  (IT)  (ES)  (CH)│ 56pt FlagChips, scroll
│ France Germany Italy...     │
│ Recent applications         │
│ ╭─────────────────────────╮ │
│ │ (IT) Italy   Draft    › │ │
│ ╰─────────────────────────╯ │
│        ◉ tab bar            │
└─────────────────────────────┘
```
Signed out, or with no applications: the greeting plus "Where to next?" and the flag strip. The FAB is the only call to action.

### Countries
- **Changes:** native large title plus native search, flags replacing photo thumbnails, a Popular group plus an A–Z grouped list, and an optional right-hand section index.
- **Components:** native header search, SectionList, ListGroup, CountryRow(Flag 28, name, capital in subhead, chevron).
```
┌─────────────────────────────┐
│ Countries                   │ large title
│ 🔍 Search                   │ native search bar
│ POPULAR                     │
│ ╭─────────────────────────╮ │
│ │ (FR) France     Paris › │ │ 52pt rows
│ │ (DE) Germany   Berlin › │ │
│ ╰─────────────────────────╯ │
│ A                          A│
│ ╭─────────────────────────╮ │ B
│ │ (AT) Austria   Vienna › │ │ …
│ ╰─────────────────────────╯ │
└─────────────────────────────┘
```

### Country detail
- **Changes:** a 4:3 photo hero (the only photo use) with a flag badge overlapping its bottom edge. Facts move into a grouped list instead of a floating row, and Documents become a proper list. There's a single sticky bottom CTA, "Apply", which opens the apply sheet with the destination prefilled. The tab bar is hidden on this screen.
- **Components:** HeroImage, Flag 64 with ring, ListGroup, KeyValueRow, StickyCTA.
```
┌─────────────────────────────┐
│ ‹                    (glass)│ transparent header
│ [      photo 4:3          ] │
│        (FR)                 │ 64pt flag overlaps
│ France                      │ title1
│ Paris                       │ subhead
│ ╭─────────────────────────╮ │
│ │ Visa type      Schengen C│ │
│ │ Max stay          90 days│ │
│ │ Processing        24–48 h│ │
│ ╰─────────────────────────╯ │
│ DOCUMENTS                   │
│ ╭─────────────────────────╮ │
│ │ Passport               ›│ │
│ │ Photo                  ›│ │
│ │ Bank statement         ›│ │
│ ╰─────────────────────────╯ │
│ [========= Apply =========] │ sticky, glass backdrop
└─────────────────────────────┘
```

### Apply (sheet, opened by the FAB)
- **Changes:** presented as a sheet with a grabber and a 3-segment progress bar. Steps are Trip, Traveller and Documents (optional), sliding horizontally between them. The destination picker becomes a flag list with search instead of a photo carousel. The weather card is compact and sits under the dates. Use the native DateTimePicker compact style (iOS), and keep the CTA pinned above the keyboard (`KeyboardAvoidingView`). Close is an `xmark` glass button.
- **Components:** SheetHeader, ProgressSegments, DestinationField (opens a searchable flag list), DateRow (compact native picker), WeatherCard (compact variant), SegmentedControl for purpose (Tourism, Business, Family, plus More), FormField, StickyCTA.
```
┌─────────────────────────────┐
│          ───                │ grabber
│ ✕   New application         │
│ ▬▬▬▬▬▬▬ ▭▭▭▭▭▭▭ ▭▭▭▭▭▭▭     │ step 1/3
│ Where are you going?        │ title2
│ ╭─────────────────────────╮ │
│ │ (FR) France           › │ │ DestinationField
│ ├─────────────────────────┤ │
│ │ ✈︎ Departure   24 Oct ▾ │ │ compact pickers
│ │ ⤺ Return      31 Oct ▾ │ │
│ ╰─────────────────────────╯ │
│ ╭─────────────────────────╮ │
│ │ ☁︎ 7°  Paris now        │ │ WeatherCard compact
│ │ 24 Oct  🌧 15° / 8°     │ │ forecast ≤16d, else
│ ╰─────────────────────────╯ │ "Typical in Dec 9°/4°"
│ Purpose                     │
│ [Tourism|Business|Family|…] │ segmented
│                             │
│ [======== Continue =======] │ pinned above keyboard
└─────────────────────────────┘
```
The weather card has four states: a skeleton while loading, an error ("Weather unavailable · Retry"), a fallback (it hides if there's no capital), and the typical-for-month view.

### Review (step inside the sheet, or a pushed screen in it)
- **Changes:** a summary as a grouped list with edit links per group and a total in tabular numbers. Primary is "Submit"; after success the screen swaps to a success state (a checkmark animation with a success haptic) showing the reference and "Pay via WhatsApp" (flagged as a temporary payment route) plus Done.
```
┌─────────────────────────────┐
│ ‹   Review                  │
│ TRIP                  Edit  │
│ ╭─────────────────────────╮ │
│ │ (FR) France             │ │
│ │ 24 Oct – 31 Oct · Tourism│ │
│ ╰─────────────────────────╯ │
│ TRAVELLER             Edit  │
│ ╭─────────────────────────╮ │
│ │ Sara Khan · Indian      │ │
│ │ +971 50 123 4567        │ │
│ ╰─────────────────────────╯ │
│ ╭─────────────────────────╮ │
│ │ Total          249 AED  │ │
│ ╰─────────────────────────╯ │
│ [========= Submit ========] │
└─────────────────────────────┘
Success:   ✓ (animated)  Submitted  EZ-1042
           [Pay via WhatsApp]   Done
```

### Sign in (Account tab when signed out, also presentable as a sheet from Apply)
- **Changes:** keep the structure but use native-feeling grouped inputs (one card with two fields and a hairline). Google uses the official white button. "Forgot password?" opens an action sheet. Errors appear inline under the card rather than in alerts.
```
┌─────────────────────────────┐
│         [EZvisa logo]       │
│ Sign in                     │ title1
│ [ G  Continue with Google ] │ outlined
│ ────────── or ──────────    │
│ ╭─────────────────────────╮ │
│ │ Email                   │ │
│ ├─────────────────────────┤ │
│ │ Password            👁   │ │
│ ╰─────────────────────────╯ │
│ inline error text           │
│ [======== Continue =======] │
│ Create account   Forgot password?
└─────────────────────────────┘
```

### Account and My applications
- **Changes:** split into two tabs. The new Applications tab is a list. Account is a settings-style grouped list (profile header, Notifications, Support, Sign out).
```
Applications                     Account
┌───────────────────────────┐   ┌───────────────────────────┐
│ Applications              │   │ Account                   │
│ [Active | Past]           │   │ ╭───────────────────────╮ │
│ ╭───────────────────────╮ │   │ │ (SK) Sara Khan        │ │
│ │ (FR) France     ●Subm.│ │   │ │ sara@mail.com         │ │
│ │ EZ-1042 · 24 Oct     ›│ │   │ ╰───────────────────────╯ │
│ │ (IT) Italy      ●Draft│ │   │ ╭───────────────────────╮ │
│ │ EZ-1043 · 8 Nov      ›│ │   │ │ 🔔 Notifications  3  ›│ │
│ ╰───────────────────────╯ │   │ ╰───────────────────────╯ │
│ empty: ✈︎ "No applications"│   │ ╭───────────────────────╮ │
│ (FAB is the CTA)          │   │ │ 💬 WhatsApp          ›│ │
└───────────────────────────┘   │ │ ✉︎ Email             ›│ │
                                │ ╰───────────────────────╯ │
                                │ ╭───────────────────────╮ │
                                │ │ Sign out (red)        │ │
                                │ ╰───────────────────────╯ │
                                └───────────────────────────┘
```

### Application detail
- **Changes:** a status hero (flag, country, reference, StatusPill) and a vertical timeline from `status_history`. Documents are a list with per-file upload progress and an "Add document" row (opens an action sheet of document types, then the document picker). A payment row appears if unpaid. Support is the last group.
```
┌─────────────────────────────┐
│ ‹ Applications              │
│ (FR) France                 │ title1
│ EZ-1042         ● Submitted │
│ STATUS                      │
│ ╭─────────────────────────╮ │
│ │ ● Submitted   19 Oct 05:01│
│ │ │                       │ │ Timeline
│ │ ○ Processing            │ │
│ │ ○ Decision              │ │
│ ╰─────────────────────────╯ │
│ DOCUMENTS                   │
│ ╭─────────────────────────╮ │
│ │ 📄 Passport.pdf    View ›│ │
│ │ 📄 Photo.jpg  ▓▓▓▓░ 70% │ │ upload progress
│ │ ＋ Add document          │ │
│ ╰─────────────────────────╯ │
│ ╭─────────────────────────╮ │
│ │ Pay 249 AED           › │ │ only if unpaid
│ │ Support               › │ │
│ ╰─────────────────────────╯ │
└─────────────────────────────┘
```

### Notifications
- **Changes:** a grouped list by day (Today, Earlier). Unread items show a blue dot and a semibold title. Swipe or tap marks an item read (only `read_at` changes); tapping deep-links to the application. "Mark all read" sits in the nav bar. The empty state is a `bell.slash` symbol.
```
┌─────────────────────────────┐
│ ‹ Notifications  Mark all read
│ TODAY                       │
│ ╭─────────────────────────╮ │
│ │ • Application submitted │ │
│ │   EZ-1042 · 05:01       │ │
│ ╰─────────────────────────╯ │
│ EARLIER                     │
└─────────────────────────────┘
```

---

## 5. Shared component library (`components/ui/`)

- **Foundation:**
  - `tokens.ts` holds colours (PlatformColor on iOS), the type ramp, spacing, radii, elevation and motion springs.
  - `Text` takes a variant prop and is the only text component used.
  - `Surface` is a card or section with radius, elevation and borderCurve.
- **Navigation:** `TabBar` (custom, glass), `TabBarItem`, `ApplyFab`, `SheetHeader` (grabber, close, title), `HeaderIconButton` (glass circle).
- **Lists:** `ListGroup` (inset grouped with header and footer), `ListRow` (leading icon or flag, title, subtitle, trailing value, chevron, destructive, ≥44pt), `KeyValueRow`, `SectionHeader` (with action), `SwipeRow` (mark read).
- **Inputs:** `Button` (primary, secondary, plain, destructive; sizes L 52 and M 44; loading state; spring press plus haptic), `GoogleButton`, `TextField` and `FieldGroup`, `DateRow`, `SegmentedControl`, `SearchField` (web fallback only).
- **Data display:** `Flag` (circle-flags SVG), `FlagChip`, `StatusPill`, `Timeline`, `ProgressSegments`, `ProgressBar` (upload), `WeatherCard` (full and compact), `StatusHeroCard`, `ApplicationRow`, `CountryRow`, `HeroImage`, `Avatar` (initials).
- **Feedback:** `Skeleton`, `EmptyState` (symbol plus one line), `InlineError`, `SuccessCheck` (animated), `Toast` (light, for uploads).
- **Utilities:** `useHaptics` (wrapper, no-op on web), `usePressScale`, `useReducedMotion`.

---

## 6. Implementation order, tests and risks

**Order** (each phase ends with tsc, expo-doctor, both bundles, and screenshots in light and dark)
1. **Tokens and primitives:** tokens.ts, Text, Surface, Button, ListGroup and ListRow, Skeleton, EmptyState. Remove old theme usages gradually.
2. **Flags:** vendor circle-flags SVGs for all 29 countries in data, add the Flag and FlagChip components, and the licence file.
3. **Navigation:** custom TabBar plus ApplyFab (spring and haptics); move `/apply` to a root formSheet; 5 slots including a new Applications tab; native stack large titles, blur headers and native search. Delete `_layout.ios.tsx`.
4. **Countries and Country detail** (flags, grouped lists, sticky CTA).
5. **Apply sheet and Review:** progress bar, DestinationField, compact pickers, compact WeatherCard, success state.
6. **Applications, Account, Application detail** (timeline, upload progress) **and Notifications** (swipe, mark all).
7. **Home** (StatusHeroCard, flag strip, bell), since it depends on the components above.
8. **Polish:** motion pass, reduced motion, Dynamic Type, VoiceOver labels, dark-mode pass. Then E2E, an EAS Update to preview, and v4 screenshots.

**Test checklist**
- [ ] tsc clean, expo-doctor 21/21, iOS and Android bundles return 200, web export OK
- [ ] Expo Go 57 on a real iPhone (iOS 26 and iOS 18): tab bar, FAB spring and haptic, sheet detents, large titles, native search, SF Symbols, glass fallback on iOS 18
- [ ] Android Expo Go: tab bar, FAB, sheet fallback (modal), flags render
- [ ] Every flag renders (all 29 codes) in light and dark, with the ring visible on white-heavy flags (e.g. JP, CH, PL)
- [ ] FAB: hidden with the keyboard and on detail screens, VoiceOver label, double-tap protection (no double sheet)
- [ ] Apply: validation per step, weather loading, error and retry, forecast (≤16 days) and typical (>16 days), prefilled from Country detail
- [ ] Auth: email sign-in and sign-up, magic link, reset, Google error when not configured, sign out
- [ ] Signed-in E2E with a temporary user: create draft→submitted, list, detail, upload with progress, signed URL view, notifications read, push token. **Delete test data afterwards** (Storage API plus SQL) and verify none remains.
- [ ] Reduced motion, largest Dynamic Type size, dark mode on every screen
- [ ] No sales copy anywhere (grep for "best", "fast", "UAE residents", "%", "trusted")

**Risks and mitigations**
- **Custom tab bar looks less native than the UITabBar:** use GlassView on iOS 26 and BlurView with the system chrome material otherwise; match system metrics (49pt, caption labels, SF Symbols); review on a device.
- **Lost native minimise-on-scroll:** acceptable. Optionally hide the bar on scroll down with Reanimated (phase 2).
- **formSheet detents differ by iOS version, and Android shows a full modal:** design the sheet to work at full height.
- **expo-glass-effect** is only available on iOS 26: fallback is built in; test on iOS 18.
- **Unstable expo-router APIs (Link previews, native tabs)** are no longer depended on, which removes risk.
- **The Supabase email rate limit blocks E2E sign-ups:** create the test user through admin SQL (connector) or wait it out, and still clean up afterwards.
- **SVG strings increase bundle size** (~50 KB for 30 flags): negligible.
- **Scope creep:** each phase is shippable on its own via EAS Update to preview.
