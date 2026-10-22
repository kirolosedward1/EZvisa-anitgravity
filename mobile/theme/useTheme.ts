import { useMemo } from "react";
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
