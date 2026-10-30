// Tab bar: a floating pill of four 56 × 48 icon tabs, the selected one brand blue with a white icon. Owner's request
// (iOS 26+ look): the pill is Liquid Glass (expo-glass-effect, interactive) where the system has it, frosted blur
// elsewhere; the blue selection slides between tabs on a spring and squishes a little on the way, and a tab dips when
// pressed. Reduce Motion: no slide or squish, the selection just moves. The Account tab shows the person's photo when
// they have one. No centre button (new applications start from Home and the Applications "+"). Hidden on detail screens
// and while the keyboard is up; shrinks a little while a list scrolls down (lib/tabBarScroll). Labels are read by VoiceOver.
import React, { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, withSpring, withTiming, withSequence, useReducedMotion, type SharedValue } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { requireOptionalNativeModule } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useSegments } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useColors, useIsDark, SPRING, TAB_BAR_HEIGHT, S, ICON, DUR } from "../../lib/theme";
import { select } from "../../lib/haptics";
import { Avatar, Icon, IconName } from "../ui";
import { useAuth } from "../../lib/auth";
import { useAvatar } from "../../lib/avatar";

// Liquid Glass only when this build has the native view (an over-the-air update can reach an older build) and the
// system supports it (iOS 26+). Everything else gets the frosted blur.
type GlassLib = typeof import("expo-glass-effect");
const glass: GlassLib | null = (() => {
  if (Platform.OS !== "ios") return null;
  try { if (!requireOptionalNativeModule("ExpoGlassEffect")) return null; const g = require("expo-glass-effect") as GlassLib; return g.isLiquidGlassAvailable() ? g : null; } catch { return null; }
})();
const GAP = 4;
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

  const n = state.routes.length;
  // The selection follows each tab's measured place, so it lines up in either reading direction.
  const [xs, setXs] = useState<Record<number, number>>({});
  const x = useSharedValue(-1); const sx = useSharedValue(1);
  const target = xs[state.index];
  useEffect(() => {
    if (target == null) return;
    if (reduce || x.value < 0) { x.value = target; return; } // first placement: no slide in
    x.value = withSpring(target, { damping: 18, stiffness: 220, mass: 0.8 });
    sx.value = withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, { damping: 12, stiffness: 260 }));
  }, [target, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const lens = useAnimatedStyle(() => ({ opacity: x.value < 0 ? 0 : 1, transform: [{ translateX: Math.max(0, x.value) }, { scaleX: sx.value }] }));
  const pill = { height: H, width: PAD * 2 + n * TAB_W + (n - 1) * GAP, borderRadius: H / 2, overflow: "hidden" as const };
  const { session } = useAuth(); const photo = useAvatar(session?.user.id);
  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email || "";

  return (
    <Animated.View pointerEvents={hidden ? "none" : "box-none"} style={[{ position: "absolute", left: 0, right: 0, bottom, height: H, alignItems: "center" }, a]}>
      <View accessibilityRole="tablist" testID="tab-bar"
        style={[pill, { borderWidth: glass ? 0 : 1, borderColor: dark ? c.chromeRim : c.border, overflow: "visible" }, dark || glass ? null : ({ boxShadow: "0px 8px 24px rgba(0,0,0,0.08)" } as object)]}>
        {/* The surface: Liquid Glass, else a frosted blur over a light wash (solid on Android, where blur is costly). */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: H / 2, overflow: "hidden" }]} pointerEvents="none">
          {glass ? <glass.GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" isInteractive colorScheme={dark ? "dark" : "light"} />
            : Platform.OS === "android" ? <View style={[StyleSheet.absoluteFill, { backgroundColor: c.chrome }]} />
            : <><BlurView intensity={40} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} /><View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.6)" }]} /></>}
        </View>
        {/* The selection: brand blue, sliding between tabs. */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: PAD, left: 0, width: TAB_W, height: TAB_H, borderRadius: TAB_H / 2, backgroundColor: c.primaryFill }, lens]} testID="tab-lens" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: GAP, paddingHorizontal: PAD, height: H }}>
          {state.routes.map((route, i) => {
            const label = (descriptors[route.key].options.title ?? route.name) as string; const on = state.index === i;
            const face = route.name === "account" && photo ? <Avatar name={name} size={30} uri={photo} />
              : <Icon name={ICONS[route.name] ?? "circle"} size={ICON.lg} color={on ? c.onPrimary : c.textSecondary} weight="medium" />;
            return <TabButton key={route.key} on={on} label={label} name={route.name} onPress={() => go(i)} reduce={reduce}
              onX={(v) => setXs((m) => (m[i] === v ? m : { ...m, [i]: v }))} photoRing={route.name === "account" && !!photo && on ? c.onPrimary : undefined}>{face}</TabButton>;
          })}
        </View>
      </View>
    </Animated.View>
  );
}

/** One tab: dips to 0.88 while pressed and springs back (no dip with Reduce Motion). */
function TabButton({ on, label, name, onPress, onX, reduce, photoRing, children }: { on: boolean; label: string; name: string; onPress: () => void; onX: (x: number) => void; reduce: boolean; photoRing?: string; children: React.ReactNode }) {
  const p: SharedValue<number> = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: p.value }] }));
  return (
    <Pressable onPress={onPress} onPressIn={() => { if (!reduce) p.value = withSpring(0.88, { damping: 15, stiffness: 400 }); }} onPressOut={() => { p.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      onLayout={(e) => onX(Math.round(e.nativeEvent.layout.x))}
      accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} testID={`tab-${name}`}
      style={{ width: TAB_W, height: TAB_H, borderRadius: TAB_H / 2, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[st, photoRing ? { borderRadius: 17, borderWidth: 2, borderColor: photoRing } : null]}>{children}</Animated.View>
    </Pressable>
  );
}
