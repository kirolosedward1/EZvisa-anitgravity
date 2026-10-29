// Toast ("Saved" pill, canvas AutoSave.dc.html) and the sheet scaffolds (Resume, Draft conflict, Delete account,
// Globi explainer, What happens on the day, Discard confirm).
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, S, R, DUR, curve } from "../../lib/theme";
import { useReducedMotion } from "../../lib/motion";
import { useT } from "../../lib/i18n";
import { Text } from "./Text";
import { Icon, type IconName } from "./core";
import { Sheet } from "./layout";
import { Bubble } from "./canvas";
import { GlobiPose, type GlobiPose as Pose } from "../globi/GlobiPose";

// ---------------------------------------------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------------------------------------------

type ToastMsg = { id: number; text: string; icon: IconName; ms: number };
let next = 1;
const listeners = new Set<(m: ToastMsg) => void>();

/** Show a short black pill at the top of the screen. VoiceOver hears it once. */
export function showToast(text: string, { icon = "checkmark", ms = 1500 }: { icon?: IconName; ms?: number } = {}) {
  const m = { id: next++, text, icon, ms };
  listeners.forEach((f) => f(m));
}
/** Saved pill: 1.5 s, no timestamp. Call only once the server has confirmed the save (saves are optimistic). */
export const SAVED_MS = 1500;
export const showSaved = (label = "Saved") => showToast(label, { icon: "checkmark", ms: SAVED_MS });

/** Mount once at the root (app/_layout.tsx). */
export function ToastHost() {
  const [m, setM] = useState<ToastMsg | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const i = useSafeAreaInsets(); const reduce = useReducedMotion(); const { t } = useT();
  useEffect(() => {
    const on = (x: ToastMsg) => {
      setM(x); AccessibilityInfo.announceForAccessibility(t(x.text));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setM((cur) => (cur?.id === x.id ? null : cur)), x.ms);
    };
    listeners.add(on);
    return () => { listeners.delete(on); if (timer.current) clearTimeout(timer.current); };
  }, [t]);
  if (!m) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: i.top + 52, left: 0, right: 0, alignItems: "center", zIndex: 1000 }}>
      <Animated.View key={m.id} entering={reduce ? FadeIn.duration(DUR.fast) : SlideInUp.duration(DUR.base)} exiting={reduce ? FadeOut.duration(DUR.fast) : SlideOutUp.duration(DUR.fast)}
        accessibilityRole="alert" testID="toast"
        style={[{ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 14, borderRadius: R.round, backgroundColor: "#111114" }, curve]}>
        <Icon name={m.icon} size={13} color="#FFFFFF" weight="semibold" />
        <Text variant="footnote" weight="600" color="#FFFFFF" maxFontSizeMultiplier={1.4} style={{ fontSize: 13 }}>{t(m.text)}</Text>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------------------------------------------

/**
 * Bottom sheet with Globi beside the title (canvas Resume, Delete account, Draft conflict) or beside a speech bubble
 * (`bubble`: Globi explainer, What happens on the day). Content below, then `actions` (buttons, stacked).
 */
export function SheetScaffold({ visible, onClose, pose, globiSize = 76, title, line, bubble = false, children, actions, testID }: {
  visible: boolean; onClose: () => void; pose?: Pose; globiSize?: number; title: string; line?: string; bubble?: boolean;
  children?: React.ReactNode; actions?: React.ReactNode; testID?: string;
}) {
  const head = (
    <View style={{ flexDirection: "row", alignItems: bubble ? "flex-end" : "center", gap: bubble ? 6 : S.sm }}>
      {!!pose && <GlobiPose pose={pose} size={globiSize} style={{ margin: -globiSize * 0.08 }} />}
      {bubble ? (
        <Bubble style={{ flex: 1 }}><Text variant="question" accessibilityRole="header">{title}</Text>{!!line && <Text variant="callout" tone="secondary">{line}</Text>}</Bubble>
      ) : (
        <View style={{ flex: 1, gap: 4 }}><Text variant="question" accessibilityRole="header">{title}</Text>{!!line && <Text variant="callout" tone="secondary">{line}</Text>}</View>
      )}
    </View>
  );
  return (
    <Sheet visible={visible} onClose={onClose} testID={testID}>
      <View style={{ gap: S.md }}>
        {head}
        {children}
        {!!actions && <View style={{ gap: 10 }}>{actions}</View>}
      </View>
    </Sheet>
  );
}

/**
 * iOS action sheet (canvas Discard draft): a card with Globi, title, message and the destructive action, and a
 * separate "Keep it" card under it.
 */
export function ActionSheet({ visible, onClose, pose = "thinking", title, message, destructiveLabel, onDestructive, cancelLabel }: {
  visible: boolean; onClose: () => void; pose?: Pose; title: string; message?: string; destructiveLabel: string; onDestructive: () => void; cancelLabel: string;
}) {
  const c = useColors(); const i = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityRole="button" accessibilityLabel={cancelLabel} />
      <View style={{ position: "absolute", left: 12, right: 12, bottom: Math.max(i.bottom, 12), gap: 8 }} accessibilityViewIsModal>
        <View accessibilityRole="alert" style={[{ borderRadius: R.bubble, backgroundColor: c.surfaceRaised, overflow: "hidden" }, curve]}>
          <View style={{ flexDirection: "row", gap: S.sm, alignItems: "center", padding: S.md }}>
            <GlobiPose pose={pose} size={52} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="headline" weight="600">{title}</Text>
              {!!message && <Text variant="note" tone="secondary">{message}</Text>}
            </View>
          </View>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator }} />
          <Pressable onPress={onDestructive} accessibilityRole="button" style={{ minHeight: 56, alignItems: "center", justifyContent: "center" }} testID="action-destructive">
            <Text variant="question" color={c.danger}>{destructiveLabel}</Text>
          </Pressable>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" style={[{ minHeight: 56, borderRadius: R.bubble, backgroundColor: c.surfaceRaised, alignItems: "center", justifyContent: "center" }, curve]} testID="action-cancel">
          <Text variant="question" color={c.accent}>{cancelLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
