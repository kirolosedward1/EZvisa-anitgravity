// Shared motion helpers. Everything honours Reduce Motion (AccessibilityInfo.isReduceMotionEnabled via Reanimated's
// useReducedMotion, which reads the same OS setting and updates live).
import { useEffect } from "react";
import { FadeIn, FadeOut, LinearTransition, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight, useReducedMotion, useSharedValue, withSequence, withTiming, Easing } from "react-native-reanimated";
import { DUR, SPRING } from "./theme";
export { useReducedMotion };

/** Directional slide for Next (dir 1) / Back (dir -1), mirrored in RTL. Spring-based; fade when Reduce Motion is on. */
export function slideIn(dir: number, rtl: boolean, reduce: boolean) {
  if (reduce) return FadeIn.duration(DUR.fast);
  const fromRight = (dir > 0) !== rtl;
  return (fromRight ? SlideInRight : SlideInLeft).springify().damping(SPRING.enter.damping).stiffness(SPRING.enter.stiffness).mass(SPRING.enter.mass);
}
export function slideOut(dir: number, rtl: boolean, reduce: boolean) {
  if (reduce) return FadeOut.duration(120);
  const toLeft = (dir > 0) !== rtl;
  return (toLeft ? SlideOutLeft : SlideOutRight).duration(DUR.fast).easing(Easing.in(Easing.cubic));
}

/** Horizontal shake (inline errors). Returns a shared value for translateX; runs when `key` changes to a truthy value. */
export function useShake(key: unknown) {
  const reduce = useReducedMotion(); const x = useSharedValue(0);
  useEffect(() => {
    if (!key || reduce) return;
    x.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withTiming(-5, { duration: 60 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 50 }));
  }, [key, reduce]);
  return x;
}

/** List insert / remove / reflow: springs on the UI thread (Reanimated layout animations). */
export const LIST_LAYOUT = LinearTransition.springify().damping(SPRING.enter.damping).stiffness(SPRING.enter.stiffness).mass(SPRING.enter.mass);
export const LIST_IN = FadeIn.duration(DUR.fast);
export const LIST_OUT = FadeOut.duration(DUR.fast);
