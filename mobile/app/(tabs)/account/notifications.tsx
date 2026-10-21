import { PressScale } from "../../../components/ui";
import { useCallback, useState } from "react";
import { RefreshControl, SectionList, View, Pressable, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { useTabInset, EmptyState, Button, Text, SkeletonRows, SectionHeader } from "../../../components/ui";
import { useColors, S, R } from "../../../lib/theme";
import { listNotifications, markRead, Notification } from "../../../lib/data";
import { tap } from "../../../lib/haptics";
import { useAuth } from "../../../lib/auth";

const isToday = (s: string) => new Date(s).toDateString() === new Date().toDateString();
const time = (s: string) => isToday(s) ? new Date(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function Notifications() {
  const c = useColors(); const pb = useTabInset(); const { session } = useAuth();
  const [items, setItems] = useState<Notification[] | null>(null); const [err, setErr] = useState<string | null>(null); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { if (!session) return; try { setErr(null); setItems(await listNotifications()); } catch (e: any) { setErr(e?.message ?? String(e)); } }, [session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const unreadIds = (items ?? []).filter((n) => !n.read_at).map((n) => n.id);
  const readAll = async () => { tap(); await markRead(unreadIds).catch(() => {}); load(); };
  const sections = [{ title: "Today", data: (items ?? []).filter((n) => isToday(n.created_at)) }, { title: "Earlier", data: (items ?? []).filter((n) => !isToday(n.created_at)) }].filter((s) => s.data.length);
  const header = <Stack.Screen options={{ title: "Notifications", headerLargeTitle: false, headerRight: unreadIds.length ? () => <PressScale onPress={readAll} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}><Text variant="body" tone="tint">Mark all read</Text></PressScale> : undefined }} />;
  if (!session) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}>{header}<EmptyState icon="bell" title="Sign in to see notifications" action={<Button title="Sign in" onPress={() => router.navigate("/account")} />} /></View>;
  if (err) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}>{header}<EmptyState icon="exclamationmark.triangle.fill" title="Couldn't load" message={err} action={<Button title="Retry" variant="secondary" onPress={load} />} /></View>;
  return (
    <>
      {header}
      <SectionList sections={sections} keyExtractor={(n) => n.id} contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: pb, flexGrow: 1 }} stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.tint} />}
        ListHeaderComponent={items === null ? <View style={{ marginTop: S.xl }}><SkeletonRows n={3} leading={10} /></View> : null}
        ListEmptyComponent={items === null ? null : <EmptyState icon="bell.slash" title="No notifications" />}
        renderSectionHeader={({ section }) => <View style={{ marginTop: S.xl }}><SectionHeader title={section.title} /></View>}
        renderItem={({ item: n, index, section }) => {
          const first = index === 0, last = index === section.data.length - 1;
          return (
            <PressScale onPress={async () => { tap(); if (!n.read_at) { await markRead([n.id]).catch(() => {}); load(); } if (n.application_id) router.push(`/applications/${n.application_id}`, { withAnchor: true }); }}
              accessibilityRole="button" accessibilityLabel={`${n.read_at ? "" : "Unread. "}${n.title}. ${n.body ?? ""}`}
              style={({ pressed }) => ({ marginHorizontal: S.md, backgroundColor: pressed ? c.fill : c.card, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", gap: S.sm, minHeight: 60,
                borderTopLeftRadius: first ? R.card : 0, borderTopRightRadius: first ? R.card : 0, borderBottomLeftRadius: last ? R.card : 0, borderBottomRightRadius: last ? R.card : 0, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.separator })}>
              <View style={{ width: 8, paddingTop: S.xs }}>{!n.read_at && <View style={{ width: 8, height: 8, borderRadius: R.xs, backgroundColor: c.tint }} />}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", gap: S.xs }}>
                  <Text variant="body" weight={n.read_at ? "400" : "600"} style={{ flex: 1 }} numberOfLines={1}>{n.title}</Text>
                  <Text variant="footnote" tone="secondary" tabular>{time(n.created_at)}</Text>
                </View>
                {!!n.body && <Text variant="subhead" tone="secondary" numberOfLines={2}>{n.body}</Text>}
              </View>
            </PressScale>
          );
        }} />
    </>
  );
}
