import { useScheme } from "./appearance";
import { Platform, TextStyle, ViewStyle } from "react-native";

// =====================================================================================================================
// EZvisa design tokens (v9). Every screen pulls spacing, type, colour, radius, elevation and motion from here.
// =====================================================================================================================

// ---- Colour: restrained neutrals + ONE accent (EZvisa brand blue from the logo) + semantic status colours ----
// The accent is for primary actions, progress, selection and key highlights only. Contrast (WCAG AA) noted per token.
const light = {
  accent: "#0436DC",        // 8.6:1 on white: text, icons, fills with white text
  accentFill: "#0436DC",    // filled primary controls (white text 8.6:1)
  accentSoft: "rgba(4,54,220,0.08)", // selected-row tint
  onAccent: "#FFFFFF",
  label: "#0A0A0A",         // 19.8:1
  secondaryLabel: "#5F5F66",// 6.2:1 on bg, 5.6:1 on card
  tertiaryLabel: "#7A7A82", // 4.3:1: icons/chevrons/non-text (>= 3:1)
  bg: "#FFFFFF", card: "#F5F5F7", raised: "#FFFFFF", // raised = elevated card on bg
  fill: "rgba(118,118,128,0.12)", fill2: "rgba(118,118,128,0.07)",
  hairline: "rgba(0,0,0,0.08)", separator: "rgba(60,60,67,0.16)",
  green: "#1A7F37", red: "#D70015", orange: "#B83200", // status only (>= 4.8:1)
  grey: "#8E8E93", whatsapp: "#25D366", shadow: "#000",
};
const dark: typeof light = {
  accent: "#8CA2FF",        // 7.9:1 on black (text/icons)
  accentFill: "#3D5AFE",    // white text 5.1:1
  accentSoft: "rgba(140,162,255,0.14)",
  onAccent: "#FFFFFF",
  label: "#FFFFFF", secondaryLabel: "rgba(235,235,245,0.64)", tertiaryLabel: "#8E8E93",
  bg: "#000000", card: "#1C1C1E", raised: "#1C1C1E",
  fill: "rgba(118,118,128,0.24)", fill2: "rgba(118,118,128,0.14)",
  hairline: "rgba(255,255,255,0.10)", separator: "rgba(84,84,88,0.6)",
  green: "#30D158", red: "#FF6961", orange: "#FF9F0A",
  grey: "#8E8E93", whatsapp: "#25D366", shadow: "#000",
};
type Base = typeof light;
/** Back-compat aliases (tint = accent etc.) so older call sites keep working while using the same single accent. */
const withAliases = (p: Base) => ({ ...p, tint: p.accent, tintFill: p.accentFill, brand: p.accentFill, onTint: p.onAccent, blue: p.accent, indigo: p.accent, teal: p.accent, surface2: p.fill, bgPlain: p.bg, ring: p.hairline, glassTint: p.card });
const L = withAliases(light), D = withAliases(dark);
export type Colors = typeof L;
export const useColors = (): Colors => (useScheme() === "dark" ? D : L);
export const useIsDark = () => useScheme() === "dark";

// ---- Type: ONE scale. Roles: display · title (L/1/2/3) · headline · body · callout · subhead · footnote · caption ----
// Sizes/line heights follow Apple's text styles; `scale` caps Dynamic Type so big headers never overflow.
type V = "display" | "largeTitle" | "title1" | "title2" | "title3" | "headline" | "body" | "callout" | "subhead" | "footnote" | "caption" | "caption2";
const F: TextStyle = Platform.OS === "web" ? { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif" } : {};
export const T: Record<V, TextStyle> = {
  display: { ...F, fontSize: 40, lineHeight: 46, fontWeight: "800", letterSpacing: -1.2 },
  largeTitle: { ...F, fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.9 },
  title1: { ...F, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  title2: { ...F, fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.4 },
  title3: { ...F, fontSize: 20, lineHeight: 24, fontWeight: "600", letterSpacing: -0.35 },
  headline: { ...F, fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.35 },
  body: { ...F, fontSize: 17, lineHeight: 24, fontWeight: "400", letterSpacing: -0.35 },
  callout: { ...F, fontSize: 16, lineHeight: 22, fontWeight: "400", letterSpacing: -0.25 },
  subhead: { ...F, fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.2 },
  footnote: { ...F, fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.05 },
  caption: { ...F, fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0 },
  caption2: { ...F, fontSize: 11, lineHeight: 13, fontWeight: "500", letterSpacing: 0.06 }, // tab bar labels only
};
/** Max Dynamic Type multiplier per role (body text scales furthest; display least). */
export const TYPE_SCALE: Record<V, number> = { display: 1.3, largeTitle: 1.35, title1: 1.4, title2: 1.5, title3: 1.6, headline: 2, body: 2, callout: 2, subhead: 2, footnote: 1.8, caption: 1.6, caption2: 1 };
export type TextVariant = V;

// ---- Spacing: strict 4/8pt scale ----
export const S = { none: 0, xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, x3: 40, x4: 48, x5: 64, x6: 80 } as const;
// ---- Radius: one scale ----
export const R = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, sheet: 32, round: 999,
  /* roles */ chip: 8, input: 16, tile: 20, card: 24, button: 999 } as const;
// ---- Hit targets / icon sizes (SF Symbols, same weights everywhere) ----
export const HIT = 44;
export const ICON = { sm: 13, md: 17, lg: 22, xl: 28, hero: 40 } as const;

export const isIOS = Platform.OS === "ios";
export const curve = (isIOS ? { borderCurve: "continuous" } : {}) as ViewStyle;

// ---- Elevation: E0 flat (list rows), E1 card, E2 raised/pressed-lift, E3 floating (tab bar, FAB) ----
// Layered soft shadows + hairline border in light mode; hairline only in dark mode (shadows read as mud on black).
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
/** Card surface: background + hairline + elevation. */
export const card = (c: Colors, dark: boolean, level: Level = 1): ViewStyle => ({ backgroundColor: level === 0 ? c.card : dark ? c.card : c.raised, borderRadius: R.card, borderWidth: level === 0 && !dark ? 0 : 1, borderColor: c.hairline, ...curve, ...elevation(level, dark) });
/** @deprecated use elevation(1, dark) */
export const shadow = (dark: boolean) => elevation(1, dark);

// ---- Motion: springs settle in ~200-350 ms; Reduce Motion falls back to short fades (see lib/motion.ts) ----
export const DUR = { fast: 200, base: 260, slow: 350 } as const;
export const SPRING = {
  press: { damping: 20, stiffness: 420, mass: 0.6 },   // ~200 ms
  pop: { damping: 14, stiffness: 260, mass: 0.7 },     // ~320 ms with a little overshoot
  enter: { damping: 22, stiffness: 240, mass: 0.8 },   // ~300 ms
} as const;
export const PRESS = { scale: 0.97, dim: 0.85, lift: -1 } as const;
export const TAB_BAR_HEIGHT = 64; // floating capsule height
