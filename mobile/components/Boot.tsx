// Branded loading. The native splash (expo-splash-screen, EZvisa mark) stays up only while the real startup work runs:
// saved appearance + language, the Supabase session, the saved wizard draft and the onboarding flag. Then the same mark,
// drawn in JS on the same background, with two rows of Schengen flags drifting in opposite directions, fades and scales away.
// The JS splash stays at least MIN_SPLASH_MS so the flags are seen; with Reduce Motion the rows are still and there is no minimum.
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing, runOnJS, useReducedMotion } from "react-native-reanimated";
import { useIsDark } from "../lib/theme";
import { markReady } from "../lib/perf";
import { COUNTRY_LIST } from "../lib/countries";
import { Flag } from "./ui";

SplashScreen.preventAutoHideAsync().catch(() => {});
try { SplashScreen.setOptions({ fade: true, duration: 150 }); } catch { /* not supported on this platform */ }

export const SPLASH_MS = 280;
const MIN_SPLASH_MS = 1600;
const FLAG = 44; const GAP = 12;
const ROWS = [COUNTRY_LIST.slice(0, 15), COUNTRY_LIST.slice(15)];

const LOGO_W = 150;

/** One row of flags, drawn twice side by side so a linear loop of one row width is seamless. */
function FlagRow({ countries, reverse, reduce }: { countries: string[]; reverse?: boolean; reduce: boolean }) {
  const width = countries.length * (FLAG + GAP);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    x.value = withRepeat(withTiming(-width, { duration: countries.length * 1400, easing: Easing.linear }), -1, false);
  }, [reduce, width]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: reverse ? -width - x.value : x.value }] }));
  return (
    <Animated.View style={[{ flexDirection: "row", width: width * 2 }, style]}>
      {[...countries, ...countries].map((c, i) => <View key={`${c}-${i}`} style={{ marginRight: GAP }}><Flag country={c} size={FLAG} /></View>)}
    </Animated.View>
  );
}

export function BootOverlay({ ready }: { ready: boolean }) {
  const dark = useIsDark(); const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const mountedAt = useRef(0);
  useEffect(() => { mountedAt.current = Date.now(); }, []);
  const o = useSharedValue(1); const s = useSharedValue(1);
  useEffect(() => {
    if (!ready) return;
    markReady();
    SplashScreen.hideAsync().catch(() => {});
    const done = () => setGone(true);
    const wait = reduce ? 0 : Math.max(0, MIN_SPLASH_MS - (Date.now() - mountedAt.current));
    const t = setTimeout(() => {
      o.value = withTiming(0, { duration: reduce ? 120 : SPLASH_MS, easing: Easing.out(Easing.quad) }, (f) => { if (f) runOnJS(done)(); });
      if (!reduce) s.value = withTiming(1.12, { duration: SPLASH_MS, easing: Easing.out(Easing.cubic) });
    }, wait);
    return () => clearTimeout(t);
  }, [ready]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  const m = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  if (gone) return null;
  return (
    <Animated.View pointerEvents={ready ? "none" : "auto"} style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "#000000" : "#FFFFFF", alignItems: "center", justifyContent: "center", zIndex: 1000 }, a]}
      accessible accessibilityLabel="EZvisa, loading" accessibilityRole="progressbar" testID="boot-overlay">
      <Animated.View style={m}>
        {/* The full logo (mark + "EZvisa"), kept small: 150 pt wide at the file's 873:216 ratio. */}
        <Image source={dark ? require("../assets/logo-dark.png") : require("../assets/logo.png")} style={{ width: LOGO_W, height: Math.round(LOGO_W * 216 / 873) }} resizeMode="contain" />
      </Animated.View>
      <View style={{ position: "absolute", bottom: "18%", left: 0, right: 0, gap: GAP, overflow: "hidden" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <FlagRow countries={ROWS[0]} reduce={reduce} />
        <FlagRow countries={ROWS[1]} reverse reduce={reduce} />
      </View>
    </Animated.View>
  );
}
