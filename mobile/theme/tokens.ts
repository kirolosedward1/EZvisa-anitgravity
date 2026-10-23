import { Platform, ViewStyle } from "react-native";

// ---- Spacing: 8pt grid. 4 and 12 are half-steps for fine detail only (icon gaps, row padding). ----
export const S = {
  none: 0, xxs: 4, xs: 8, sm: 12, md: 16,
  /** @deprecated use `gutter` for screen edges, `xl` for section gaps. Equals `gutter`. */
  lg: 20,
  xl: 24, xxl: 32, x3: 40, x4: 48, x5: 64, x6: 80,
  /** Screen edge margin: 20 for a calmer, more spacious page. */
  gutter: 20,
} as const;
/** Alias with the plain name. */
export const space = S;

// ---- Radius: one scale + roles ----
export const R = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, sheet: 32, round: 999,
  /* roles */ chip: 8, input: 16, tile: 20, card: 24, button: 999,
} as const;

// ---- Sizes ----
/** Minimum hit target (Apple HIG). */
export const HIT = 44;
/** Control heights. */
export const SIZE = { buttonL: 56, buttonM: HIT, input: 56, row: 52, rowTall: 64, iconTile: 32, dot: 8, grabberW: 36, grabberH: 5, sheetDismiss: 96 } as const;
/** Icon sizes (SF Symbols / Ionicons), same weights everywhere. */
export const ICON = { xs: 11, sm: 13, md: 17, lg: 22, xl: 28, hero: 40 } as const;
/** Flag / avatar diameters. */
export const AVATAR = { sm: 28, md: 40, lg: 56, xl: 72, xxl: 88 } as const;
export const TAB_BAR_HEIGHT = 56;
/** Detail-screen photo header: share of the window height, and how far the rounded sheet overlaps it. */
export const HERO = { ratio: 0.34, overlap: 32 } as const;
/** expo-blur intensities: small controls over photos, and bars/chrome. */
export const BLUR = { control: 50, chrome: 70 } as const;

export const isIOS = Platform.OS === "ios";
/** iOS continuous (squircle) corners. */
export const curve = (isIOS ? { borderCurve: "continuous" } : {}) as ViewStyle;

// ---- Elevation: E0 flat, E1 card, E2 raised, E3 floating chrome (tab bar, FAB) ----
// Layered soft shadows in light mode; in dark mode depth comes from the lighter surface (shadows read as mud on black).
export type Level = 0 | 1 | 2 | 3;
const SH: Record<Exclude<Level, 0>, string> = {
  1: "0px 1px 2px rgba(0,0,0,0.05), 0px 4px 14px rgba(0,0,0,0.05)",
  2: "0px 2px 4px rgba(0,0,0,0.06), 0px 10px 24px rgba(0,0,0,0.08)",
  3: "0px 4px 10px rgba(0,0,0,0.10), 0px 18px 40px rgba(0,0,0,0.16)",
};
export const elevation = (level: Level, dark: boolean): ViewStyle => {
  if (level === 0) return {};
  if (dark) return level === 3 ? ({ boxShadow: "0px 12px 32px rgba(0,0,0,0.6)" } as ViewStyle) : {};
  return { boxShadow: SH[level] } as ViewStyle;
};

// ---- Motion: springs settle in ~200-350 ms; Reduce Motion falls back to short fades (lib/motion.ts) ----
export const DUR = { instant: 120, fast: 200, base: 260, slow: 350, /** looping skeleton shimmer */ shimmer: 1300, /** indeterminate progress sweep */ sweep: 1100 } as const;
export const SPRING = {
  press: { damping: 20, stiffness: 420, mass: 0.6 },   // ~200 ms
  pop: { damping: 14, stiffness: 260, mass: 0.7 },     // ~320 ms, slight overshoot
  enter: { damping: 22, stiffness: 240, mass: 0.8 },   // ~300 ms
} as const;
/** Pressed state: scale (large surfaces shrink less, small targets more), dim, card lift, disabled opacity. */
export const PRESS = { scale: 0.97, scaleLarge: 0.985, scaleSmall: 0.92, dim: 0.85, lift: -1, disabled: 0.4 } as const;
