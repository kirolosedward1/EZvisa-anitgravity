import { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COUNTRY_LIST, POPULAR, toSlug } from "../../../lib/countries";
import { EmptyState, Flag, Icon, ListGroup, ListRow, PressScale, Text, useTabInset } from "../../../components/ui";
import { Field } from "../../../components/AuthForm";
import { useColors, S } from "../../../lib/theme";
import { tap } from "../../../lib/haptics";
import { useT } from "../../../lib/i18n";

const ROW = 52; const INSET = S.md + 28 + S.md; // separator starts under the name
const Row = ({ name }: { name: string }) => { const { t } = useT(); return (
  <ListRow title={t(name)} leading={<Flag country={name} size={28} />} minHeight={ROW} onPress={() => router.push(`/country/${toSlug(name)}`)} />
); };

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
  const scroll = useRef<ScrollView>(null); const ys = useRef<Record<string, number>>({}); const allY = useRef(0); const wrapY = useRef(0);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" testID="countries-list"
        contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb + S.xl, paddingHorizontal: S.lg }}>
        <Text variant="largeTitle" accessibilityRole="header">{tr("Countries")}</Text>
        <Text variant="subhead" tone="secondary" style={{ marginBottom: S.lg }}>{tr("{n} Schengen destinations", { n: COUNTRY_LIST.length })}</Text>
        <Field placeholder={tr("Search")} value={q} onChangeText={setQ} autoCorrect={false} returnKeyType="search" trailing={<Icon name="magnifyingglass" size={16} color={c.secondaryLabel} />} />
        <View onLayout={(e) => { wrapY.current = e.nativeEvent.layout.y; }} style={{ marginHorizontal: -S.md, marginTop: S.xl }}>
          {t ? (
            results.length ? <ListGroup inset={INSET}>{results.map((n) => <Row key={n} name={n} />)}</ListGroup> : <EmptyState icon="magnifyingglass" title={tr("No results")} />
          ) : (<>
            <ListGroup header={tr("Popular")} inset={INSET}>{popular.map((n) => <Row key={n} name={n} />)}</ListGroup>
            <View onLayout={(e) => { allY.current = e.nativeEvent.layout.y; }}>
              <Text variant="title3" accessibilityRole="header" style={{ marginHorizontal: S.lg, marginBottom: S.xs }}>{tr("All countries")}</Text>
              {sections.map(([k, names]) => (
                <View key={k} onLayout={(e) => { ys.current[k] = e.nativeEvent.layout.y; }}>
                  <ListGroup header={k || undefined} inset={INSET} style={{ marginBottom: S.md }}>{names.map((n) => <Row key={n} name={n} />)}</ListGroup>
                </View>
              ))}
            </View>
          </>)}
        </View>
      </ScrollView>
      {!t && !rtl && (
        <View pointerEvents="box-none" style={{ position: "absolute", [rtl ? "left" : "right"]: 2, top: insets.top + 180, bottom: pb, justifyContent: "center" }}>
          <View accessibilityLabel="Section index" style={{ alignItems: "center" }}>
            {sections.map(([k]) => (
              <PressScale key={k} hitSlop={{ left: 12, right: 4 }} accessibilityRole="button" accessibilityLabel={tr("Jump to {k}", { k })}
                onPress={() => { tap(); scroll.current?.scrollTo({ y: wrapY.current + allY.current + (ys.current[k] ?? 0) - insets.top, animated: false }); }}
                style={{ paddingHorizontal: S.xxs, paddingVertical: 1 }}>
                <Text variant="caption2" weight="600" color={c.tint}>{k}</Text>
              </PressScale>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
