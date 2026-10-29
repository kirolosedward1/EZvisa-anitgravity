import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COUNTRY_LIST, POPULAR, toSlug } from "../../../lib/countries";
import { centreFor } from "../../../lib/visaCentres";
import { GlobiPose } from "../../../components/globi/GlobiPose";
import { EmptyState, Flag, Icon, ListGroup, ListRow, PressScale, SearchField, Text, useTabInset } from "../../../components/ui";
import { useColors, useLargeText, S, R, HIT, ICON, curve } from "../../../lib/theme";
import { PHOTOS } from "../../../lib/photos";
import { select } from "../../../lib/haptics";
import { useT } from "../../../lib/i18n";
import { onTabScroll } from "../../../lib/tabBarScroll";

const INSET = S.md + 28 + S.md; // separator starts under the name (flag is 28)
/** The A-Z index starts below the title and search field. */
const INDEX_TOP = 180;
const Row = ({ name }: { name: string }) => { const { t } = useT(); const vc = centreFor(name); return (
  <ListRow title={t(name)} subtitle={vc ? `${vc.provider} · ${t("Dubai")}, ${t("Abu Dhabi")}` : undefined} leading={<Flag country={name} size={40} />} onPress={() => router.push(`/country/${toSlug(name)}`)} />
); };
type Filter = "all" | "popular" | "vfs" | "tls" | "bls";
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "popular", label: "Popular" }, { key: "vfs", label: "VFS Global" }, { key: "tls", label: "TLScontact" }, { key: "bls", label: "BLS" }];
const inFilter = (n: string, f: Filter) => f === "all" ? true : f === "popular" ? POPULAR.includes(n) : centreFor(n)?.key === f;

/** Grid card: the country photo, a dark fade at the bottom, then the flag and the name. (Every Schengen country has
 *  the same 90-day limit, so the card no longer repeats it: the country screen states it once, under "At a glance".) */
export function Card({ name, w, ratio = 1.3 }: { name: string; w: number; ratio?: number }) {
  const c = useColors(); const { t } = useT(); const slug = toSlug(name); const on = c.onAccent;
  return (
    <PressScale onPress={() => { select(); router.push(`/country/${slug}`); }} accessibilityRole="button" accessibilityLabel={t(name)} testID="country-card"
      style={[{ width: w, height: Math.round(w * ratio), borderRadius: R.card, overflow: "hidden", backgroundColor: c.card }, curve]}>
      <Image source={PHOTOS[slug]} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" accessibilityIgnoresInvertColors />
      {/* Flat scrim behind the name (no gradients anywhere, canvas rule). */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "rgba(0,0,0,0.5)" }} />
      <View style={{ flex: 1, justifyContent: "flex-end", padding: S.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
          <Flag country={name} size={24} />
          <Text variant="title3" color={on} numberOfLines={2} style={{ flexShrink: 1 }}>{t(name)}</Text>
        </View>
      </View>
    </PressScale>
  );
}
/** Two columns; one wide column at accessibility text sizes (HIG › Typography › "Reduce the number of columns when the
 *  font size increases"), so a name is never broken across lines inside a narrow photo. */
const Grid = ({ names, w, ratio }: { names: string[]; w: number; ratio?: number }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm, paddingHorizontal: S.gutter, marginBottom: S.xl }}>{names.map((n) => <Card key={n} name={n} w={w} ratio={ratio} />)}</View>
);
const VIEW_KEY = "ezvisa.countries.view.v1"; // list or grid, a device preference

