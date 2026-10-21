import { PressScale } from "../ui";
// iOS 26-style navigation: a floating Liquid Glass capsule with the tabs. The old floating Apply button beside it was
// removed (it overlapped the bar and content); "Start application" lives on Home and in the Applications header.
import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useColors, useIsDark, elevation, SPRING, TAB_BAR_HEIGHT, S, R, T, ICON } from "../../lib/theme";
import { select, medium } from "../../lib/haptics";
import { Icon, IconName, Text } from "../ui";

const ICONS: Record<string, [IconName, IconName]> = {
  "(home)": ["house", "house.fill"], "(countries)": ["globe.europe.africa", "globe.europe.africa.fill"],
  applications: ["doc.text", "doc.text.fill"], account: ["person.crop.circle", "person.crop.circle.fill"],
};
const H = TAB_BAR_HEIGHT;
const glass = Platform.OS === "ios" && isLiquidGlassAvailable();

function Material({ radius }: { radius: number }) {
  const c = useColors(); const dark = useIsDark();
  const st = [StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" as const }];
  if (glass) return <GlassView glassEffectStyle="regular" style={st} />;
  if (Platform.OS === "android") return <View style={[st, { backgroundColor: dark ? "#1C1C1E" : "#FFFFFF" }]} />;
  return <BlurView intensity={60} tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={[st, { backgroundColor: c.glassTint }]} />;
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useColors(); const dark = useIsDark(); const insets = useSafeAreaInsets();
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  const focused = state.routes[state.index];
  // Hidden on every pushed/detail screen (also when it's the only route in its stack, e.g. opened from another tab).
  const nested = focused.state as { index?: number; routes?: { name: string }[] } | undefined;
  const top = nested?.routes?.[nested.index ?? 0]?.name;
  const hidden = kb || (nested?.index ?? 0) > 0 || (!!top && !["index", "countries"].includes(top));
  const bottom = insets.bottom > 0 ? Math.max(insets.bottom - 10, 8) : 14;
  const ty = useSharedValue(0);
  useEffect(() => { ty.value = withSpring(hidden ? H + bottom + 30 : 0, SPRING.press); }, [hidden, bottom]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return (
    <Animated.View pointerEvents={hidden ? "none" : "box-none"} style={[{ position: "absolute", left: S.md, right: S.md, bottom, height: H, flexDirection: "row", gap: S.sm }, a]}>
      <View style={[{ flex: 1, height: H, borderRadius: H / 2 }, elevation(3, dark), { borderWidth: 1, borderColor: c.hairline }]}>
        <Material radius={H / 2} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: S.xs }} accessibilityRole="tablist">
          {state.routes.map((route, i) => {
            const on = state.index === i; const label = (descriptors[route.key].options.title ?? route.name) as string;
            const [off, onI] = ICONS[route.name] ?? ["circle", "circle"];
            const press = () => { const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (!e.defaultPrevented && !on) { select(); navigation.navigate(route.name, route.params); } };
            return (
              <PressScale key={route.key} onPress={press} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} testID={`tab-${route.name}`}
                style={{ flex: 1, height: H - 12, borderRadius: (H - 12) / 2, alignItems: "center", justifyContent: "center", gap: S.xxs, backgroundColor: on ? (dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)") : "transparent" }}>
                <Icon name={on ? onI : off} size={ICON.lg} color={on ? c.tint : c.label} />
                <Text variant="caption2" weight={on ? "600" : "500"} color={on ? c.tint : c.label} numberOfLines={1}>{label}</Text>
              </PressScale>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}
