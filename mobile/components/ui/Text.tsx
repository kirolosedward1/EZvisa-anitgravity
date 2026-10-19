import type { Ref } from "react";
import { Platform, Text as RNText, TextProps } from "react-native";
import { T, TYPE_SCALE, TextVariant, useColors, Colors } from "../../lib/theme";

type Tone = "label" | "secondary" | "tertiary" | "tint" | "accent" | "red" | "green" | "onTint";
/** The only text primitive. Size/line height come from the type scale; Dynamic Type is on and capped per role. */
export function Text({ variant = "body", tone = "label", color, weight, center, tabular, style, ...p }: TextProps & { variant?: TextVariant; tone?: Tone; color?: string; weight?: "400" | "500" | "600" | "700"; center?: boolean; tabular?: boolean; ref?: Ref<RNText> }) {
  const c = useColors();
  const map: Record<Tone, keyof Colors> = { label: "label", secondary: "secondaryLabel", tertiary: "tertiaryLabel", tint: "accent", accent: "accent", red: "red", green: "green", onTint: "onAccent" };
  // Web preview only: `window.__FONT_SCALE__` simulates iOS Dynamic Type (same per-role cap) so large text can be tested.
  const sim = Platform.OS === "web" ? Math.min((globalThis as any).__FONT_SCALE__ ?? 1, TYPE_SCALE[variant]) : 1;
  const big = sim !== 1 ? { fontSize: T[variant].fontSize! * sim, lineHeight: T[variant].lineHeight! * sim } : null;
  return <RNText allowFontScaling maxFontSizeMultiplier={TYPE_SCALE[variant]} {...p} style={[T[variant], big, { color: color ?? c[map[tone]] }, weight && { fontWeight: weight }, center && { textAlign: "center" }, tabular && { fontVariant: ["tabular-nums"] }, style]} />;
}
