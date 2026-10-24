// Liquid Glass tab bar (iOS 26/27 style): a floating translucent capsule with a thin specular rim, and a selection
// capsule that springs between tabs and can be dragged across them. All motion runs on the UI thread via Reanimated
// shared values; the drag uses PanResponder (no new native module, so it works in Expo Go).
// Material: native Liquid Glass (expo-glass-effect GlassView) on iOS 26+, expo-blur elsewhere; a translucent fill on Android.
//
// HIG › Tab bars: tabs navigate and never act (starting an application lives in the content and in the Applications
// toolbar, not here), every tab shows its label, and the bar stays visible on every screen inside a tab. It only
// steps aside for the keyboard and for modal screens, which cover it.
import React, { useEffect, useRef, useState } from "react";
import { Keyboard, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, withSpring, withTiming, useReducedMotion, interpolate, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { router, useSegments } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useColors, useIsDark, elevation, SPRING, TAB_BAR_HEIGHT, S, R, ICON, DUR } from "../../lib/theme";
import { select } from "../../lib/haptics";
import { Icon, IconName, Text, tabBarBottom } from "../ui";
import { tabBarCompact, resetTabScroll } from "../../lib/tabBarScroll";
import { useAvatar } from "../../lib/avatar";
import { useAuth } from "../../lib/auth";
import { Image } from "expo-image";

const ICONS: Record<string, [IconName, IconName]> = {
  "(home)": ["house", "house.fill"], "(countries)": ["globe.europe.africa", "globe.europe.africa.fill"],
  applications: ["doc.text", "doc.text.fill"], account: ["person.crop.circle", "person.crop.circle.fill"],
};
const H = TAB_BAR_HEIGHT;
const PAD = S.xxs; // selection inset inside the capsule
const LENS_H = H - PAD * 2; // the selection capsule covers the icon and its label
const COMPACT = 0.14; // how much the bar shrinks while a list scrolls down
/** Tab width: the bar hugs its tabs and sits centred, between these bounds so labels like "Applications" fit. */
const TAB_MIN = 72, TAB_MAX = 92;
const glass = Platform.OS === "ios" && isLiquidGlassAvailable();

function Material({ radius }: { radius: number }) {
  const c = useColors(); const dark = useIsDark();
  const st = [StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" as const }];
  if (glass) return <GlassView glassEffectStyle="regular" style={st} />;
  if (Platform.OS === "android") return <View style={[st, { backgroundColor: c.chrome }]} />;
  return <BlurView intensity={70} tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={[st, { backgroundColor: c.glassTint }]} />;
}

const LENS = { damping: 18, stiffness: 220, overshootClamping: true }; // selection travel: quick with a soft settle

/** One tab: icon over its label (HIG › Tab bars › "Include tab labels"), crossfading outline/filled and label/accent.
 *  Labels stay one size, as on iOS, where tab titles don't grow with Dynamic Type. */
function Tab({ label, icons, on, progress, reduce, width, onPress, onLayout, testID, photo }: { label: string; icons: [IconName, IconName]; on: boolean; progress: SharedValue<number>; reduce: boolean; width: number; onPress: () => void; onLayout: (e: LayoutChangeEvent) => void; testID: string; photo?: string | null }) {
  const c = useColors();
  useEffect(() => { progress.value = reduce ? withTiming(on ? 1 : 0, { duration: DUR.instant }) : withSpring(on ? 1 : 0, SPRING.pop); }, [on, reduce]);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: reduce ? 1 : interpolate(progress.value, [0, 1], [1, 1.06]) }] }));
  const onA = useAnimatedStyle(() => ({ opacity: progress.value }));
  const offA = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  // Account with a profile photo: the photo in a circle (an accent ring when selected) instead of the icon.
  const glyph = (name: IconName, color: string, st: any) => (
    <Animated.View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }, st]}>
      {photo ? <View style={{ width: ICON.lg + 4, height: ICON.lg + 4, borderRadius: R.round, borderWidth: 1.5, borderColor: color === c.accent ? c.accent : "transparent", padding: 1 }}>
          <Image source={{ uri: photo }} style={{ flex: 1, borderRadius: R.round }} contentFit="cover" accessibilityIgnoresInvertColors />
        </View>
        : <Icon name={name} size={ICON.lg} color={color} />}
    </Animated.View>
  );
  return (
    <Pressable onPress={onPress} onLayout={onLayout} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} testID={testID}
      style={{ width, height: LENS_H, alignItems: "center", justifyContent: "center", gap: 2 }}>
      <Animated.View style={[{ width: ICON.lg + 6, height: ICON.lg + 4 }, scale]}>
        {glyph(icons[0], c.text, offA)}
        {glyph(icons[1], c.accent, onA)}
      </Animated.View>
      <Text variant="caption2" weight={on ? "600" : "500"} color={on ? c.accent : c.text} numberOfLines={1} maxFontSizeMultiplier={1} importantForAccessibility="no" accessibilityElementsHidden>{label}</Text>
    </Pressable>
  );
}

