# Country screen v2: screenshots

Web build (`expo export --platform web`) against `scripts/mock-supabase.mjs` (fixture rows, no live data), captured by
`scripts/country-shots.mjs`; sheets by `scripts/country-sheets.mjs`. Largest text uses the web preview's Dynamic Type
simulation (`window.__FONT_SCALE__ = 3.1`, capped per text role as on iOS). `checks.log` holds the 234 UI checks.

The app is light-only since v10.4 (`lib/appearance.tsx`), so these shots are light. `pre-merge/` has the same run
from before that change (dark mode on, older type scale and gutter): the screen uses theme tokens only and passed the
same checks in dark, light, English and Arabic.

- `sheets/before-after.jpg`: the old screen next to the new one (390, English and Arabic)
- `sheets/italy.jpg`: Italy as shipped, 390 and 430, English and Arabic, largest text
- `sheets/italy-funds-preview.jpg`: proof of funds (preview only: hidden in the app until the numbers are confirmed)
- `sheets/portugal-no-funds.jpg`: a country without funds data
- `sheets/malta-no-centre.jpg`: a country without a visa centre mapping
- `sheets/italy-draft.jpg`, `sheets/italy-active.jpg`: with a draft, and with an active case (plus an older draft, so See all shows)

File names: `<scenario>-<width>-light-<en|ar>[-largest]-<n>.jpg`, n = scroll position from the top.
