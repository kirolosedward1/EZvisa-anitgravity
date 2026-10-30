// Countries (canvas Countries.dc.html): title, search, filter chips, Globi's tip, then two columns of country tiles
// (round flag, name, "Stay up to 90 days"). Filters are the data the app has: popular destinations and the visa centre
// provider (lib/visaCentres). The canvas chips "Fastest appointments" and "Beach" have no data behind them, so they
// are not shown. Home's search opens this screen with ?q=.
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COUNTRY_LIST, POPULAR, toSlug } from "../../../lib/countries";
import { centreFor } from "../../../lib/visaCentres";
import { GlobiPose } from "../../../components/globi/GlobiPose";
import { Card as Surface, EmptyState, Flag, PressScale, SearchField, Text, useTabInset } from "../../../components/ui";
import { useColors, useIsDark, useLargeText, S, R, curve } from "../../../lib/theme";
import { select } from "../../../lib/haptics";
import { useT } from "../../../lib/i18n";
import { onTabScroll } from "../../../lib/tabBarScroll";

type Filter = "all" | "popular" | "vfs" | "tls" | "bls";
const inFilter = (n: string, f: Filter) => f === "all" ? true : f === "popular" ? POPULAR.includes(n) : centreFor(n)?.key === f;
/** Canvas tile tints, repeated down the grid (dark mode uses the elevated surface). */
const TINTS = ["#E8ECFB", "#E6E6E3", "#EDE9DD", "#E3E8EC", "#E4EBF0", "#EBE6E3"];

/** One country tile (canvas): soft tint, flag, name, the 90-day stay line. Exported for Home's "See all" parity. */
export function Card({ name, index }: { name: string; index: number }) {
  const c = useColors(); const dark = useIsDark(); const { t } = useT(); const big = useLargeText();
  return (
    <PressScale onPress={() => { select(); router.push(`/country/${toSlug(name)}`); }} accessibilityRole="button" accessibilityLabel={`${t(name)}, ${t("Stay up to 90 days")}`} testID="country-card"
      style={[{ width: big ? "100%" : "48.5%", minHeight: 120, borderRadius: R.card, padding: 14, justifyContent: "space-between", backgroundColor: dark ? c.surface : TINTS[index % TINTS.length] }, curve]}>
      <Flag country={name} size={28} />
      <View style={{ gap: 2 }}>
        <Text variant="row" weight="600" numberOfLines={2}>{t(name)}</Text>
        <Text variant="footnote" tone="secondary">{t("Stay up to 90 days")}</Text>
      </View>
    </PressScale>
  );
}

export default function Countries() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets(); const { t, rtl } = useT();
  const p = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(typeof p.q === "string" ? p.q : "");
  const [filter, setFilter] = useState<Filter>("all");
  const sorted = useMemo(() => [...COUNTRY_LIST].sort((x, y) => t(x).localeCompare(t(y), rtl ? "ar" : undefined)), [t, rtl]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    // "All" shows the popular destinations first, then the rest A to Z.
    const base = filter === "all" && !s ? [...POPULAR, ...sorted.filter((n) => !POPULAR.includes(n))] : sorted;
    return base.filter((n) => inFilter(n, filter) && (!s || n.toLowerCase().includes(s) || t(n).includes(q.trim())));
  }, [filter, q, sorted, t]);
  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: t("All {n}", { n: COUNTRY_LIST.length }) }, { key: "popular", label: t("Popular") },
    { key: "vfs", label: "VFS Global" }, { key: "tls", label: "TLScontact" }, { key: "bls", label: "BLS" },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView onScroll={onTabScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" testID="countries-list"
        contentContainerStyle={{ paddingTop: insets.top + S.md, paddingBottom: pb + S.xl, paddingHorizontal: S.gutter, gap: S.md }}>
        <Text variant="pageTitle" accessibilityRole="header">{t("Countries")}</Text>
        <SearchField placeholder={t("Search destinations")} value={q} onChangeText={setQ} testID="countries-search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter }} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.xs }} accessibilityRole="radiogroup" testID="country-filters">
          {FILTERS.map((f) => { const on = filter === f.key; return (
            <PressScale key={f.key} onPress={() => { select(); setFilter(f.key); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={f.label}
              style={{ minHeight: 34, paddingHorizontal: 14, borderRadius: R.round, justifyContent: "center", backgroundColor: on ? c.primaryFill : c.surface, borderWidth: 1, borderColor: on ? c.primaryFill : c.border }}>
              <Text variant="callout" weight={on ? "600" : "500"} color={on ? c.onPrimary : c.label}>{f.label}</Text>
            </PressScale>
          ); })}
        </ScrollView>
        <Surface padded style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.sm }}>
          <GlobiPose pose="magnify" size={47} style={{ margin: -4 }} />
          <Text variant="callout" style={{ flex: 1 }}>{t("Apply through the country where you'll spend the most nights.")}</Text>
        </Surface>
        {!results.length ? <EmptyState icon="magnifyingglass" mascot={<GlobiPose pose="magnify" size={120} />} title={t("No results")} /> : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>
            {results.map((n, i) => <Card key={n} name={n} index={i} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
