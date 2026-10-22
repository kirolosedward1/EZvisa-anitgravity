import { PressScale } from "./ui";
import { Image, Pressable, ScrollView, View, useWindowDimensions, Platform } from "react-native";
import { Stack, router, useLocalSearchParams, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { fromSlug } from "../lib/countries";
import { PHOTOS } from "../lib/photos";
import { CAPITALS } from "../lib/capitals";
import { Button, EmptyState, Flag, Text, Icon, IconName } from "./ui";
import { useColors, useIsDark, S, R, curve } from "../lib/theme";
import { tap } from "../lib/haptics";

const FACTS = [["90", "days max"], ["C", "Schengen"], ["24–48h", "processing"]];
const DOCS: [IconName, string][] = [["person.text.rectangle" as IconName, "Passport"], ["creditcard.fill", "Emirates ID & UAE visa"], ["camera.fill" as IconName, "Photo 35×45 mm"], ["building.columns.fill" as IconName, "Bank statements"], ["doc.text.fill", "Salary certificate / NOC"], ["cross.case.fill" as IconName, "Travel insurance"]];

export default function CountryDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors(); const dark = useIsDark(); const insets = useSafeAreaInsets(); const { height } = useWindowDimensions();
  const name = fromSlug(slug ?? "");
  const segs = useSegments() as string[];
  const back = () => { tap(); if (router.canGoBack()) router.back(); else router.replace(segs.includes("(home)") ? "/" : "/countries"); };
  if (!name) return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}>
      <Stack.Screen options={{ headerShown: false }} />
      <EmptyState icon="exclamationmark.triangle.fill" title="Not found" action={<Button title="Back" variant="secondary" onPress={back} />} />
    </View>
  );
  const heroH = Math.round(height * 0.44);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
        <Image source={PHOTOS[slug!]} style={{ width: "100%", height: heroH, backgroundColor: c.card }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={[{ marginTop: -S.xxl, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: c.bg, paddingHorizontal: S.lg, paddingTop: S.xl }, curve]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}>
            <Flag country={name} size={56} />
            <View style={{ flex: 1 }}>
              <Text variant="largeTitle" accessibilityRole="header">{name}</Text>
              <Text variant="subhead" tone="secondary">{CAPITALS[name]?.city}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: S.sm, marginTop: S.xl }}>
            {FACTS.map(([v, l]) => (
              <View key={l} style={[{ flex: 1, borderRadius: R.tile, backgroundColor: c.card, paddingVertical: S.md, paddingHorizontal: S.sm, alignItems: "center", gap: S.xxs }, curve]} accessible accessibilityLabel={`${v} ${l}`}>
                <Text variant="title2" tabular numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
                <Text variant="footnote" tone="secondary">{l}</Text>
              </View>
            ))}
          </View>
          <Text variant="title3" style={{ marginTop: S.xxl, marginBottom: S.xs }} accessibilityRole="header">{"What you'll need"}</Text>
          {DOCS.map(([i, d]) => (
            <View key={d} style={{ flexDirection: "row", alignItems: "center", gap: S.md, minHeight: 52 }}>
              <View style={{ width: 36, height: 36, borderRadius: R.xl, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name={i} size={16} color={c.tint} /></View>
              <Text variant="body">{d}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <PressScale onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}
        style={{ position: "absolute", top: insets.top + S.xs, left: S.md, width: 44, height: 44, borderRadius: R.round, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        <BlurView intensity={50} tint={dark ? "dark" : "light"} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Platform.OS === "android" ? c.glassTint : undefined }} />
        <Icon name="chevron.left" size={16} color={c.label} weight="bold" />
      </PressScale>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: Math.max(insets.bottom, S.lg), backgroundColor: c.bg }}>
        <Button title={`Apply for ${name}`} onPress={() => router.push({ pathname: "/apply", params: { step: "personal", to: name } })} />
      </View>
    </View>
  );
}
