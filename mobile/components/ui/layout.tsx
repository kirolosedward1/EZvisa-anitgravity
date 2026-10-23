import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, ScrollViewProps, StyleProp, View, ViewStyle, useWindowDimensions } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, S, R, SIZE, DUR, SPRING, curve } from "../../lib/theme";
import { Text } from "./Text";
import { HeaderIconButton, useTabInset } from "./core";

type Edge = "top" | "bottom";
/** Screen wrapper: canvas background, safe-area padding, screen gutter and (optionally) scrolling + keyboard avoidance.
 *  - `edges`: which safe-area edges this screen must clear itself (screens under a native header pass `[]`).
 *  - `tabBar`: bottom padding clears the floating tab bar instead of the home indicator.
 *  - `scroll={false}` renders a plain flex container (for lists that bring their own scroller). */
export function Screen({ children, scroll = true, edges = ["top", "bottom"], tabBar, padded = true, keyboard, top = S.xl, refreshControl, contentStyle, style, scrollProps, testID }: {
  children: React.ReactNode; scroll?: boolean; edges?: Edge[]; tabBar?: boolean; padded?: boolean; keyboard?: boolean; top?: number;
  refreshControl?: ScrollViewProps["refreshControl"]; contentStyle?: StyleProp<ViewStyle>; style?: StyleProp<ViewStyle>; scrollProps?: ScrollViewProps; testID?: string;
}) {
  const c = useColors(); const i = useSafeAreaInsets(); const tabInset = useTabInset();
  const pad: ViewStyle = {
    paddingTop: (edges.includes("top") ? i.top : 0) + top,
    paddingBottom: tabBar ? tabInset : edges.includes("bottom") ? Math.max(i.bottom, S.md) + S.md : S.xl,
    paddingHorizontal: padded ? S.gutter : 0,
  };
  const body = scroll ? (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={[pad, { flexGrow: 1 }, contentStyle]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
      refreshControl={refreshControl} testID={testID} {...scrollProps}>{children}</ScrollView>
  ) : <View style={[{ flex: 1 }, pad, contentStyle]} testID={testID}>{children}</View>;
  return (
    <View style={[{ flex: 1, backgroundColor: c.background }, style]}>
      {keyboard ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>{body}</KeyboardAvoidingView> : body}
    </View>
  );
}

/** Bottom sheet: dimmed backdrop, grabber, optional title + close button, content above the home indicator.
 *  Slides up with a spring (fade with Reduce Motion). Dismiss by tapping the backdrop, the close button, Android back,
 *  or dragging the grabber down. `onClose` fires when the user dismisses; the parent then sets `visible` to false. */
export function Sheet({ visible, onClose, title, children, closeLabel = "Close", testID }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; closeLabel?: string; testID?: string }) {
  const c = useColors(); const i = useSafeAreaInsets(); const reduce = useReducedMotion(); const { height } = useWindowDimensions();
  // Stay mounted while the exit animation runs; mount immediately when opened (state set during render, not in an effect).
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const p = useSharedValue(0); const drag = useSharedValue(0);
  useEffect(() => {
    if (visible) { drag.set(0); p.set(reduce ? withTiming(1, { duration: DUR.fast }) : withSpring(1, SPRING.enter)); }
    else p.set(withTiming(0, { duration: DUR.fast }, (done) => { if (done) runOnJS(setMounted)(false); }));
  }, [visible, reduce, p, drag]);
  const startY = useSharedValue(0);
  const backdrop = useAnimatedStyle(() => ({ opacity: p.get() }));
  const panel = useAnimatedStyle(() => (reduce ? { opacity: p.get(), transform: [{ translateY: drag.get() }] } : { transform: [{ translateY: (1 - p.get()) * height + drag.get() }] }));
  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0, backgroundColor: c.overlay }, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} />
        </Animated.View>
        <Animated.View accessibilityViewIsModal testID={testID} style={[{ backgroundColor: c.surfaceRaised, borderTopStartRadius: R.sheet, borderTopEndRadius: R.sheet, paddingHorizontal: S.gutter, paddingBottom: Math.max(i.bottom, S.md) + S.xs, maxHeight: height - i.top - S.xl }, curve, panel]}>
          <View style={{ paddingTop: S.xs, paddingBottom: S.sm }}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => { startY.set(e.nativeEvent.pageY); }}
            onResponderMove={(e) => { drag.set(Math.max(0, e.nativeEvent.pageY - startY.get())); }}
            onResponderRelease={() => { if (drag.get() > SIZE.sheetDismiss) onClose(); else drag.set(withSpring(0, SPRING.press)); }}
            onResponderTerminate={() => { drag.set(withSpring(0, SPRING.press)); }}>
            <View style={{ alignSelf: "center", width: SIZE.grabberW, height: SIZE.grabberH, borderRadius: R.round, backgroundColor: c.fill }} />
            {!!title && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.sm }}>
                <Text variant="title3" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
                <HeaderIconButton icon="xmark" label={closeLabel} onPress={onClose} />
              </View>
            )}
          </View>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: S.sm }}>{children}</ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