/** The first screen of each tab's stack (its list). */
const TAB_ROOT: Record<string, string> = { "(home)": "index", "(countries)": "countries", applications: "index", account: "index" };

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const segments = useSegments() as string[];
  const c = useColors(); const dark = useIsDark(); const insets = useSafeAreaInsets(); const reduce = !!useReducedMotion();
  const { width: winW } = useWindowDimensions();
  const { session } = useAuth(); const photo = useAvatar(session?.user.id);
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  const n = state.routes.length;
  const tabW = Math.round(Math.min(TAB_MAX, Math.max(TAB_MIN, (Math.min(winW, 480) - S.md * 2 - PAD * 2) / n)));
  const focused = state.routes[state.index];
  // The focused tab's top screen, from the URL segments (SDK 58 routes no longer carry nested stack state). Used to
  // send a second tap on the open tab back to its list.
  const top = segments[0] === "(tabs)" && segments[1] === focused.name ? (segments[2] ?? "index") : undefined;
  const hidden = kb;
  const bottom = tabBarBottom(insets.bottom);
  const ty = useSharedValue(0);
  useEffect(() => { ty.value = reduce ? withTiming(hidden ? H + bottom + S.x3 : 0, { duration: DUR.fast }) : withSpring(hidden ? H + bottom + S.x3 : 0, SPRING.press); }, [hidden, bottom, reduce]);
  // Compact while a list scrolls down: smaller, still on the same bottom line (lib/tabBarScroll).
  const k = useSharedValue(0);
  useAnimatedReaction(() => tabBarCompact.value, (v) => { k.value = reduce ? withTiming(v, { duration: DUR.instant }) : withSpring(v, SPRING.press); }, [reduce]);
  useEffect(() => { resetTabScroll(); }, [state.index, top]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value + k.value * H * COMPACT / 2 }, { scale: 1 - k.value * COMPACT }] }));

  // Selection geometry: tab slots measured on layout; x springs to the selected slot.
  const slots = useRef<{ x: number; w: number }[]>([]);
  const x = useSharedValue(0); const shown = useSharedValue(0);
  const progress = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  // Row width (the tab-row container the selection lives in). Its x is always clamped inside it.
  const rowW = useRef(0); const lensBase = useRef(0);
  const clampX = (v: number) => (rowW.current > 0 ? Math.min(Math.max(v, PAD), rowW.current - tabW - PAD) : v);
  const moveTo = (i: number, animate = true) => {
    const s = slots.current[i];
    // Nothing is shown until this tab's slot and the row are measured (no stray capsule at x = 0 on first render).
    if (!s || !(s.w > 0) || rowW.current <= 0) { shown.value = 0; return; }
    const tx = clampX(s.x) - lensBase.current; // relative to where layout put the capsule (left in LTR; Android RTL swaps)
    // First placement (mount, remount, after a re-measure) jumps; only a real tab change animates.
    if (!animate || reduce || !shown.value) { x.value = reduce && shown.value ? withTiming(tx, { duration: DUR.fast }) : tx; shown.value = 1; return; }
    x.value = withSpring(tx, LENS);
  };
  const onRow = (e: LayoutChangeEvent) => { const nw = e.nativeEvent.layout.width; if (Math.abs(nw - rowW.current) > 0.5) { rowW.current = nw; moveTo(state.index, false); } };
  useEffect(() => { moveTo(state.index); }, [state.index, reduce, tabW]);
  const onSlot = (i: number) => (e: LayoutChangeEvent) => { const { x: lx, width } = e.nativeEvent.layout; const prev = slots.current[i]; slots.current[i] = { x: lx, w: width };
    if (i === state.index && (!prev || Math.abs(prev.x - lx) > 0.5 || !shown.value)) moveTo(i, false); };
  const lens = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: x.value }] }));

  const go = (i: number) => {
    const route = state.routes[i]; const on = state.index === i;
    const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!e.defaultPrevented && !on) { select(); navigateToTab(route.key); return; }
    moveTo(state.index);
    // Tapping the open tab goes back to its list. The stack pops to the top on its own; but a screen opened without the
    // list under it (after a payment, Continue, a notification) is the stack's only screen, so reset the stack to the list.
    const root = TAB_ROOT[route.name];
    if (!e.defaultPrevented && on && root && top && top !== root) {
      if (router.canDismiss()) router.dismissAll();
      else router.replace((route.name === "(home)" ? "/" : `/${root === "index" ? route.name : root}`) as any);
    }
  };
  // Drag the selection across tabs (horizontal pans only, so taps and vertical scrolls are untouched); release snaps + selects.
  const nearest = (cx: number) => { let best = state.index, d = 1e9; slots.current.forEach((s, i) => { if (!s) return; const dd = Math.abs(s.x + s.w / 2 - cx); if (dd < d) { d = dd; best = i; } }); return best; };
  const live = useRef({ go, nearest, moveTo, idx: state.index, tabW }); live.current = { go, nearest, moveTo, idx: state.index, tabW };
  const startX = useRef(0);
  // PanResponder callbacks are created once; they reach the latest closures through `live`.
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { startX.current = x.value; },
    onPanResponderMove: (_, g) => { const max = Math.max(...slots.current.filter(Boolean).map((s) => s.x)); x.value = clampX(Math.min(Math.max(startX.current + lensBase.current + g.dx, PAD), max)) - lensBase.current; },
    onPanResponderRelease: () => { live.current.go(live.current.nearest(x.value + lensBase.current + live.current.tabW / 2)); },
    onPanResponderTerminate: () => { live.current.moveTo(live.current.idx); },
  })).current;
  return (
    <Animated.View pointerEvents={hidden ? "none" : "box-none"} style={[{ position: "absolute", left: 0, right: 0, bottom, height: H, alignItems: "center" }, a]}>
      <View style={[{ height: H, borderRadius: H / 2 }, elevation(3, dark), { borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline }]}>
        <Material radius={H / 2} />
        {/* specular rim: a 1pt light edge just inside the outer hairline */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: H / 2, borderWidth: 1, borderColor: c.chromeRim }]} />
        <View {...pan.panHandlers} onLayout={onRow} style={{ height: H, flexDirection: "row", alignItems: "center", paddingHorizontal: PAD, borderRadius: H / 2, overflow: "hidden" }} accessibilityRole="tablist">
          {/* Physical `left` on purpose: the selection is positioned by translateX from the measured layout x, which is
              always measured from the left edge, so it lines up in LTR and RTL alike. One fill, no glass on glass. */}
          <Animated.View pointerEvents="none" testID="tab-lens" onLayout={(e) => { const bx = e.nativeEvent.layout.x; if (Math.abs(bx - lensBase.current) > 0.5) { lensBase.current = bx; moveTo(state.index, false); } }}
            style={[{ position: "absolute", left: 0, top: PAD, width: tabW, height: LENS_H, borderRadius: LENS_H / 2, backgroundColor: c.lens }, lens]} />
          {state.routes.map((route, i) => {
            const label = (descriptors[route.key].options.title ?? route.name) as string;
            return (
              <Tab key={route.key} label={label} icons={ICONS[route.name] ?? ["circle", "circle"]} on={state.index === i} progress={progress[i]} reduce={reduce} width={tabW} photo={route.name === "account" ? photo : null}
                onPress={() => live.current.go(i)} onLayout={onSlot(i)} testID={`tab-${route.name}`} />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}