export default function Countries() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets();
  const [q, setQ] = useState(""); const { t: tr, rtl } = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const t = q.trim().toLowerCase() || (filter !== "all" ? " " : ""); // a filter behaves like a search: one flat result list
  const results = useMemo(() => COUNTRY_LIST.filter((n) => inFilter(n, filter) && (!q.trim() || n.toLowerCase().includes(q.trim().toLowerCase()) || tr(n).includes(q.trim()))), [filter, q, tr]);
  const popular = POPULAR.slice(0, 4);
  const sections = useMemo(() => {
    if (rtl) return [["", [...COUNTRY_LIST].sort((x, y) => tr(x).localeCompare(tr(y), "ar"))]] as [string, string[]][]; // Arabic: one list in Arabic order, no Latin index
    const m = new Map<string, string[]>();
    [...COUNTRY_LIST].sort().forEach((n) => { const k = n[0].toUpperCase(); m.set(k, [...(m.get(k) ?? []), n]); });
    return [...m.entries()];
  }, [rtl, tr]);
  const { width } = useWindowDimensions(); const large = useLargeText();
  const cardW = large ? width - S.gutter * 2 : Math.floor((width - S.gutter * 2 - S.sm) / 2); const ratio = large ? 0.6 : undefined;
  const [grid, setGrid] = useState(true); // the photo grid is the default; "list" is remembered when chosen
  useEffect(() => { AsyncStorage.getItem(VIEW_KEY).then((v) => setGrid(v !== "list")).catch(() => {}); }, []);
  const setView = (g: boolean) => { select(); setGrid(g); AsyncStorage.setItem(VIEW_KEY, g ? "grid" : "list").catch(() => {}); };
  const scroll = useRef<ScrollViewInstance>(null); const ys = useRef<Record<string, number>>({}); const allY = useRef(0); const wrapY = useRef(0);
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView onScroll={onTabScroll} scrollEventThrottle={16} ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" testID="countries-list"
        contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb + S.xl, paddingHorizontal: S.gutter }}>
        <View style={{ flexDirection: large ? "column-reverse" : "row", alignItems: large ? "flex-start" : "center", justifyContent: "space-between", gap: S.xs }}>
          <Text variant="largeTitle" accessibilityRole="header" style={{ flexShrink: 1 }}>{tr("Countries")}</Text>
          {/* List or grid */}
          <View style={{ flexDirection: "row", alignSelf: "flex-end", backgroundColor: c.fill, borderRadius: R.round, padding: 2 }} accessibilityRole="radiogroup" accessibilityLabel={tr("View")}>
            {([[false, "list.bullet", "List"], [true, "square.grid.2x2", "Grid"]] as const).map(([g, icon, label]) => (
              <PressScale key={label} onPress={() => setView(g)} accessibilityRole="radio" accessibilityState={{ checked: grid === g }} accessibilityLabel={tr(label)} testID={`view-${label.toLowerCase()}`}
                hitSlop={{ top: S.xxs, bottom: S.xxs }} style={{ width: HIT, height: 36, borderRadius: R.round, alignItems: "center", justifyContent: "center", backgroundColor: grid === g ? c.bg : "transparent" }}>
                <Icon name={icon} size={ICON.sm + 2} color={grid === g ? c.accent : c.textSecondary} />
              </PressScale>
            ))}
          </View>
        </View>
        <Text variant="subhead" tone="secondary" style={{ marginBottom: S.xl }}>{tr("{n} Schengen destinations", { n: COUNTRY_LIST.length })}</Text>
        <SearchField placeholder={tr("Search {n} Schengen countries", { n: COUNTRY_LIST.length })} value={q} onChangeText={setQ} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter, marginTop: S.sm }} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.xs }} accessibilityRole="radiogroup" testID="country-filters">
          {FILTERS.map((f) => { const on = filter === f.key; return (
            <PressScale key={f.key} onPress={() => { select(); setFilter(f.key); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={tr(f.label)}
              style={{ minHeight: 36, paddingHorizontal: S.md, borderRadius: R.round, justifyContent: "center", backgroundColor: on ? c.primaryFill : c.surface, borderWidth: 1, borderColor: on ? c.primaryFill : c.border }}>
              <Text variant="subhead" weight="600" color={on ? c.onPrimary : c.label}>{tr(f.label)}</Text>
            </PressScale>
          ); })}
        </ScrollView>
        <View style={[{ flexDirection: "row", gap: S.sm, alignItems: "flex-start", backgroundColor: c.accentSoft, borderRadius: R.lg, padding: S.sm, marginTop: S.md }, curve]}>
          <Icon name="info.circle" size={ICON.md} color={c.accent} style={{ marginTop: 1 }} />
          <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>{tr("Same visa for all 29. Apply at the embassy of the country where you stay the most nights.")}</Text>
        </View>
        <View onLayout={(e) => { wrapY.current = e.nativeEvent.layout.y; }} style={{ marginHorizontal: -S.gutter, paddingEnd: !t && !rtl && !grid ? S.xs : 0, marginTop: S.lg }}>
          {t ? (
            !results.length ? <EmptyState icon="magnifyingglass" mascot={<GlobiPose pose="magnify" size={120} />} title={tr("No results")} />
              : grid ? <Grid names={results} w={cardW} ratio={ratio} /> : <ListGroup inset={INSET}>{results.map((n) => <Row key={n} name={n} />)}</ListGroup>
          ) : grid ? (<>
            <Text variant="title3" accessibilityRole="header" style={{ marginHorizontal: S.gutter, marginBottom: S.sm }}>{tr("Popular")}</Text>
            <Grid names={popular} w={cardW} ratio={ratio} />
            <Text variant="title3" accessibilityRole="header" style={{ marginHorizontal: S.gutter, marginBottom: S.sm }}>{tr("All countries")}</Text>
            <Grid names={[...COUNTRY_LIST].sort((x, y) => tr(x).localeCompare(tr(y), rtl ? "ar" : undefined))} w={cardW} ratio={ratio} />
          </>) : (<>
            <ListGroup header={tr("Popular")} inset={INSET}>{popular.map((n) => <Row key={n} name={n} />)}</ListGroup>
            <View onLayout={(e) => { allY.current = e.nativeEvent.layout.y; }}>
              <Text variant="title3" accessibilityRole="header" style={{ marginHorizontal: S.gutter, marginBottom: S.xs }}>{tr("All countries")}</Text>
              {sections.map(([k, names]) => (
                <View key={k} onLayout={(e) => { ys.current[k] = e.nativeEvent.layout.y; }}>
                  <ListGroup header={k || undefined} inset={INSET} style={{ marginBottom: S.md }}>{names.map((n) => <Row key={n} name={n} />)}</ListGroup>
                </View>
              ))}
            </View>
          </>)}
        </View>
      </ScrollView>
      {!t && !rtl && !grid && (
        <View pointerEvents="box-none" style={{ position: "absolute", end: S.xxs, top: insets.top + INDEX_TOP, bottom: pb, justifyContent: "center" }}>
          <View accessibilityLabel={tr("Section index")} style={{ alignItems: "center" }}>
            {sections.map(([k]) => (
              <PressScale key={k} hitSlop={{ top: 0, bottom: 0, left: S.sm, right: S.sm }} accessibilityRole="button" accessibilityLabel={tr("Jump to {k}", { k })}
                onPress={() => { select(); scroll.current?.scrollTo({ y: wrapY.current + allY.current + (ys.current[k] ?? 0) - insets.top, animated: false }); }}
                style={{ paddingHorizontal: S.xxs }}>
                <Text variant="caption2" weight="600" color={c.accent} maxFontSizeMultiplier={1.2}>{k}</Text>
              </PressScale>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
