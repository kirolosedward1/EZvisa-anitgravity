// Sticky footer. No application: "Apply for <country>" with the turnaround under it (no price: the server sets it).
// A draft: "Continue your <country> application". An open case: "View your application" in the secondary style, so a
// second application is never started by accident. A hairline appears on top once content scrolls under it.
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { footerKind, type CountryApp } from "../../lib/countryInfo";
import { useT } from "../../lib/i18n";
import { S, useColors } from "../../lib/theme";
import { Button, Text } from "../ui";

/** «يوم إلى يومين» when the footnote fits on one line, otherwise the shorter «1–2 أيام عمل». */
function ReadyWhen() {
  const { t } = useT();
  const long = t("Your file is ready in a day or two");
  const short = t("Your file is ready in 1–2 days");
  const [width, setWidth] = useState(0);
  const [lines, setLines] = useState(1);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && <Text variant="footnote" style={{ position: "absolute", opacity: 0, width }} onTextLayout={(e) => setLines(e.nativeEvent.lines.length)}>{long}</Text>}
      <Text variant="footnote" tone="secondary" center>{lines > 1 ? short : long}</Text>
    </View>
  );
}

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
      {!loading && kind === "apply" && <>
        <Button title={t("Apply for {c}", { c: country })} onPress={onApply} />
        <ReadyWhen />
      </>}
      {!loading && kind === "continue" && <Button title={t("Continue your {c} application", { c: country })} onPress={onContinue} />}
      {!loading && kind === "view" && <Button title={t("View your application")} variant="secondary" onPress={onView} />}
    </View>
  );
}
