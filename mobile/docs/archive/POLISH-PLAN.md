> **Archived 2026-10-23. Outdated planning doc, kept for history only. The v9 polish plan has shipped or been replaced by later UI work. Current status: `mobile/HANDOFF.md` section 0.**

# v9 Premium polish plan (visuals and experience only, no backend/data/rule changes)

Before screenshots: `screenshots/v9-before/` (light/dark English, light Arabic, 393×852 @3x).

## Audit findings
### Spacing
- About 90 ad-hoc style numbers outside the token scale: `gap: 6` ×13, `gap: 2` ×8, `marginTop: 2/1/4`, `paddingVertical: 3/6/10`, `paddingHorizontal: 10/14`, `paddingBottom: 80`, `paddingTop: 7`.
- `S.xxl = 36`, `S.x3 = 44` and `S.x4 = 56` are not on the 8pt grid.
- ListRow uses `paddingVertical: 10`, so rows differ in height from the wizard answer rows (16).

### Type
- Text is hand-sized in TabBar, DateRow and data.tsx (`fontSize:` literals).
- No variant caps font scaling (`maxFontSizeMultiplier`), so the display/title1 headers overflow at accessibility sizes. Some inputs cap at 1.6 and others don't.
- Weights are passed ad hoc (`weight="500"/"600"/"700"`) for the same roles: section action, caption badges.

### Colour
- Extra hues on decorative surfaces: Story ring gradient `#7B61FF`, the indigo/teal tiles in the trip plan row and lists, and a purple map tile.
- The accent appears on non-primary things (blue Pass card fill, avatar, links) and competes with the primary button.
- Dark mode cards have no edge: `card #1C1C1E` on `#000` with no hairline, so groups look flat.

### Radius and elevation
- 16 different literal radii (2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 18, 22, 34, 44, 999).
- Cards are flat (level 0) everywhere except the tab bar. There is no layered shadow and no hairline, so Home and the detail screen read as grey boxes.

### Motion and feedback
- Pressed states are inconsistent: ListRow only tints its background, SectionHeader actions, HeaderIconButton, SegmentedControl and the Account rows have no scale/dim, and the trip chips do.
- Wizard slides use timing curves (240 ms) rather than springs. The progress segments jump with no animation.
- Inline errors appear with no shake.
- Saving shows text only: no check animation on the trip plan Save or on Review submit.
- Skeletons are a flat opacity pulse with no shimmer. The detail-screen skeleton is a few grey bars that don't match the layout (`18-loading-skeleton`).

### Flat or abrupt screens
- **Home (signed in):** a heavy blue Pass card, then a separate Next-step card, then popular countries. There are two competing focal points and no editorial hierarchy.
- **Welcome:** a sales line ("Schengen visas, made simple."). Replace it with a neutral headline.
- **Detail:** the flag, title and pill float with no hero; the groups are flat.
- **Trip plan:** cards are flat. The "Ideas, not bookings" badge is fine.
- **Account:** OK, but the avatar uses an accent fill, so the accent is overused.

## Plan
1. **Tokens (`lib/theme.ts`).**
   - Spacing on 4/8: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
   - Radius: xs 4, sm 8, md 12, lg 16, xl 20, xxl 24, sheet 32, round.
   - Elevation E0–E3 with layered `boxShadow` and hairline borders. No shadow in dark mode (hairline only).
   - Motion durations 200/260/350 and springs.
   - One type scale with per-role `maxFontSizeMultiplier`.
   - Neutral palette + one accent (brand `#0436DC`; dark `#7B93FF` for text, `#3D5AFE` for fills), plus semantic status colours only.
2. **Sweep:** replace every ad-hoc number, remove the extra hues, and remove the literal font sizes.
3. **Motion:**
   - PressScale with scale 0.97 + dim on every tappable item (rows, chips, header buttons, segments, tab items).
   - Spring directional slides in the wizard, an animated progress fill, and a Shake on errors.
   - A SavedCheck pop on save/submit.
   - Shimmer skeletons that match the real layouts (home hero, list, detail, trip).
   - Reduce Motion → fades only.
4. **Signature surfaces:**
   - Home hero built from the real active application: big round flag, display destination, status · countdown, and one primary action (the real next step).
   - A neutral signed-out headline.
   - Tactile cards (E1 + hairline + press-lift), with no shadows inside long lists (FlatList rows stay flat).
5. **Test:** web light/dark × EN/AR, font scale 1.35, Reduce Motion, tsc/doctor/e2e. Then after-screenshots, compare sheets, and publish.
