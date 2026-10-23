import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COUNTRY_LIST, POPULAR, toSlug } from "../../../lib/countries";
import { EmptyState, Flag, Icon, ListGroup, ListRow, PressScale, Text, useTabInset } from "../../../components/ui";
import { Field } from "../../../components/AuthForm";
import { useColors, S, R, ICON, curve } from "../../../lib/theme";
import { PHOTOS } from "../../../lib/photos";
import { select } from "../../../lib/haptics";
import { useT } from "../../../lib/i18n";
import { onTabScroll } from "../../../lib/tabBarScroll";

const INSET = S.md + 28 + S.md; // separator starts under the name (flag is 28)
/** The A-Z index starts below the title and search field. */
const INDEX_TOP = 180;
const Row = ({ name }: { name: string }) => { const { t } = useT(); return (
  <ListRow title={t(name)} leading={<Flag country={name} />} onPress={() => router.push(`/country/${toSlug(name)}`)} />
); };

/** Grid card: the country photo, a dark fade at the bottom, flag + name in capitals, then the Schengen short-stay limit. */
export function Card({ name, w, ratio = 1.3 }: { name: string; w: number; ratio?: number }) {
  const c = useColors(); const { t } = useT(); const slug = toSlug(name); const on = c.onAccent;
  return (
    <PressScale onPress={() => { select(); router.push(`/country/${slug}`); }} accessibilityRole="button" accessibilityLabel={t(name)} testID="country-card"
      style={[{ width: w, height: Math.round(w * ratio), borderRadius: R.card, overflow: "hidden", backgroundColor: c.card }, curve]}>
      <Image source={PHOTOS[slug]} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" accessibilityIgnoresInvertColors />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.9)"]} locations={[0.3, 0.62, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, justifyContent: "flex-end", padding: S.md, gap: S.sm }}>
        <View style={{ alignItems: "center", gap: S.xs }}>
          <Flag country={name} size={24} />
          <Text variant="headline" weight="700" color={on} center numberOfLines={1} adjustsFontSizeToFit style={{ letterSpacing: 1 }}>{t(name).toLocaleUpperCase()}</Text>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: on, opacity: 0.35, marginHorizontal: S.md }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="caption" weight="600" color={on} style={{ opacity: 0.7, letterSpacing: 1 }}>{t("STAY")}</Text>
          <Text variant="caption" weight="700" color={on} style={{ letterSpacing: 1 }}>{t("90 DAYS")}</Text>
        </View>
      </View>
    </PressScale>
  );
}
const Grid = ({ names, w }: { names: string[]; w: number }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm, paddingHorizontal: S.gutter, marginBottom: S.xl }}>{names.map((n) => <Card key={n} name={n} w={w} />)}</View>
);
const VIEW_KEY = "ezvisa.countries.view.v1"; // list or grid, a device preference

export default function Countries() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets();
  const [q, setQ] = useState(""); const { t: tr, rtl } = useT();
  const t = q.trim().toLowerCase();
  const results = useMemo(() => COUNTRY_LIST.filter((n) => n.toLowerCase().includes(t) || tr(n).includes(q.trim())), [t, q, tr]);
  const popular = POPULAR.slice(0, 4);
  const sections = useMemo(() => {
    if (rtl) return [["", [...COUNTRY_LIST].sort((x, y) => tr(x).localeCompare(tr(y), "ar"))]] as [string, string[]][]; // Arabic: one list in Arabic order, no Latin index
    const m = new Map<string, string[]>();
    [...COUNTRY_LIST].sort().forEach((n) => { const k = n[0].toUpperCase(); m.set(k, [...(m.get(k) ?? []), n]); });
    return [...m.entries()];
  }, [rtl, tr]);
  const { width } = useWindowDimensions(); const cardW = Math.floor((width - S.gutter * 2 - S.sm) / 2);
  const [grid, setGrid] = useState(true); // the photo grid is the default; "list" is remembered when chosen
  useEffect(() => { AsyncStorage.getItem(VIEW_KEY).then((v) => setGrid(v !== "list")).catch(() => {}); }, []);
  const setView = (g: boolean) => { select(); setGrid(g); AsyncStorage.setItem(VIEW_KEY, g ? "grid" : "list").catch(() => {}); };
  const scroll = useRef<ScrollView>(null); const ys = useRef<Record<string, number>>({}); const allY = useRef(0); const wrapY = useRef(0);
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView onScroll={onTabScroll} scrollEventThrottle={16} ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" testID="countries-list"
        contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb + S.xl, paddingHorizontal: S.gutter }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="largeTitle" accessibilityRole="header">{tr("Countries")}</Text>
          {/* List or grid */}
          <View style={{ flexDirection: "row", backgroundColor: c.fill, borderRadius: R.round, padding: 2 }} accessibilityRole="radiogroup">
            {([[false, "list.bullet", "List"], [true, "square.grid.2x2", "Grid"]] as const).map(([g, icon, label]) => (
              <PressScale key={label} onPress={() => setView(g)} accessibilityRole="radio" accessibilityState={{ checked: grid === g }} accessibilityLabel={tr(label)} testID={`view-${label.toLowerCase()}`}
                style={{ width: 36, height: 30, borderRadius: R.round, alignItems: "center", justifyContent: "center", backgroundColor: grid === g ? c.bg : "transparent" }}>
                <Icon name={icon} size={ICON.sm + 2} color={grid === g ? c.accent : c.textSecondary} />
              </PressScale>
            ))}
          </View>
        </View>
        <Text variant="subhead" tone="secondary" style={{ marginBottom: S.xl }}>{tr("{n} Schengen destinations", { n: COUNTRY_LIST.length })}</Text>
        <Field placeholder={tr("Search")} value={q} onChangeText={setQ} autoCorrect={false} returnKeyType="search" trailing={<Icon name="magnifyingglass" size={ICON.md} color={c.textSecondary} />} />
        <View onLayout={(e) => { wrapY.current = e.nativeEvent.layout.y; }} style={{ marginHorizontal: -S.gutter, paddingEnd: !t && !rtl && !grid ? S.xs : 0, marginTop: S.xl }}>
          {t ? (
            !results.length ? <EmptyState icon="magnifyingglass" title={tr("No results")} />
              : grid ? <Grid names={results} w={cardW} /> : <ListGroup inset={INSET}>{results.map((n) => <Row key={n} name={n} />)}</ListGroup>
          ) : grid ? (<>
            <Text variant="title3" accessibilityRole="header" style={{ marginHorizontal: S.gutter, marginBottom: S.sm }}>{tr("Popular")}</Text>
            <Grid names={popular} w={cardW} />
            <Text variant="title3" accessibilityRole="header" style={{ marginHorizontal: S.gutter, marginBottom: S.sm }}>{tr("All countries")}</Text>
            <Grid names={[...COUNTRY_LIST].sort((x, y) => tr(x).localeCompare(tr(y), rtl ? "ar" : undefined))} w={cardW} />
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
          <View accessibilityLabel="Section index" style={{ alignItems: "center" }}>
            {sections.map(([k]) => (
              <PressScale key={k} hitSlop={{ top: 0, bottom: 0, left: S.sm, right: S.sm }} accessibilityRole="button" accessibilityLabel={tr("Jump to {k}", { k })}
                onPress={() => { select(); scroll.current?.scrollTo({ y: wrapY.current + allY.current + (ys.current[k] ?? 0) - insets.top, animated: false }); }}
                style={{ paddingHorizontal: S.xxs }}>
                <Text variant="caption2" weight="600" color={c.accent}>{k}</Text>
              </PressScale>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
