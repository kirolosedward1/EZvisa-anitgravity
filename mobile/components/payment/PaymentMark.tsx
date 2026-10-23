// Payment status mark. One view for the whole wait → result morph, so the screen never swaps icons.
//   checking — 72pt #F2F5FF disc, 28pt shield-check, 3pt track + 25% arc spinning every 0.9s, glyph pulse 1→1.06 / 1.2s
//   success  — arc closes (~300ms), then the disc springs in with a slight perspective tilt, a darker-blue offset
//              disc for depth (no glow), and a check stroke drawn with strokeDashoffset. The spring's return is the settle.
//   failure  — the ring turns #B83200 and an exclamation mark shakes once
// Reduce Motion (AccessibilityInfo.isReduceMotionEnabled): the arc stays put and only the pulse runs; success has no tilt.
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, interpolateColor, ReduceMotion, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { Icon } from "../ui";
import { useT } from "../../lib/i18n";

const DISC = 72;
const STROKE = 3;
const RING_R = 41.5;
const BOX = 90;
const CIRC = 2 * Math.PI * RING_R;
const BRAND = "#0436DC";
const PALE = "#F2F5FF";
const TRACK = "#E3E7EF";
const FAILURE = "#B83200";
const SHADOW = "#02208C";
// M 20 37 L 32 49 L 53 26 — a hair longer than the path so a round cap never leaves a dot while hidden.
const CHECK = "M20 37 L32 49 L53 26";
const CHECK_LEN = 50;
const SPIN_MS = 900;
const PULSE_MS = 1200;
const ARC = 0.25;

const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);

export type PaymentMarkMode = "checking" | "success" | "failure";

/** OS Reduce Motion, read from the same API the spec names, and kept live if the setting changes. */
function useOsReduceMotion() {
  const fromReanimated = useReducedMotion();
  const [os, setOs] = useState<boolean | null>(null);
  useEffect(() => {
    let on = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (on) setOs(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOs);
    return () => { on = false; sub.remove(); };
  }, []);
  return os ?? fromReanimated;
}

function Exclamation() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      <Path d="M14 4.5 V17.5" stroke={FAILURE} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={14} cy={22.5} r={1.7} fill={FAILURE} />
    </Svg>
  );
}

