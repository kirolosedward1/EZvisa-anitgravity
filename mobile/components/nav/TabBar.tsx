// Tab bar (canvas Home.dc.html and every tab artboard): a floating white pill with a hairline and a soft shadow, four
// 56 × 48 icon tabs, the selected one filled brand blue with a white icon. No glass, no glow, no centre button (new
// applications start from Home and the Applications "+"). Hidden on detail screens and while the keyboard is up;
// shrinks a little while a list scrolls down (lib/tabBarScroll). Labels are read by VoiceOver.
import React, { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, withSpring, withTiming, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useSegments } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useColors, useIsDark, SPRING, TAB_BAR_HEIGHT, S, ICON, DUR } from "../../lib/theme";
import { select } from "../../lib/haptics";
import { Icon, IconName } from "../ui";
import { tabBarCompact, resetTabScroll } from "../../lib/tabBarScroll";

const ICONS: Record<string, IconName> = { "(home)": "house", "(countries)": "globe.europe.africa", applications: "doc.text", account: "person.crop.circle" };
const H = TAB_BAR_HEIGHT; // 6 + 48 + 6
const PAD = 6;
const TAB_W = 56; const TAB_H = H - PAD * 2;
const COMPACT = 0.12;

/** The first screen of each tab's stack (its list). */
const TAB_ROOT: Record<string, string> = { "(home)": "index", "(countries)": "countries", applications: "index", account: "index" };

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const segments = useSegments() as string[];
  const c = useColors(); const dark = useIsDark(); const insets = useSafeAreaInsets(); const reduce = !!useReducedMotion();
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  const focused = state.routes[state.index];
  // Hidden on every pushed/detail screen. SDK 58: derive the focused tab's top screen from the URL segments.
  const top = segments[0] === "(tabs)" && segments[1] === focused.name ? (segments[2] ?? "index") : undefined;
  const hidden = kb || (!!top && !["index", "countries"].includes(top));
  const bottom = insets.bottom > 0 ? Math.max(insets.bottom - PAD, 12) : S.md;
  const ty = useSharedValue(0);
  useEffect(() => { ty.value = reduce ? withTiming(hidden ? H + bottom + S.x3 : 0, { duration: DUR.fast }) : withSpring(hidden ? H + bottom + S.x3 : 0, SPRING.press); }, [hidden, bottom, reduce]);
  const k = useSharedValue(0);
  useAnimatedReaction(() => tabBarCompact.value, (v) => { k.value = reduce ? withTiming(v, { duration: DUR.instant }) : withSpring(v, SPRING.press); }, [reduce]);
  useEffect(() => { resetTabScroll(); }, [state.index, hidden]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value + (k.value * H * COMPACT) / 2 }, { scale: 1 - k.value * COMPACT }] }));

  const go = (i: number) => {
    const route = state.routes[i]; const on = state.index === i;
    const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!e.defaultPrevented && !on) { select(); navigateToTab(route.key); return; }
    // Tapping the open tab goes back to its list (also when a screen was opened without the list under it).
    const root = TAB_ROOT[route.name];
    if (!e.defaultPrevented && on && root && top && top !== root) {
      if (router.canDismiss()) router.dismissAll();
      else router.replace((route.name === "(home)" ? "/" : `/${root === "index" ? route.name : root}`) as any);
    }
  };

  return (
    <Animated.View pointerEvents={hidden ? "none" : "box-none"} style={[{ position: "absolute", left: 0, right: 0, bottom, height: H, alignItems: "center" }, a]}>
      <View accessibilityRole="tablist" testID="tab-bar"
        style={{ height: H, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: PAD, borderRadius: H / 2, backgroundColor: c.chrome, borderWidth: 1, borderColor: dark ? c.chromeRim : c.border,
          ...(dark ? {} : ({ boxShadow: "0px 8px 24px rgba(0,0,0,0.08)" } as object)) }}>
        {state.routes.map((route, i) => {
          const label = (descriptors[route.key].options.title ?? route.name) as string; const on = state.index === i;
          return (
            <Pressable key={route.key} onPress={() => go(i)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} testID={`tab-${route.name}`}
              style={{ width: TAB_W, height: TAB_H, borderRadius: TAB_H / 2, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.primaryFill : "transparent" }}>
              <Icon name={ICONS[route.name] ?? "circle"} size={ICON.lg} color={on ? c.onPrimary : c.textSecondary} weight="medium" />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
