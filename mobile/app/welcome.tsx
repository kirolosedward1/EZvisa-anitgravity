import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Logo } from "../components/Logo";
import { Button, Flag, Text } from "../components/ui";
import { useColors, S } from "../lib/theme";
import { markWelcomed } from "../lib/onboarding";
import { useT } from "../lib/i18n";

// Flags arranged on two orbits around the centre.
const ORBIT = [
  ["France", 330], ["Italy", 30], ["Spain", 90], ["Germany", 150], ["Greece", 210], ["Switzerland", 270],
  ["Netherlands", 60], ["Portugal", 120], ["Austria", 240], ["Sweden", 300],
] as const;

export default function Welcome() {
  const c = useColors(); const insets = useSafeAreaInsets(); const { width } = useWindowDimensions(); const reduce = useReducedMotion(); const { t } = useT();
    const R1 = Math.min(width * 0.38, 168), R2 = R1 * 0.7, box = R1 * 2 + S.x5;
  const go = async (to: "/" | "/auth") => { await markWelcomed(); router.replace("/"); if (to === "/auth") setTimeout(() => router.push({ pathname: "/auth", params: { mode: "signin" } }), 50); };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, S.lg) }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View entering={reduce ? undefined : FadeIn.duration(300)} style={{ width: box, height: box }}>
          {ORBIT.map(([n, deg], i) => {
            const r = i < 6 ? R1 : R2; const size = i < 6 ? 56 : 40; const a = (deg * Math.PI) / 180;
            return <View key={n} style={{ position: "absolute", left: box / 2 + r * Math.cos(a) - size / 2, top: box / 2 + r * Math.sin(a) - size / 2 }}><Flag country={n} size={size} /></View>;
          })}
        </Animated.View>
        <View style={{ position: "absolute", alignItems: "center" }}><Logo height={34} /></View>
      </View>
      <Animated.View entering={reduce ? undefined : FadeInDown.delay(120).springify().damping(22).stiffness(240)} style={{ paddingHorizontal: S.xl, gap: S.xs }}>
        <Text variant="largeTitle" center accessibilityRole="header">{t("Schengen visa")}</Text>
        <View style={{ height: S.xxl }} />
        <Button title={t("Get started")} onPress={() => go("/")} />
        <Button title={t("Sign in")} variant="plain" color={c.label} onPress={() => go("/auth")} />
      </Animated.View>
    </View>
  );
}
