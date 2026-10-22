// Colour tokens. Semantic names first; every screen asks for a role ("text", "surface"), never a hex value.
// ONE accent: EZvisa brand blue #0436DC (PRODUCT.md, logo, website --primary). Contrast ratios (WCAG 2.1) are noted
// per token and were measured against `background` and `surface` of the same scheme.

export type Palette = {
  /** Screen canvas. */ background: string;
  /** Grouped cards, inputs, tiles (flat fill on the canvas). */ surface: string;
  /** Sheets, popovers and raised cards (sits above `background`). */ surfaceRaised: string;
  /** Neutral control fill (segmented track, skeleton, chips). */ fill: string;
  /** Softer neutral fill. */ fillSubtle: string;
  /** Primary text and icons. */ text: string;
  /** Secondary text (captions, values). */ textSecondary: string;
  /** Tertiary text, placeholders, chevrons. */ textTertiary: string;
  /** Hairline around cards and controls. */ border: string;
  /** List separators. */ separator: string;
  /** Accent for text, icons, progress and selection outlines. */ accent: string;
  /** Accent for filled controls (primary button, selected tile). Pair with `onAccent`. */ accentFill: string;
  /** Selected-row tint. */ accentSoft: string;
  /** Text / icons on `accentFill` and `danger`. */ onAccent: string;
  success: string; warning: string; danger: string;
  /** Icons on a `success` fill. */ onSuccess: string;
  /** Modal / sheet backdrop. */ overlay: string;
  /** Selected segment of a segmented control. */ controlSelected: string;
  /** Secondary text on `accentFill`. */ onAccentSecondary: string;
  /** Soft status backgrounds (banners); text on them uses the full status colour. */ successSoft: string; warningSoft: string; dangerSoft: string;
  /** Travelling highlight of a skeleton. */ shimmer: string;
  /** Darkens photos slightly in dark mode. */ imageScrim: string;
  /** Floating chrome (tab bar): opaque fallback, specular rim, selection lens. */ chrome: string; chromeRim: string; lens: string; lensRim: string;
  /** WhatsApp brand (only on the WhatsApp action). */ whatsapp: string;
  shadow: string;
};

export const light: Palette = {
  background: "#FFFFFF",
  surface: "#F5F5F7",
  surfaceRaised: "#FFFFFF",
  fill: "rgba(118,118,128,0.12)",
  fillSubtle: "rgba(118,118,128,0.07)",
  text: "#0A0A0A",            // 19.8:1
  textSecondary: "#5F5F66",   // 6.3:1 bg · 5.8:1 surface
  textTertiary: "#6E6E76",    // 5.1:1 bg · 4.6:1 surface
  border: "rgba(0,0,0,0.08)",
  separator: "rgba(60,60,67,0.16)",
  accent: "#0436DC",          // 8.2:1 bg · 7.5:1 surface
  accentFill: "#0436DC",      // onAccent 8.2:1
  accentSoft: "rgba(4,54,220,0.08)",
  onAccent: "#FFFFFF",
  success: "#1A7F37",         // 5.1:1 bg · 4.7:1 surface
  warning: "#B83200",         // 6.0:1
  danger: "#D70015",          // 5.4:1 (also as a fill with onAccent)
  onSuccess: "#FFFFFF",       // 5.1:1 on success
  overlay: "rgba(0,0,0,0.4)",
  controlSelected: "#FFFFFF",
  onAccentSecondary: "rgba(255,255,255,0.8)", // 5.6:1 on accentFill
  successSoft: "rgba(26,127,55,0.06)", warningSoft: "rgba(184,50,0,0.06)", dangerSoft: "rgba(215,0,21,0.06)",
  shimmer: "rgba(255,255,255,0.65)",
  imageScrim: "transparent",
  chrome: "rgba(255,255,255,0.94)", chromeRim: "rgba(255,255,255,0.75)", lens: "rgba(0,0,0,0.06)", lensRim: "rgba(255,255,255,0.95)",
  whatsapp: "#25D366",
  shadow: "#000000",
};

export const dark: Palette = {
  background: "#000000",
  surface: "#1C1C1E",
  surfaceRaised: "#1C1C1E",
  fill: "rgba(118,118,128,0.24)",
  fillSubtle: "rgba(118,118,128,0.14)",
  text: "#FFFFFF",
  textSecondary: "rgba(235,235,245,0.64)", // 7.2:1 bg · 6.6:1 surface
  textTertiary: "#8E8E93",    // 6.4:1 bg · 5.2:1 surface
  border: "rgba(255,255,255,0.10)",
  separator: "rgba(84,84,88,0.6)",
  accent: "#8CA2FF",          // 8.7:1 bg · 7.1:1 surface
  accentFill: "#3D5AFE",      // onAccent 5.1:1
  accentSoft: "rgba(140,162,255,0.14)",
  onAccent: "#FFFFFF",
  success: "#30D158",         // 8.4:1 surface
  warning: "#FF9F0A",         // 8.3:1 surface
  danger: "#FF6961",          // 6.0:1 surface
  onSuccess: "#000000",       // 10.4:1 on success
  overlay: "rgba(0,0,0,0.6)",
  controlSelected: "#636366",
  onAccentSecondary: "rgba(255,255,255,0.8)", // 3.9:1 on accentFill: secondary/large text only
  successSoft: "rgba(48,209,88,0.10)", warningSoft: "rgba(255,159,10,0.10)", dangerSoft: "rgba(255,105,97,0.10)",
  shimmer: "rgba(255,255,255,0.07)",
  imageScrim: "rgba(0,0,0,0.2)",
  chrome: "rgba(28,28,30,0.94)", chromeRim: "rgba(255,255,255,0.16)", lens: "rgba(255,255,255,0.12)", lensRim: "rgba(255,255,255,0.18)",
  whatsapp: "#25D366",
  shadow: "#000000",
};

/** Older names kept so existing call sites compile; they resolve to the semantic tokens above. Prefer the semantic names. */
export const withAliases = (p: Palette) => ({
  ...p,
  bg: p.background, card: p.surface, raised: p.surfaceRaised, fill2: p.fillSubtle,
  label: p.text, secondaryLabel: p.textSecondary, tertiaryLabel: p.textTertiary,
  hairline: p.border, ring: p.border,
  green: p.success, orange: p.warning, red: p.danger, grey: p.textTertiary,
  tint: p.accent, tintFill: p.accentFill, brand: p.accentFill, onTint: p.onAccent,
  blue: p.accent, indigo: p.accent, teal: p.accent,
  surface2: p.fill, bgPlain: p.background, glassTint: p.surface,
});
export type Colors = ReturnType<typeof withAliases>;
export const LIGHT: Colors = withAliases(light);
export const DARK: Colors = withAliases(dark);

/** Google sign-in button colours, fixed by Google's branding guidelines (not themeable). */
export const GOOGLE = {
  light: { bg: "#F2F2F2", text: "#1F1F1F", border: "transparent" },
  dark: { bg: "#131314", text: "#E3E3E3", border: "#8E918F" },
  g: { red: "#EA4335", blue: "#4285F4", yellow: "#FBBC05", green: "#34A853" },
} as const;
