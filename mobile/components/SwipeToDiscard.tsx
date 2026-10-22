// Swipe a row toward the leading edge to discard it (the iOS list pattern, built on PanResponder + Reanimated so no new
// native module is needed). A short swipe leaves a red Discard button showing; tapping it discards. A long swipe (past
// half the row) discards at once. The swipe is the confirmation, so neither asks again. RTL swipes the other way.
import { createContext, useContext, useRef, useState } from "react";
import { I18nManager, PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Icon, Text } from "./ui";
import { useColors, S, SPRING, DUR } from "../lib/theme";
import { useT } from "../lib/i18n";
import { medium, select } from "../lib/haptics";

const REVEAL = 96;
/** The screen's ScrollView listens here: while a row is being swiped the list must not scroll (screens set
 *  scrollEnabled={!swiping}). */
export const SwipeLock = createContext<(on: boolean) => void>(() => {});
/** True while this row is dragged or its Discard button shows: the row hides its own trash button and press effect. */
export const SwipeActive = createContext(false);

export function SwipeToDiscard({ onDiscard, radius = 0, enabled = true, testID, children }: { onDiscard: () => void; radius?: number; enabled?: boolean; testID?: string; children: React.ReactNode }) {
  const c = useColors(); const { t, rtl } = useT(); const lock = useContext(SwipeLock);
  const dir = rtl || I18nManager.isRTL ? 1 : -1; // the way the row moves
  const x = useSharedValue(0); const width = useRef(0); const start = useRef(0); const past = useRef(false);
  const [open, setOpen] = useState(false); const [dragging, setDragging] = useState(false); const cooling = useRef(false);
  const snap = (to: number) => { x.value = withSpring(to, SPRING.press); setOpen(to !== 0); };
  const discard = () => { medium(); x.value = withTiming(dir * (width.current || 400), { duration: DUR.fast }, (done) => { if (done) runOnJS(onDiscard)(); }); };
  // While dragging (and briefly after), a cover on the row takes the touch, so the tap that ends a swipe never opens the row.
  const drag = (on: boolean) => { lock(on); if (on) { setDragging(true); return; } cooling.current = true; setTimeout(() => { cooling.current = false; setDragging(false); }, 350); };
  const live = useRef({ snap, discard, enabled, dir, drag }); live.current = { snap, discard, enabled, dir, drag };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => live.current.enabled && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { start.current = x.value; past.current = false; live.current.drag(true); },
    onPanResponderMove: (_, g) => {
      const d = live.current.dir; const v = start.current + g.dx;
      x.value = d < 0 ? Math.min(0, v) : Math.max(0, v);
      const over = Math.abs(x.value) > width.current / 2;
      if (over !== past.current) { past.current = over; select(); } // a tick when a release would discard
    },
    onPanResponderRelease: (_, g) => {
      const { dir: d, snap: s, discard: go, drag: dr } = live.current; const dist = Math.abs(start.current + g.dx); dr(false);
      if (dist > width.current / 2 || (dist > REVEAL && Math.abs(g.vx) > 1.2 && Math.sign(g.vx) === d)) go();
      else s(dist > REVEAL / 2 ? d * REVEAL : 0);
    },
    onPanResponderTerminate: () => { live.current.drag(false); live.current.snap(0); },
  })).current;
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const onLayout = (e: LayoutChangeEvent) => { width.current = e.nativeEvent.layout.width; };
  if (!enabled) return <>{children}</>;
  return (
    <View onLayout={onLayout} style={{ borderRadius: radius, overflow: "hidden" }} testID={testID}>
      {/* Behind the row: red, with the Discard button at the trailing edge. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.red, flexDirection: "row", justifyContent: "flex-end", borderRadius: radius }]}>
        <Pressable onPress={discard} accessibilityRole="button" accessibilityLabel={t("Discard")} testID="swipe-discard"
          style={{ width: REVEAL, alignItems: "center", justifyContent: "center", gap: S.xxs }}>
          <Icon name="trash" size={18} color={c.onAccent} />
          <Text variant="caption" weight="600" color={c.onAccent}>{t("Discard")}</Text>
        </Pressable>
      </View>
      <Animated.View {...pan.panHandlers} style={row}>
        <SwipeActive.Provider value={open || dragging}>{children}</SwipeActive.Provider>
        {/* While the button shows, a tap on the row closes it instead of opening the application. */}
        {(open || dragging) && <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!cooling.current) snap(0); }} accessibilityLabel={t("Close")} />}
      </Animated.View>
    </View>
  );
}
