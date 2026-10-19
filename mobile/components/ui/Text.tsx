import type { Ref } from "react";
import { Text as RNText, TextProps } from "react-native";
import { T, TextVariant, useColors, Colors } from "../../lib/theme";

type Tone = "label" | "secondary" | "tertiary" | "tint" | "red" | "green" | "onTint";
export function Text({ variant = "body", tone = "label", color, weight, center, tabular, style, ...p }: TextProps & { variant?: TextVariant; tone?: Tone; color?: string; weight?: "400" | "500" | "600" | "700"; center?: boolean; tabular?: boolean; ref?: Ref<RNText> }) {
  const c = useColors();
  const map: Record<Tone, keyof Colors> = { label: "label", secondary: "secondaryLabel", tertiary: "tertiaryLabel", tint: "tint", red: "red", green: "green", onTint: "onTint" };
  return <RNText {...p} style={[T[variant], { color: color ?? c[map[tone]] }, weight && { fontWeight: weight }, center && { textAlign: "center" }, tabular && { fontVariant: ["tabular-nums"] }, style]} />;
}