export function PaymentMark({ mode, paused = false, label }: { mode: PaymentMarkMode; paused?: boolean; label: string }) {
  const { rtl } = useT();
  const reduce = useOsReduceMotion();
  const reduceRef = useRef(reduce);
  const rtlRef = useRef(rtl);
  useEffect(() => { reduceRef.current = reduce; rtlRef.current = rtl; }, [reduce, rtl]);

  const spin = useSharedValue(0);
  const progress = useSharedValue(ARC);
  const fill = useSharedValue(0);
  const ringOpacity = useSharedValue(1);
  const shadow = useSharedValue(0);
  const discScale = useSharedValue(1);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const check = useSharedValue(1);
  const glyph = useSharedValue(1);
  const pulse = useSharedValue(1);
  const shake = useSharedValue(0);

  // Glyph breathes for the whole wait, including Reduce Motion and the stalled (not spinning) state.
  useEffect(() => {
    if (mode !== "checking") {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    // Never is required: Reanimated otherwise drops the pulse when Reduce Motion is on, and the spec keeps it.
    pulse.value = withRepeat(withTiming(1.06, { duration: PULSE_MS, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }), -1, true, undefined, ReduceMotion.Never);
    return () => cancelAnimation(pulse);
  }, [mode, pulse]);

  // 25% arc, one full turn every 0.9s, linear. Stopped for Reduce Motion and once the wait has stalled.
  useEffect(() => {
    if (mode !== "checking" || reduce || paused) {
      cancelAnimation(spin);
      return;
    }
    const start = spin.value % 360;
    spin.value = start;
    spin.value = withRepeat(withTiming(start + 360, { duration: SPIN_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [mode, reduce, paused, spin]);

  useEffect(() => {
    if (mode === "checking") {
      cancelAnimation(fill); cancelAnimation(shadow); cancelAnimation(discScale);
      cancelAnimation(tiltX); cancelAnimation(tiltY); cancelAnimation(check); cancelAnimation(shake);
      fill.value = withTiming(0, { duration: 160 });
      shadow.value = withTiming(0, { duration: 120 });
      ringOpacity.value = withTiming(1, { duration: 120 });
      discScale.value = withTiming(1, { duration: 120 });
      tiltX.value = 0; tiltY.value = 0;
      check.value = 1; glyph.value = 1; shake.value = 0;
      progress.value = withTiming(ARC, { duration: 160 });
      return;
    }
    if (mode === "failure") {
      const calm = reduceRef.current;
      glyph.value = 1;
      progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      if (!calm) {
        shake.value = withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 80 }),
          withTiming(0, { duration: 70, easing: Easing.out(Easing.cubic) }),
        );
      }
      return;
    }
    // success — one sequence on the UI thread. The arc finishes, then the disc, shadow and check overlap.
    const calm = reduceRef.current;
    const lean = rtlRef.current ? 8 : -8;
    cancelAnimation(shake);
    shake.value = 0;
    progress.value = withTiming(1, { duration: calm ? 160 : 300, easing: Easing.out(Easing.cubic) });
    fill.value = withDelay(calm ? 0 : 300, withTiming(1, { duration: calm ? 160 : 200, easing: Easing.out(Easing.cubic) }));
    ringOpacity.value = withDelay(calm ? 40 : 300, withTiming(0, { duration: calm ? 120 : 200 }));
    shadow.value = withDelay(calm ? 0 : 300, withTiming(1, { duration: calm ? 160 : 240 }));
    glyph.value = withDelay(calm ? 0 : 280, withTiming(0, { duration: calm ? 120 : 180 }));
    discScale.value = calm ? 1 : withDelay(300, withSequence(
      withTiming(0.94, { duration: 80 }),
      withSpring(1.04, { damping: 14, stiffness: 220, mass: 0.6 }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
    ));
    tiltX.value = calm ? 0 : withDelay(300, withSequence(
      withTiming(10, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 480, easing: Easing.inOut(Easing.cubic) }),
    ));
    tiltY.value = calm ? 0 : withDelay(320, withSequence(
      withTiming(lean, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 480, easing: Easing.inOut(Easing.cubic) }),
    ));
    check.value = withDelay(calm ? 80 : 500, withTiming(0, { duration: calm ? 240 : 420, easing: Easing.out(Easing.cubic) }));
  }, [mode, progress, fill, ringOpacity, shadow, discScale, tiltX, tiltY, check, glyph, shake]);

  const arcStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ rotate: `${spin.value - 90}deg` }],
  }));
  const trackStyle = useAnimatedStyle(() => ({ opacity: ringOpacity.value }));
  const sceneStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
      { scale: discScale.value },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: shadow.value,
    transform: [{ translateX: rtl ? -6 : 6 }, { translateY: 8 }],
  }), [rtl]);
  const discStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.value, [0, 1], [PALE, BRAND]),
  }));
  const glyphStyle = useAnimatedStyle(() => ({
    opacity: glyph.value,
    transform: [{ scale: pulse.value }, { translateX: shake.value }],
  }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - progress.value) }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LEN * check.value,
    opacity: check.value > 0.98 ? 0 : 1,
  }));

  const busy = mode === "checking" && !paused;
  return (
    <View
      testID="payment-mark"
      accessible
      accessibilityRole={busy ? "progressbar" : "image"}
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      pointerEvents="none"
      style={{ width: BOX, height: BOX, alignItems: "center", justifyContent: "center" }}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Animated.View style={[StyleSheet.absoluteFill, trackStyle]} pointerEvents="none">
          <Svg width={BOX} height={BOX}>
            <Circle cx={BOX / 2} cy={BOX / 2} r={RING_R} stroke={mode === "failure" ? FAILURE : TRACK} strokeWidth={STROKE} fill="none" />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, arcStyle]} pointerEvents="none">
          <Svg width={BOX} height={BOX}>
            <ACircle
              cx={BOX / 2}
              cy={BOX / 2}
              r={RING_R}
              stroke={mode === "failure" ? FAILURE : BRAND}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`}
              animatedProps={ringProps}
            />
          </Svg>
        </Animated.View>
        <Animated.View style={[{ width: DISC, height: DISC, alignItems: "center", justifyContent: "center" }, sceneStyle]}>
          <Animated.View style={[{ position: "absolute", width: DISC, height: DISC, borderRadius: DISC / 2, backgroundColor: SHADOW }, shadowStyle]} />
          <Animated.View style={[{ width: DISC, height: DISC, borderRadius: DISC / 2, alignItems: "center", justifyContent: "center" }, discStyle]}>
            <Animated.View style={glyphStyle}>
              {mode === "failure" ? <Exclamation /> : <Icon name="shield.checkered" size={28} color={BRAND} weight="semibold" />}
            </Animated.View>
            <Svg width={DISC} height={DISC} viewBox={`0 0 ${DISC} ${DISC}`} style={StyleSheet.absoluteFill}>
              <APath d={CHECK} stroke="#FFFFFF" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={CHECK_LEN} animatedProps={checkProps} />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}
