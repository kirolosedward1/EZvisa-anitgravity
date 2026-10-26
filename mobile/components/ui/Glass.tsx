// Liquid Glass material for small chrome: circular header buttons and the floating CTA dock.
// Same stack as the tab bar: native GlassView on iOS 26+, expo-blur on older iOS, translucent fill on Android.
import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useIsDark, curve, BLUR } from "../../lib/theme";

export const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

/** Fills its parent with glass. The parent sets the radius and `overflow: hidden`. */
export function GlassFill({ radius, strong }: { radius: number; strong?: boolean }) {
  const dark = useIsDark();
  const st: StyleProp<ViewStyle> = [StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }, curve];
  if (liquidGlass) return <GlassView glassEffectStyle={strong ? "regular" : "clear"} style={st} />;
  if (Platform.OS === "android") return <View style={[st, { backgroundColor: dark ? "rgba(44,44,46,0.86)" : "rgba(255,255,255,0.80)" }]} />;
  return <BlurView intensity={strong ? BLUR.chrome : BLUR.control} tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={[st, { backgroundColor: dark ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.62)" }]} />;
}

/** Glass slab: a rounded translucent container with the thin specular rim (header buttons, CTA docks, chips over photos). */
export function Glass({ radius, strong, style, children }: { radius: number; strong?: boolean; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const dark = useIsDark();
  return (
    <View style={[{ borderRadius: radius, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.85)" }, curve, style]}>
      <GlassFill radius={radius} strong={strong} />
      {!liquidGlass && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderTopWidth: 1, borderTopColor: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)" }]} />}
      {children}
    </View>
  );
}
