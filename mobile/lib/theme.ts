// Compatibility entry point: the tokens live in `theme/` (see docs/design-system.md). Existing `../lib/theme` imports
// keep working; new code may import from `theme/` directly.
import type { ViewStyle } from "react-native";
import { R, curve, elevation, type Level } from "../theme/tokens";
import type { Colors } from "../theme/colors";

export * from "../theme";

/** Card surface: E0 = flat grouped fill (safe in long lists), E1+ = raised card with hairline + layered shadow. */
export const card = (c: Colors, dark: boolean, level: Level = 1): ViewStyle => ({
  backgroundColor: level === 0 || dark ? c.surface : c.surfaceRaised, borderRadius: R.card,
  // Every card has a hairline (white cards on the off-white canvas); level 0 has no shadow.
  borderWidth: 1, borderColor: c.border, ...curve, ...elevation(level, dark),
});
/** @deprecated use elevation(1, dark) */
export const shadow = (dark: boolean) => elevation(1, dark);
