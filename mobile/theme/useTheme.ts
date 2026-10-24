import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useScheme } from "../lib/appearance";
import { DARK, LIGHT, type Colors } from "./colors";
import { S, R, ICON, HIT, SIZE, elevation, type Level } from "./tokens";
import { T } from "./typography";

/** Effective colour scheme: the Appearance setting (System / Light / Dark) or, by default, the OS via useColorScheme. */
export const useIsDark = () => useScheme() === "dark";
export const useColors = (): Colors => (useIsDark() ? DARK : LIGHT);

/** Everything a component needs in one call: colours for the current scheme plus the static scales. */
export function useTheme() {
  const dark = useIsDark();
  return useMemo(() => {
    const colors = dark ? DARK : LIGHT;
    return { dark, scheme: dark ? ("dark" as const) : ("light" as const), colors, space: S, radius: R, type: T, icon: ICON, hit: HIT, size: SIZE, elevation: (l: Level) => elevation(l, dark) };
  }, [dark]);
}
export type Theme = ReturnType<typeof useTheme>;

/** Font scale at which side-by-side layouts should stack (iOS accessibility sizes start around 1.35-1.5x).
 *  Native: the OS font scale. Web preview: `window.__FONT_SCALE__` (the same simulation the Text primitive uses). */
export const LARGE_TEXT = 1.35;
export function useLargeText() {
  const { fontScale } = useWindowDimensions();
  const sim = Platform.OS === "web" ? ((globalThis as any).__FONT_SCALE__ ?? 1) : fontScale;
  return sim >= LARGE_TEXT;
}

/** How much meaningful icons and their containers grow with the text size (HIG › Typography › "Increase the size of
 *  meaningful interface icons as font size increases"). 1 at the default size, capped so icons never crowd the text. */
export function useContentScale(cap = 1.5) {
  const { fontScale } = useWindowDimensions();
  const s = Platform.OS === "web" ? ((globalThis as any).__FONT_SCALE__ ?? 1) : fontScale;
  return Math.max(1, Math.min(s, cap));
}
