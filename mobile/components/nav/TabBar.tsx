import { useT } from "../../lib/i18n";
// Liquid Glass tab bar (iOS 26/27 style): floating translucent capsule, thin specular rim, and a glass "lens" pill that
// springs between tabs (stretching in flight, settling back) and can be dragged across tabs. All motion runs on the UI
// thread via Reanimated shared values; the drag uses PanResponder (no new native module, so it works in Expo Go).
// Material: native Liquid Glass (expo-glass-effect GlassView) on iOS 26+, expo-blur elsewhere; translucent fill on Android.
import React, { useEffect, useRef, useState } from "react";
import { Keyboard, PanResponder, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, withSpring, withSequence, withTiming, useReducedMotion, interpolate, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { router, useSegments } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useColors, useIsDark, elevation, SPRING, TAB_BAR_HEIGHT, S, R, ICON, SIZE, DUR } from "../../lib/theme";
import { select, tap } from "../../lib/haptics";
import { Icon, IconName } from "../ui";
import { tabBarCompact, resetTabScroll } from "../../lib/tabBarScroll";
import { useAvatar } from "../../lib/avatar";
import { useAuth } from "../../lib/auth";
import { Image } from "expo-image";

const ICONS: Record<string, [IconName, IconName]> = {
  "(home)": ["house", "house.fill"], "(countries)": ["globe.europe.africa", "globe.europe.africa.fill"],
  applications: ["doc.text", "doc.text.fill"], account: ["person.crop.circle", "person.crop.circle.fill"],
};
const H = TAB_BAR_HEIGHT;
const PAD = S.xs - 2; // lens inset inside the capsule
const COMPACT = 0.14; // how much the bar shrinks while scrolling down
const DOT = 44; // selected circle diameter (the bar height minus its inset)
const TAB_W = 56; // each tab is this wide: the bar hugs its content and sits centred, not edge to edge
const glass = Platform.OS === "ios" && isLiquidGlassAvailable();

function Material({ radius }: { radius: number }) {
  const c = useColors(); const dark = useIsDark();
  const st = [StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" as const }];
  if (glass) return <GlassView glassEffectStyle="regular" style={st} />;
  if (Platform.OS === "android") return <View style={[st, { backgroundColor: c.chrome }]} />;
  return <BlurView intensity={70} tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={[st, { backgroundColor: c.glassTint }]} />;
}

/** Centre "+" (between Countries and Applications): starts a new application via /apply, like the old floating button. */
const FAB = 56; // fixed 56x56 circle; only a uniform press scale, never width/scaleX
function NewAppButton() {
  const c = useColors(); const { t } = useT(); const reduce = useReducedMotion(); const press = useSharedValue(1); const last = useRef(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const open = () => { const now = Date.now(); if (now - last.current < 800) return; last.current = now; tap(); router.push("/apply"); };
  return (
    <View style={{ width: FAB + S.xs, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ width: FAB, height: FAB, borderRadius: FAB / 2, backgroundColor: c.accentFill, shadowColor: c.shadow, shadowOpacity: 0.16, shadowRadius: S.xs, shadowOffset: { width: 0, height: S.xxs }, elevation: 4 }, a]}>
        <Pressable onPress={open} onPressIn={() => { press.value = withSpring(reduce ? 0.96 : 0.9, SPRING.press); }} onPressOut={() => { press.value = withSpring(1, SPRING.press); }}
          accessibilityRole="button" accessibilityLabel={t("New application")} testID="tab-new-application" hitSlop={S.xxs}
          style={{ flex: 1, borderRadius: FAB / 2, alignItems: "center", justifyContent: "center" }}>
          <Icon name="airplane" size={ICON.lg} color={c.onAccent} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const LENS = { damping: 18, stiffness: 220, overshootClamping: true };      // droplet travel: quick with a soft settle
const SETTLE = { damping: 12, stiffness: 320, mass: 0.6 };    // stretch / squash recovery

/** One tab: the icon only (the label is read by VoiceOver), crossfading outline/filled and grey/tint, with a spring scale. */
function Tab({ label, icons, on, progress, reduce, onPress, onLayout, testID, photo }: { label: string; icons: [IconName, IconName]; on: boolean; progress: SharedValue<number>; reduce: boolean; onPress: () => void; onLayout: (e: LayoutChangeEvent) => void; testID: string; photo?: string | null }) {
  const c = useColors();
  useEffect(() => { progress.value = reduce ? withTiming(on ? 1 : 0, { duration: DUR.instant }) : withSpring(on ? 1 : 0, SPRING.pop); }, [on, reduce]);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: reduce ? 1 : interpolate(progress.value, [0, 1], [1, 1.08]) }] }));
  const onA = useAnimatedStyle(() => ({ opacity: progress.value }));
  const offA = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  // Account with a profile photo: the photo in a circle (a tint ring when selected) instead of the icon.
  const both = (name: IconName, color: string, st: any) => (
    <Animated.View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }, st]}>
      {photo ? <View style={{ width: ICON.lg + 6, height: ICON.lg + 6, borderRadius: R.round, borderWidth: 2, borderColor: color === c.accent ? c.accent : "transparent", padding: 1 }}>
          <Image source={{ uri: photo }} style={{ flex: 1, borderRadius: R.round }} contentFit="cover" accessibilityIgnoresInvertColors />
        </View>
        : <Icon name={name} size={ICON.lg} color={color} />}
    </Animated.View>
  );
  return (
    <Pressable onPress={onPress} onLayout={onLayout} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} testID={testID}
      style={{ width: TAB_W, height: H - PAD * 2 }}>
      <Animated.View style={[{ flex: 1 }, scale]}>
        {both(icons[0], c.text, offA)}
        {both(icons[1], c.accent, onA)}
      </Animated.View>
    </Pressable>
  );
}

