// Branded loading. The native splash (expo-splash-screen) stays up only while the real startup work runs: saved
// appearance + language, the Supabase session, the saved wizard draft and the onboarding flag. Then the JS splash, the
// small full logo on the flat canvas colour, fades and scales away. It stays at least MIN_SPLASH_MS so the logo doesn't
// flash; with Reduce Motion there is no minimum.
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS, useReducedMotion } from "react-native-reanimated";
import { useColors, useIsDark } from "../lib/theme";
import { markReady } from "../lib/perf";
import { useT } from "../lib/i18n";

SplashScreen.preventAutoHideAsync().catch(() => {});
try { SplashScreen.setOptions({ fade: true, duration: 150 }); } catch { /* not supported on this platform */ }

export const SPLASH_MS = 280;
const MIN_SPLASH_MS = 600;
const LOGO_W = 150;

export function BootOverlay({ ready }: { ready: boolean }) {
  const c = useColors(); const dark = useIsDark(); const reduce = useReducedMotion(); const { t } = useT();
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
    <Animated.View pointerEvents={ready ? "none" : "auto"} style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: "center", justifyContent: "center", zIndex: 1000 }, a]}
      accessible accessibilityLabel={`EZvisa, ${t("Loading")}`} accessibilityRole="progressbar" testID="boot-overlay">
      {/* Very light: the page colour at the top, the card grey at the bottom. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]} />
      <Animated.View style={m}>
        {/* The full logo (mark + "EZvisa"), kept small: 150 pt wide at the file's 873:216 ratio. */}
        <Image source={dark ? require("../assets/logo-dark.png") : require("../assets/logo.png")} style={{ width: LOGO_W, height: Math.round(LOGO_W * 216 / 873) }} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}
