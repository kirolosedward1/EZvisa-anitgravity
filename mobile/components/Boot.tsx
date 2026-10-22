// Branded loading. The native splash (expo-splash-screen, EZvisa mark) stays up only while the real startup work runs:
// saved appearance + language, the Supabase session, the saved wizard draft and the onboarding flag. Then the same mark,
// drawn in JS on the same background, fades and scales away in 280 ms. No artificial delay.
import { useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS, useReducedMotion } from "react-native-reanimated";
import { useIsDark } from "../lib/theme";
import { markReady } from "../lib/perf";

SplashScreen.preventAutoHideAsync().catch(() => {});
try { SplashScreen.setOptions({ fade: true, duration: 150 }); } catch { /* not supported on this platform */ }

export const SPLASH_MS = 280;
export function BootOverlay({ ready }: { ready: boolean }) {
  const dark = useIsDark(); const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);
  const o = useSharedValue(1); const s = useSharedValue(1);
  useEffect(() => {
    if (!ready) return;
    markReady();
    SplashScreen.hideAsync().catch(() => {});
    const done = () => setGone(true);
    o.value = withTiming(0, { duration: reduce ? 120 : SPLASH_MS, easing: Easing.out(Easing.quad) }, (f) => { if (f) runOnJS(done)(); });
    if (!reduce) s.value = withTiming(1.12, { duration: SPLASH_MS, easing: Easing.out(Easing.cubic) });
  }, [ready]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  const m = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  if (gone) return null;
  return (
    <Animated.View pointerEvents={ready ? "none" : "auto"} style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "#000000" : "#FFFFFF", alignItems: "center", justifyContent: "center", zIndex: 1000 }, a]}
      accessible accessibilityLabel="EZvisa, loading" accessibilityRole="progressbar" testID="boot-overlay">
      <Animated.View style={m}>
        <Image source={dark ? require("../assets/splash-icon-dark.png") : require("../assets/splash-icon.png")} style={{ width: 180, height: 180 }} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}
