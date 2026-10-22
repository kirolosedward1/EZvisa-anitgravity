# EZvisa app design system

Tokens live in `mobile/theme/`. `lib/theme.ts` re-exports them, so `../lib/theme` imports keep working. Shared components live in `mobile/components/ui/` (`import { … } from "components/ui"`).

**Rule:** screens never hard-code a colour, size, radius, spacing value or duration. If a value is missing, add a token.

## Colour (`theme/colors.ts`)

There is one accent: EZvisa brand blue `#0436DC` (the logo, `PRODUCT.md`, and the website's `--primary`). In dark mode it becomes `#8CA2FF` for text and icons, and `#3D5AFE` for filled controls.

| Token | Use | Light | Dark |
|---|---|---|---|
| `background` | Screen canvas | `#FFFFFF` | `#000000` |
| `surface` | Grouped cards, inputs, tiles | `#F5F5F7` | `#1C1C1E` |
| `surfaceRaised` | Sheets, raised cards | `#FFFFFF` | `#1C1C1E` |
| `fill` / `fillSubtle` | Neutral control fills, skeletons | grey 12% / 7% | grey 24% / 14% |
| `text` | Primary text | 19.8:1 | 21:1 |
| `textSecondary` | Captions, values | 6.3:1 | 7.2:1 |
| `textTertiary` | Placeholders, chevrons | 5.1:1 | 6.4:1 |
| `border` / `separator` | Hairlines, list separators | | |
| `accent` | Accent text, icons, progress | 8.2:1 | 8.7:1 |
| `accentFill` + `onAccent` | Primary button, selected tile | 8.2:1 | 5.1:1 |
| `success` / `warning` / `danger` | Status (always paired with text or an icon) | 5.1 / 6.0 / 5.4:1 | 8.4 / 8.3 / 6.0:1 |
| `onSuccess` | Icons on a `success` fill | white | black |
| `overlay` | Modal backdrop | | |
| `successSoft` … `dangerSoft` | Note and banner backgrounds | | |
| `controlSelected`, `shimmer`, `imageScrim`, `chrome*`, `lens*` | Segmented control, skeleton, photos, tab bar | | |

All ratios are WCAG 2.1, measured against `background`; they stay at 4.5:1 or above on `surface` too. Older names (`bg`, `card`, `label`, `tint`, `green`, …) still resolve to these tokens. Use the semantic names in new code. `GOOGLE` holds Google's brand-mandated sign-in colours.

## Spacing, radius, size (`theme/tokens.ts`)

- **Spacing `S`:** an 8pt grid of `xs 8 · md 16 · xl 24 · xxl 32 · x3 40 · x4 48 · x5 64 · x6 80`, plus the half-steps `xxs 4` and `sm 12` for fine detail only.
  - `S.gutter` (16) is the screen edge margin.
  - `S.lg` is deprecated. It was 20, which is off the grid, and now equals `gutter`.
- **Radius `R`:**
  - Scale: `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · sheet 32 · round`.
  - Roles: `chip`, `input`, `tile`, `card`, `button`.
- **Sizes:**
  - `HIT` (44) is the minimum tap target.
  - `SIZE`: buttons 56/44, input 56, rows 52/64, icon tile 32, dot 8, sheet grabber.
  - `ICON`: `xs 11` to `hero 40`.
  - `AVATAR` (flags and avatars): 28 / 40 / 56 / 72 / 88.
- **Elevation:** `elevation(0–3, dark)`. Level 0 is flat (for long lists), 1 is a card, 2 is raised, 3 is floating chrome. Dark mode uses lighter surfaces instead of shadows.
- **Motion:**
  - `DUR`: instant 120, fast 200, base 260, slow 350, shimmer, sweep.
  - `SPRING`: press, pop, enter.
  - `PRESS`: scale 0.97, large 0.985, small 0.92, dim, disabled 0.4.

## Type (`theme/typography.ts`)

The scale follows Apple's text styles: `display` 40, `largeTitle` 34, `title1` 28, `title2` 22, `title3` 20, `headline`/`body` 17, `callout` 16, `subhead` 15, `footnote` 13, `caption` 12, `caption2` 11.

Dynamic Type is always on. `TYPE_SCALE` caps each role: body text grows to 2×, display text to 1.3×, and tab labels stay fixed, as on iOS. Inputs cap at `INPUT_SCALE` (1.6×).

`useLargeText()` is true from 1.35× upward. Use it to stack side-by-side layouts (for example, the country fact tiles).

## Theme hook (`theme/useTheme.ts`)

- `useTheme()` returns `{ dark, scheme, colors, space, radius, type, icon, size, elevation(level) }`.
- `useColors()` and `useIsDark()` are the light versions.
- The scheme follows the OS (`useColorScheme`) unless the user picks Light or Dark in Account → Appearance (`lib/appearance.tsx`). The native override also updates system UI such as pickers and alerts.

## Components (`components/ui`)

| Component | Notes |
|---|---|
| `Text` | The only text primitive. Takes `variant` and `tone` (`label`, `secondary`, `tertiary`, `accent`, `success`, `warning`, `danger`, `onAccent`). Text aligns to the reading direction. |
| `Button` | Variants: `primary`, `secondary`, `plain`, `destructive`. Supports `loading` (spinner inside, same size), `disabled` (40% opacity, announced) and `icon`. Only `primary` fires a haptic. |
| `Card` | A static surface, or pressable with `onPress`/`onLongPress`. Supports `disabled`, `level` and `padded`. |
| `Input` | Optional label, help and error text (the error replaces the help text and is announced). Focus shows an accent outline, an error shows a danger outline, and `editable={false}` dims it. Supports leading and trailing slots. |
| `ListGroup` + `ListRow` | iOS inset-grouped list. A row can have an icon tile, flag, subtitle, value, chevron (mirrors in RTL), trailing slot, `destructive` or `disabled`. Separators use `marginStart` and the `LIST_INSET.text` / `.icon` / `.flag` insets. |
| `Sheet` | Bottom sheet with a backdrop, grabber, title and close button. It slides up on a spring (fades under Reduce Motion) and closes on a drag down, a backdrop tap, the close button or Android back. |
| `Screen` | Canvas background, safe areas (`edges`), gutter, a `tabBar` bottom inset, and optional scroll, refresh and keyboard avoidance. |
| `Skeleton`, `SkeletonRows` | Shimmer placeholders (static under Reduce Motion). Arrange them to match the real layout. Use these rather than spinners for content. |
| `EmptyState` | Icon, title, optional message and an action. |
| Also | `SegmentedControl`, `ChipGroup`, `StatusPill` (neutral pill with a coloured dot), `Timeline`, `ProgressSegments`, `ProgressBar`, `HeaderIconButton`, `StickyCTA`, `IconTile`, `Avatar`, `Flag`, `PressScale` |

**Pressed states.** Every tappable item goes through `PressScale`, which scales on a spring and dims. Under Reduce Motion it only dims.

**Haptics (`lib/haptics.ts`):**
- `tap()` (light impact) fires on primary actions: the primary `Button` and the tab bar "+".
- `select()` fires on selection changes: segments, chips, choice rows, tab switches and the A–Z index.
- Navigation rows, back, close and secondary buttons stay silent.

**RTL.** Use `start`/`end`, `marginStart`/`paddingEnd`, `borderTopStartRadius` and `borderEndWidth`. Never `left`/`right` or `textAlign: "right"`. Directional icons switch on `useT().rtl`. The one documented exception is the tab-bar lens, which is positioned from the measured layout x.
