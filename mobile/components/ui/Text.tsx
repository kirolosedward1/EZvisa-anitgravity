import type { Ref } from "react";
import { Platform, Text as RNText, TextProps, type TextInstance } from "react-native";
import { T, TYPE_SCALE, TextVariant, useColors, Colors } from "../../lib/theme";

export type Tone = "label" | "secondary" | "tertiary" | "accent" | "tint" | "success" | "green" | "warning" | "danger" | "red" | "onAccent" | "onTint";
const TONE: Record<Tone, keyof Colors> = {
  label: "text", secondary: "textSecondary", tertiary: "textTertiary", accent: "accent", tint: "accent",
  success: "success", green: "success", warning: "warning", danger: "danger", red: "danger", onAccent: "onAccent", onTint: "onAccent",
};

/** The only text primitive. Size/line height come from the type scale; Dynamic Type is on and capped per role.
 *  Text aligns to the reading direction by default (start in LTR, end in RTL), so screens never set left/right. */
export function Text({ variant = "body", tone = "label", color, weight, center, tabular, style, ...p }: TextProps & { variant?: TextVariant; tone?: Tone; color?: string; weight?: "400" | "500" | "600"; center?: boolean; tabular?: boolean; ref?: Ref<TextInstance> }) {
  const c = useColors();
  // Web preview only: `window.__FONT_SCALE__` simulates iOS Dynamic Type (same per-role cap) so large text can be tested.
  const sim = Platform.OS === "web" ? Math.min((globalThis as any).__FONT_SCALE__ ?? 1, p.maxFontSizeMultiplier ?? TYPE_SCALE[variant]) : 1;
  const big = sim !== 1 ? { fontSize: T[variant].fontSize! * sim, lineHeight: T[variant].lineHeight! * sim } : null;
  return <RNText allowFontScaling maxFontSizeMultiplier={TYPE_SCALE[variant]} {...p} style={[T[variant], big, { color: color ?? c[TONE[tone]] }, weight && { fontWeight: weight }, center && { textAlign: "center" }, tabular && { fontVariant: ["tabular-nums"] }, style]} />;
}
