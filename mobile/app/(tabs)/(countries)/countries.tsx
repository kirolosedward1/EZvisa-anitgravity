import { useMemo, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COUNTRY_LIST, POPULAR, toSlug } from "../../../lib/countries";
import { EmptyState, Flag, Icon, PressScale, Text, useTabInset } from "../../../components/ui";
import { Field } from "../../../components/AuthForm";
import { useColors, S, R, curve } from "../../../lib/theme";
import { tap } from "../../../lib/haptics";

/** Fixed two-column width so every tile (incl. an odd last one) is identical and left-aligned. */
export const useTileWidth = () => { const { width } = useWindowDimensions(); return Math.floor((Math.min(width, 600) - S.lg * 2 - S.sm) / 2); };

function Tile({ name }: { name: string }) {
  const c = useColors(); const w = useTileWidth();
  return (
    <PressScale onPress={() => { tap(); router.push(`/country/${toSlug(name)}`); }} accessibilityRole="button" accessibilityLabel={name}
      style={[{ width: w, borderRadius: R.card, backgroundColor: c.card, padding: S.md, gap: S.lg, minHeight: 128 }, curve]}>
      <Flag country={name} size={44} />
      <Text variant="headline" numberOfLines={1}>{name}</Text>
    </PressScale>
  );
}

export default function Countries() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const results = useMemo(() => COUNTRY_LIST.filter((n) => n.toLowerCase().includes(t)), [t]);
  const rest = COUNTRY_LIST.filter((n) => !POPULAR.includes(n));
  return (
    <ScrollView style={{ backgroundColor: c.bg }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb, paddingHorizontal: S.lg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="largeTitle" accessibilityRole="header">Countries</Text>
      <Text variant="subhead" tone="secondary" style={{ marginBottom: S.lg }}>{COUNTRY_LIST.length} Schengen destinations</Text>
      <Field placeholder="Search" value={q} onChangeText={setQ} autoCorrect={false} returnKeyType="search" trailing={<Icon name="magnifyingglass" size={16} color={c.secondaryLabel} />} />
      {t ? (
        results.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.xl }}>{results.map((n) => <Tile key={n} name={n} />)}</View> : <EmptyState icon="magnifyingglass" title="No results" />
      ) : (<>
        <Text variant="title3" style={{ marginTop: S.xxl, marginBottom: S.sm }} accessibilityRole="header">Popular</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>{POPULAR.slice(0, 4).map((n) => <Tile key={n} name={n} />)}</View>
        <Text variant="title3" style={{ marginTop: S.xxl, marginBottom: S.sm }} accessibilityRole="header">All countries</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>{[...POPULAR.slice(4), ...rest].sort().map((n) => <Tile key={n} name={n} />)}</View>
      </>)}
    </ScrollView>
  );
}
