// Sticky footer. No application: "Apply for <country>" (no price: the server sets it).
// A draft: "Continue your <country> application". An open case: "View your application" in the secondary style, so a
// second application is never started by accident. A hairline appears on top once content scrolls under it.
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { footerKind, type CountryApp } from "../../lib/countryInfo";
import { useT } from "../../lib/i18n";
import { S, useColors } from "../../lib/theme";
import { Button } from "../ui";

export function CountryFooter({ name, state, loading, onApply, onContinue, onView, under, onLayout }: {
  name: string; state: CountryApp; /** applications not loaded yet: a busy button, never a wrong one */ loading?: boolean; onApply: () => void; onContinue: () => void; onView: () => void;
  /** 1 while content is under the footer, else 0 (drives the hairline). */ under: SharedValue<number>; onLayout: (e: LayoutChangeEvent) => void;
}) {
  const c = useColors(); const i = useSafeAreaInsets(); const { t } = useT();
  const kind = footerKind(state); const country = t(name);
  const line = useAnimatedStyle(() => ({ opacity: under.value }));
  return (
    <View onLayout={onLayout} style={{ position: "absolute", start: 0, end: 0, bottom: 0, paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: Math.max(i.bottom, S.md), backgroundColor: c.background, gap: S.xs }} testID="country-footer">
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, start: 0, end: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.separator }, line]} testID="footer-hairline" />
      {loading && <Button title={t("Apply for {c}", { c: country })} loading onPress={() => {}} />}
      {!loading && kind === "apply" && <Button title={t("Apply for {c}", { c: country })} onPress={onApply} />}
      {!loading && kind === "continue" && <Button title={t("Continue your {c} application", { c: country })} onPress={onContinue} />}
      {!loading && kind === "view" && <Button title={t("View your application")} variant="secondary" onPress={onView} />}
    </View>
  );
}
