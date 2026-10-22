# Performance report (chat 14, 2026-10-22)

How it was measured (in the cloud container; no iPhone available there):
- **Bundle / OTA payload**: `npx expo export --clear --platform ios --platform web` before and after; sizes from `metadata.json` (iOS assets) and the Hermes `.hbc`.
- **Startup and screen timings**: the exported **web** build (react-native-web) in headless Chromium, 390×844, **CPU throttled 4×** (phone-class), 7 cold runs each, median.
  Startup = navigation start → first screen rendered **and** the boot overlay gone. Countries = cold deep link to `/countries` → all 29 flags drawn. Detail = cold deep link to `/country/spain` → hero photo loaded.
  Script: `scripts/bench-web.mjs` (`npx expo export --platform web --output-dir dist && node scripts/bench-web.mjs dist after 7`).
- Web numbers are a proxy. Native startup in Expo Go is measured in the app from this version on (see "On the iPhone" below).

## Results

| Metric | Before (591aced) | After | Change |
|---|---:|---:|---:|
| iOS JS bundle (Hermes .hbc) | 5,346,157 B | 5,400,829 B | +54.7 KB (+1.0%): analytics/scrub code + expo-image JS now used |
| iOS OTA assets (what Expo Go downloads) | 57 files, 2,513,254 B | 68 files, 2,474,252 B | −39 KB (−1.6%) |
| Splash + logo PNGs (4 files) | 186.2 KB | 45.2 KB | −76% (128-colour palette, visually identical) |
| Home story images decoded | 11 × 720 px photos (~15 MB RGBA) | 11 × 204 px thumbs (~1.8 MB RGBA) | ~−88% decode memory on Home |
| Web cold start, 4× CPU (median of 7) | 3,693 ms | 3,352 ms | −9% (run-to-run spread is about ±400 ms) |
| Countries cold deep link | 2,611 ms | 2,616 ms | no change |
| Country detail cold deep link | 1,611 ms | 1,548 ms | −4% |
| Bytes loaded across the 3 navigations | 11.35 MB | 10.71 MB | −0.64 MB |

Raw runs (ms):
- before: startup [3583, 3996, 4222, 3371, 3757, 3693, 3688], countries [2539, 3024, 3205, 2611, 3291, 2566, 2550], detail [1689, 1546, 1438, 1611, 1715, 1627, 1575]
- after: startup [3352, 3529, 3354, 3331, 3295, 3680, 3235], countries [2582, 2755, 2979, 2481, 2704, 2616, 2440], detail [1610, 1748, 1548, 1455, 1463, 1592, 1471]
- The slowest "after" startup (3,680 ms) is faster than 4 of the 7 "before" runs.

## What changed
- **Home stories** use 204 px square thumbnails (`assets/countries/thumbs/`, 11 files, ~9 KB each) via `expo-image` instead of decoding the 720 px photo for a 68 pt circle. Other countries fall back to the full photo.
- **expo-image** (already a dependency, included in Expo Go) for the Home thumbnails, the country hero and the logo: decoding off the JS thread, memory cache, downsampling.
  A 150 ms fade on the country hero was tried and removed: it made the hero measurably later (median 1,844 ms vs 1,548 ms).
- **Flag** is `React.memo`: country / nationality / calling-code list rows re-render on every search keystroke, and each flag is an SVG tree.
- **FlatList** (nationality list, country sheet): `maxToRenderPerBatch={12}`, `removeClippedSubviews` on Android.
- **PNG assets** quantized to 128 colours (splash light/dark, logo light/dark).
- **Audit M12 fixed**: Home, Applications and Account (`useApps(true)`) ran the `visa_applications` query twice on every focus (once directly, once inside `listNotifications`). Now one query; the unread count comes from the same rows.
- **Analytics** writes are batched (outbox, one insert per flush) instead of one network request per wizard event.

## Looked at, not changed
- Bundle composition is framework-heavy (react-native 2.0 MB, expo-router 1.2 MB, reanimated 0.9 MB, supabase 0.8 MB of source). Nothing app-side is large except the flag SVG table (175 KB source), which is used by every list.
- Country hero JPEGs (720 px, ~66 KB each) are already well compressed: re-encoding saved only 5%, not worth the quality loss.
- `MaterialSymbols` (971 KB) and `Ionicons` (390 KB) fonts are only in the Android/web asset sets; iOS uses SF Symbols.
- **Startup risk, not fixed**: the splash waits for `supabase.auth.getSession()`. When a stored session has expired, supabase-js refreshes it over the network before resolving, so a slow network can hold the splash. Fixing it (show cached session, refresh in the background) changes auth behaviour, so it is listed as a follow-up.

## On the iPhone
From this version, the app measures its own cold start (`lib/perf.ts`: JS start, or native process start when React Native reports it, to the first screen).
**Account › Privacy › long-press "Version"** shows the last five startup times, the queued event count and the last (scrubbed) error.
The current `preview` update does not contain the timer, so a device "before" number needs a stopwatch or the Xcode/Instruments app-launch template on a development build.
