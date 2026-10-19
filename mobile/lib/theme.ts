import { useScheme } from "./appearance";
import { Platform, TextStyle, ViewStyle } from "react-native";

// ---- Colour tokens: neutral iOS system surfaces + one brand accent ----
const light = {
  tint: "#0436DC", tintFill: "#0436DC", brand: "#0436DC", onTint: "#FFFFFF",
  // WCAG AA: secondary >= 5:1 on bg/card/surface2; tertiary (icons, chevrons) >= 3:1 non-text.
  label: "#0A0A0A", secondaryLabel: "#636369", tertiaryLabel: "#7D7D84",
  bg: "#FFFFFF", bgPlain: "#FFFFFF", card: "#F4F4F6", surface2: "#EBEBEF",
  fill: "rgba(118,118,128,0.12)", fill2: "rgba(118,118,128,0.08)", separator: "rgba(60,60,67,0.18)",
  green: "#1A7F37", red: "#D70015", orange: "#C93400", blue: "#0436DC", indigo: "#5856D6", teal: "#0071A4", grey: "#8E8E93",
  whatsapp: "#25D366", ring: "rgba(0,0,0,0.08)", glassTint: "rgba(255,255,255,0.9)", shadow: "#000",
};
const dark: typeof light = {
  // tint = text/icons on dark (>= 4.9:1); tintFill = filled controls with white text (5.1:1).
  tint: "#7B93FF", tintFill: "#3D5AFE", brand: "#0436DC", onTint: "#FFFFFF",
  label: "#FFFFFF", secondaryLabel: "rgba(235,235,245,0.6)", tertiaryLabel: "#8E8E93",
  bg: "#000000", bgPlain: "#000000", card: "#1C1C1E", surface2: "#2C2C2E",
  fill: "rgba(118,118,128,0.24)", fill2: "rgba(118,118,128,0.16)", separator: "rgba(84,84,88,0.6)",
  green: "#30D158", red: "#FF6961", orange: "#FF9F0A", blue: "#7B93FF", indigo: "#7D7AFF", teal: "#64D2FF", grey: "#8E8E93",
  whatsapp: "#25D366", ring: "rgba(255,255,255,0.12)", glassTint: "rgba(28,28,30,0.9)", shadow: "#000",
};
export type Colors = typeof light;
export const useColors = (): Colors => (useScheme() === "dark" ? dark : light);
export const useIsDark = () => useScheme() === "dark";

// ---- Type ramp (Apple HIG sizes, tight tracking) ----
type V = "display" | "largeTitle" | "title1" | "title2" | "title3" | "headline" | "body" | "callout" | "subhead" | "footnote" | "caption";
const F: TextStyle = Platform.OS === "web" ? { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif" } : {};
export const T: Record<V, TextStyle> = {
  display: { ...F, fontSize: 40, lineHeight: 44, fontWeight: "800", letterSpacing: -1.2 },
  largeTitle: { ...F, fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.9 },
  title1: { ...F, fontSize: 28, lineHeight: 33, fontWeight: "700", letterSpacing: -0.6 },
  title2: { ...F, fontSize: 22, lineHeight: 27, fontWeight: "700", letterSpacing: -0.4 },
  title3: { ...F, fontSize: 20, lineHeight: 25, fontWeight: "700", letterSpacing: -0.35 },
  headline: { ...F, fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.35 },
  body: { ...F, fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.35 },
  callout: { ...F, fontSize: 16, lineHeight: 21, fontWeight: "400", letterSpacing: -0.25 },
  subhead: { ...F, fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.2 },
  footnote: { ...F, fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.05 },
  caption: { ...F, fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0 },
};
export type TextVariant = V;

// ---- Spacing (4pt grid), radii, elevation, motion ----
export const S = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 36, x3: 44, x4: 56 } as const;
export const R = { chip: 8, input: 16, button: 999, tile: 20, card: 24, sheet: 32, round: 999 } as const;
export const isIOS = Platform.OS === "ios";
export const curve = (isIOS ? { borderCurve: "continuous" } : {}) as ViewStyle;
export const elevation = (level: 0 | 1 | 2, dark: boolean): ViewStyle => {
  if (level === 0 || (dark && level === 1)) return {};
  if (level === 1) return { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 };
  return { shadowColor: "#000", shadowOpacity: dark ? 0.5 : 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 };
};
/** @deprecated use elevation(1, dark) */
export const shadow = (dark: boolean) => elevation(1, dark);
export const SPRING = { press: { damping: 18, stiffness: 300 }, pop: { damping: 14, stiffness: 220 } } as const;
export const TAB_BAR_HEIGHT = 64; // floating capsule height
