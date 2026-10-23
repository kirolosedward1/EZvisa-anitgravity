# Country screen v2: screenshots

Web build (`expo export --platform web`) against `scripts/mock-supabase.mjs` (fixture rows, no live data), captured by
`scripts/country-shots.mjs`; sheets by `scripts/country-sheets.mjs`. Largest text uses the web preview's Dynamic Type
simulation (`window.__FONT_SCALE__ = 3.1`, capped per text role as on iOS). `checks.log` holds the 234 UI checks.

- `sheets/before-after.jpg`: the old screen next to the new one (390, light English and dark Arabic)
- `sheets/italy.jpg`: Italy as shipped, 390 and 430, light and dark, English and Arabic, largest text
- `sheets/italy-funds-preview.jpg`: the proof-of-funds section (preview only: hidden in the app until the numbers are confirmed)
- `sheets/portugal-no-funds.jpg`: a country without funds data
- `sheets/malta-no-centre.jpg`: a country without a visa centre mapping
- `sheets/italy-draft.jpg`, `sheets/italy-active.jpg`: with a draft, and with an active case (plus an older draft, so See all shows)

File names: `<scenario>-<width>-<light|dark>-<en|ar>[-largest]-<n>.jpg`, n = scroll position from the top.
