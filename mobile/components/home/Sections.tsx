// Home: Explore countries (6 photo cards) and the FAQ accordion. Content lives in lib/faq.ts and EXPLORE below
// (mirrored for the website in /workspace/ezvisa/home-sections.md and faq.md).
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useReducedMotion, withSpring } from "react-native-reanimated";
import { router } from "expo-router";
import { Text, Icon, Button, SectionHeader } from "../ui";
import { Card } from "../../app/(tabs)/(countries)/countries";
import { useColors, useLargeText, S, R, curve } from "../../lib/theme";
import { SPRING } from "../../theme/tokens";
import { COUNTRY_LIST } from "../../lib/countries";
import { FAQ } from "../../lib/faq";
import { useT } from "../../lib/i18n";
import { select, tap } from "../../lib/haptics";

/** Different from the Popular row on Home. */
export const EXPLORE = ["Belgium", "Denmark", "Sweden", "Norway", "Hungary", "Malta"];

export function Explore() {
  const { t } = useT(); const { width } = useWindowDimensions(); const reduce = useReducedMotion();
  const large = useLargeText(); // one column at accessibility sizes, like the Countries grid
  const w = large ? Math.min(width, 600) - S.lg * 2 : Math.floor((Math.min(width, 600) - S.lg * 2 - S.sm) / 2);
  return (
    <View style={{ marginTop: S.xl }} testID="home-explore">
      <SectionHeader title={t("Explore countries")} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm, paddingHorizontal: S.lg }}>
        {EXPLORE.map((n, i) => (
          <Animated.View key={n} entering={reduce ? undefined : FadeInDown.delay(60 * i).springify().damping(20)}><Card name={n} w={w} ratio={large ? 0.6 : 1.05} /></Animated.View>
        ))}
      </View>
      <View style={{ paddingHorizontal: S.lg, marginTop: S.md }}>
        <Button title={t("View all {n} countries", { n: COUNTRY_LIST.length })} variant="secondary" onPress={() => { tap(); router.navigate("/countries"); }} />
      </View>
    </View>
  );
}

function Row({ q, a, open, last, onPress }: { q: string; a: string; open: boolean; last: boolean; onPress: () => void }) {
  const c = useColors(); const reduce = useReducedMotion();
  const chev = useAnimatedStyle(() => ({ transform: [{ rotate: reduce ? (open ? "180deg" : "0deg") : withSpring(open ? "180deg" : "0deg", SPRING.press) }] }), [open, reduce]);
  return (
    <Animated.View layout={reduce ? undefined : LinearTransition.springify().damping(22).stiffness(240)} style={{ borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.separator }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm, opacity: pressed ? 0.6 : 1 })}>
        <Text variant="body" weight="600" style={{ flex: 1 }}>{q}</Text>
        <Animated.View style={chev}><Icon name="chevron.down" size={14} color={c.tertiaryLabel} weight="semibold" /></Animated.View>
      </Pressable>
      {open && <Animated.View entering={reduce ? undefined : FadeIn.duration(180)} style={{ paddingHorizontal: S.md, paddingBottom: S.md }}><Text variant="subhead" tone="secondary">{a}</Text></Animated.View>}
    </Animated.View>
  );
}

export function FaqSection() {
  const c = useColors(); const { t, lang } = useT(); const [open, setOpen] = useState<string | null>(null);
  const L = lang === "ar" ? "ar" : "en";
  return (
    <View style={{ marginTop: S.xl }} testID="home-faq">
      <SectionHeader title={t("Questions")} />
      <Animated.View layout={LinearTransition.springify().damping(22).stiffness(240)} style={[{ marginHorizontal: S.lg, borderRadius: 24, backgroundColor: c.surface, overflow: "hidden" }, curve]}>
        {FAQ.map((f, i) => <Row key={f.id} q={f.q[L]} a={f.a[L]} open={open === f.id} last={i === FAQ.length - 1} onPress={() => { select(); setOpen((x) => (x === f.id ? null : f.id)); }} />)}
      </Animated.View>
      <View style={{ alignItems: "center", marginTop: S.lg, marginBottom: S.x3 }}>
        <Button title={t("Start application")} size="M" onPress={() => { tap(); router.push("/apply"); }} />
      </View>
    </View>
  );
}