/** The first screen of each tab's stack (its list). */
const TAB_ROOT: Record<string, string> = { "(home)": "index", "(countries)": "countries", applications: "index", account: "index" };

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const segments = useSegments() as string[];
  const c = useColors(); const dark = useIsDark(); const insets = useSafeAreaInsets(); const reduce = !!useReducedMotion();
  const { session } = useAuth(); const photo = useAvatar(session?.user.id);
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  const focused = state.routes[state.index];
  // Hidden on every pushed/detail screen (also when it's the only route in its stack, e.g. opened from another tab).
  // SDK 58: routes no longer carry nested stack state; derive the focused tab's top screen from the URL segments.
  const top = segments[0] === "(tabs)" && segments[1] === focused.name ? (segments[2] ?? "index") : undefined;
  const hidden = kb || (!!top && !["index", "countries"].includes(top));
  const bottom = insets.bottom > 0 ? Math.max(insets.bottom - S.xs, S.xs) : S.md;
  const ty = useSharedValue(0);
  useEffect(() => { ty.value = withSpring(hidden ? H + bottom + S.x3 : 0, SPRING.press); }, [hidden, bottom]);
  // Compact while the list scrolls down: smaller, still on the same bottom line (lib/tabBarScroll).
  const k = useSharedValue(0);
  useAnimatedReaction(() => tabBarCompact.value, (v) => { k.value = reduce ? withTiming(v, { duration: DUR.instant }) : withSpring(v, SPRING.press); }, [reduce]);
  useEffect(() => { resetTabScroll(); }, [state.index, hidden]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value + k.value * H * COMPACT / 2 }, { scale: 1 - k.value * COMPACT }] }));

  // Lens geometry: tab slots measured on layout; x / w spring to the selected slot.
  const slots = useRef<{ x: number; w: number }[]>([]);
  const x = useSharedValue(0); const w = useSharedValue(0); const sx = useSharedValue(1); const sy = useSharedValue(1); const shown = useSharedValue(0);
  const progress = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  // Row width (the tab-row container the lens lives in). The lens x is always clamped inside it: [PAD, rowW - DOT - PAD].
  const rowW = useRef(0); const lensBase = useRef(0);
  const clampX = (v: number) => (rowW.current > 0 ? Math.min(Math.max(v, PAD), rowW.current - DOT - PAD) : v);
  const moveTo = (i: number, animate = true) => {
    const s = slots.current[i];
    // Nothing is shown until this tab's slot and the row are measured (no stray circle at x = 0 on first render / remount).
    if (!s || !(s.w > 0) || rowW.current <= 0) { shown.value = 0; return; }
    const tx = clampX(s.x) - lensBase.current; // relative to where layout put the lens (left in LTR; Android RTL swaps left/right)
    // First placement (mount, remount, after a re-measure) jumps; only a real tab change animates translateX.
    if (!animate || reduce || !shown.value) { x.value = reduce && shown.value ? withTiming(tx, { duration: DUR.fast }) : tx; w.value = DOT; shown.value = 1; return; }
    x.value = withSpring(tx, LENS); w.value = DOT; // fixed 44x44 circle: only translateX animates
  };
  const onRow = (e: LayoutChangeEvent) => { const nw = e.nativeEvent.layout.width; if (Math.abs(nw - rowW.current) > 0.5) { rowW.current = nw; moveTo(state.index, false); } };
  useEffect(() => { moveTo(state.index); }, [state.index, reduce]);
  // The selected highlight is a circle (DOT x DOT) centred on the tab's icon.
  const onSlot = (i: number) => (e: LayoutChangeEvent) => { const { x: lx, width } = e.nativeEvent.layout; const prev = slots.current[i]; slots.current[i] = { x: lx + (width - DOT) / 2, w: width > 0 ? DOT : 0 };
    if (i === state.index && (!prev || Math.abs(prev.x - slots.current[i].x) > 0.5 || !shown.value)) moveTo(i, false); };
  // Always a true circle at rest (DOT x DOT); the squash/stretch only plays while it travels.
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
  // Drag the lens across tabs (horizontal pans only, so taps and vertical scrolls are untouched); release snaps + selects.
  const nearest = (cx: number) => { let best = state.index, d = 1e9; slots.current.forEach((s, i) => { if (!s) return; const dd = Math.abs(s.x + s.w / 2 - cx); if (dd < d) { d = dd; best = i; } }); return best; };
  const live = useRef({ go, nearest, moveTo, idx: state.index }); live.current = { go, nearest, moveTo, idx: state.index };
  const startX = useRef(0);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { startX.current = x.value; },
    onPanResponderMove: (_, g) => { const max = Math.max(...slots.current.filter(Boolean).map((s) => s.x)); x.value = clampX(Math.min(Math.max(startX.current + lensBase.current + g.dx, PAD), max)) - lensBase.current; },
    onPanResponderRelease: () => { live.current.go(live.current.nearest(x.value + lensBase.current + w.value / 2)); },
    onPanResponderTerminate: () => { live.current.moveTo(live.current.idx); },
  })).current;
  // PanResponder callbacks are created once; keep the latest closures reachable.
  return (
    <Animated.View pointerEvents={hidden ? "none" : "box-none"} style={[{ position: "absolute", left: 0, right: 0, bottom, height: H, alignItems: "center" }, a]}>
      <View style={[{ height: H, borderRadius: H / 2 }, elevation(3, dark), { borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline }]}>
        <Material radius={H / 2} />
        {/* specular rim: a 1pt light edge just inside the outer hairline */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: H / 2, borderWidth: 1, borderColor: c.chromeRim }]} />
        <View {...pan.panHandlers} onLayout={onRow} style={{ height: H, flexDirection: "row", alignItems: "center", paddingHorizontal: PAD, borderRadius: H / 2, overflow: "hidden" }} accessibilityRole="tablist">
          {/* Physical `left` on purpose: the lens is positioned by translateX from measured layout x, which is always
              measured from the left edge, so it lines up in LTR and RTL alike. */}
          <Animated.View pointerEvents="none" testID="tab-lens" onLayout={(e) => { const bx = e.nativeEvent.layout.x; if (Math.abs(bx - lensBase.current) > 0.5) { lensBase.current = bx; moveTo(state.index, false); } }} style={[{ position: "absolute", left: 0, top: (H - DOT) / 2, width: DOT, height: DOT, borderRadius: DOT / 2, overflow: "hidden",
            backgroundColor: c.lens, borderWidth: 1, borderColor: c.lensRim },
            dark ? null : { shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: PAD, shadowOffset: { width: 0, height: 2 } }, lens]}>
            {glass && <GlassView glassEffectStyle="clear" style={[StyleSheet.absoluteFill, { borderRadius: DOT / 2 }]} />}
          </Animated.View>
          {state.routes.map((route, i) => {
            const label = (descriptors[route.key].options.title ?? route.name) as string;
            return (
              <React.Fragment key={route.key}>{i === 2 && <NewAppButton />}
                <Tab label={label} icons={ICONS[route.name] ?? ["circle", "circle"]} on={state.index === i} progress={progress[i]} reduce={reduce} photo={route.name === "account" ? photo : null}
                  onPress={() => live.current.go(i)} onLayout={onSlot(i)} testID={`tab-${route.name}`} />
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}
