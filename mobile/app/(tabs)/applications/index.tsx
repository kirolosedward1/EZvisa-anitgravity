import { useState } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SegmentedControl, EmptyState, Skeleton, Button, Flag, StatusPill, Text, Icon, PressScale, useTabInset, journeyIndex } from "../../../components/ui";
import { useColors, S, R, curve } from "../../../lib/theme";
import { STATUS_LABEL, type Application } from "../../../lib/data";
import { useApps, ACTIVE } from "../../../lib/useApps";
import { tap } from "../../../lib/haptics";

const fmt = (s?: string | null) => (s ? new Date(s + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

function AppCard({ a }: { a: Application }) {
  const c = useColors(); const name = a.countries?.name ?? "Application"; const idx = journeyIndex(a.status);
  return (
    <PressScale onPress={() => { tap(); router.push(`/applications/${a.id}`); }} accessibilityRole="button" accessibilityLabel={`${name}, ${a.reference}, ${STATUS_LABEL[a.status] ?? a.status}`}
      style={[{ borderRadius: R.card, backgroundColor: c.card, padding: S.lg, gap: S.lg }, curve]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <Flag country={name} size={44} />
        <View style={{ flex: 1 }}><Text variant="title3" numberOfLines={1}>{name}</Text><Text variant="footnote" tone="secondary" tabular>{[a.reference, a.entry_date && `${fmt(a.entry_date)} – ${fmt(a.exit_date)}`].filter(Boolean).join(" · ")}</Text></View>
        <Icon name="chevron.right" size={13} color={c.tertiaryLabel} weight="semibold" />
      </View>
      <View style={{ gap: S.xs }}>
        <View style={{ flexDirection: "row", gap: 4 }}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= idx ? c.tint : c.surface2 }} />)}</View>
        <StatusPill v={a.status} />
      </View>
    </PressScale>
  );
}

export default function Applications() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets();
  const { session, apps, err, refreshing, refresh } = useApps();
  const [tab, setTab] = useState<"active" | "past">("active");
  const list = (apps ?? []).filter((a) => (tab === "active" ? ACTIVE(a.status) : !ACTIVE(a.status)));
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb, paddingHorizontal: S.lg, flexGrow: 1 }}
      refreshControl={session ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.tint} /> : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text variant="largeTitle" accessibilityRole="header" style={{ marginBottom: S.lg }}>Applications</Text>
      {!session ? (
        <View style={{ flex: 1, justifyContent: "center", paddingBottom: 80 }}>
          <EmptyState icon="doc.text" title="Your applications live here" action={<Button title="Sign in" onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />} />
        </View>
      ) : (<>
        <View style={{ marginBottom: S.xl }}><SegmentedControl label="Filter" options={[{ value: "active", label: "Active" }, { value: "past", label: "Past" }]} value={tab} onChange={(v) => setTab(v as any)} /></View>
        {!!err && <EmptyState icon="exclamationmark.triangle.fill" title="Couldn't load" message={err} action={<Button title="Retry" variant="secondary" onPress={refresh} />} />}
        {!err && apps === null && <View style={{ gap: S.sm }}><Skeleton h={140} r={R.card} /><Skeleton h={140} r={R.card} /></View>}
        {!err && apps && list.length === 0 && (
          <View style={{ flex: 1, justifyContent: "center", paddingBottom: 80 }}>
            <EmptyState icon="airplane" title={tab === "active" ? "No active applications" : "Nothing here yet"} action={tab === "active" ? <Button title="Start application" onPress={() => router.push("/apply")} /> : undefined} />
          </View>
        )}
        <View style={{ gap: S.sm }}>{list.map((a) => <AppCard key={a.id} a={a} />)}</View>
      </>)}
    </ScrollView>
  );
}
