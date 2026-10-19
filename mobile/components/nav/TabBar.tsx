// iOS 26-style navigation: a floating Liquid Glass capsule with the tabs, plus a separate circular
// Apply action beside it (the News/Health "separated tab" pattern). Works in Expo Go on every platform.
import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useColors, useIsDark, elevation, SPRING, TAB_BAR_HEIGHT } from "../../lib/theme";
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

export function ApplyFab() {
  const c = useColors(); const dark = useIsDark(); const reduce = useReducedMotion();
  const s = useSharedValue(reduce ? 1 : 0.5); const press = useSharedValue(1); const last = useRef(0);
  useEffect(() => { if (!reduce) { s.value = withDelay(150, withSpring(1, SPRING.pop)); select(); } }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value * press.value }] }));
  const open = () => { const now = Date.now(); if (now - last.current < 800) return; last.current = now; medium(); router.push("/apply"); };
  return (
    <Animated.View style={[{ width: H, height: H, borderRadius: H / 2 }, elevation(2, dark), a]}>
      <Pressable onPress={open} onPressIn={() => { if (!reduce) press.value = withSpring(0.88, SPRING.press); }} onPressOut={() => { press.value = withSpring(1, SPRING.press); }}
        accessibilityRole="button" accessibilityLabel="Start application" testID="apply-fab" style={{ flex: 1, borderRadius: H / 2, overflow: "hidden" }}>
        {glass ? <GlassView glassEffectStyle="regular" tintColor={c.brand} isInteractive style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Icon name="airplane" size={24} color="#fff" weight="semibold" /></GlassView>
          : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.brand }}><Icon name="airplane" size={24} color="#fff" weight="semibold" /></View>}
      </Pressable>
    </Animated.View>
  );
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
  const hidden = kb || (focused.state?.index ?? 0) > 0;
  const bottom = insets.bottom > 0 ? Math.max(insets.bottom - 10, 8) : 14;
  const ty = useSharedValue(0);
  useEffect(() => { ty.value = withSpring(hidden ? H + bottom + 30 : 0, SPRING.press); }, [hidden, bottom]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return (
    <Animated.View pointerEvents={hidden ? "none" : "box-none"} style={[{ position: "absolute", left: 16, right: 16, bottom, height: H, flexDirection: "row", gap: 10 }, a]}>
      <View style={[{ flex: 1, height: H, borderRadius: H / 2 }, elevation(2, dark), { shadowOpacity: dark ? 0.5 : 0.12 }]}>
        <Material radius={H / 2} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 }} accessibilityRole="tablist">
          {state.routes.map((route, i) => {
            const on = state.index === i; const label = (descriptors[route.key].options.title ?? route.name) as string;
            const [off, onI] = ICONS[route.name] ?? ["circle", "circle"];
            const press = () => { const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (!e.defaultPrevented && !on) { select(); navigation.navigate(route.name, route.params); } };
            return (
              <Pressable key={route.key} onPress={press} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} testID={`tab-${route.name}`}
                style={{ flex: 1, height: H - 12, borderRadius: (H - 12) / 2, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: on ? (dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)") : "transparent" }}>
                <Icon name={on ? onI : off} size={21} color={on ? c.tint : c.label} />
                <Text variant="caption" style={{ fontSize: 10, lineHeight: 12 }} weight={on ? "600" : "500"} color={on ? c.tint : c.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ApplyFab />
    </Animated.View>
  );
}
