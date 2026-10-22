import { useCallback, useState } from "react";
import { RefreshControl, SectionList, View, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { useTabInset, EmptyState, Button, PressScale, Text, SkeletonRows, SectionHeader } from "../../../components/ui";
import { useColors, S, R, HIT, SIZE } from "../../../lib/theme";
import { listNotifications, markRead, Notification } from "../../../lib/data";
import { useAuth } from "../../../lib/auth";
import { useT } from "../../../lib/i18n";

const isToday = (s: string) => new Date(s).toDateString() === new Date().toDateString();
const time = (s: string, loc?: string) => isToday(s) ? new Date(s).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }) : new Date(s).toLocaleDateString(loc, { day: "numeric", month: "short" });

export default function Notifications() {
  const c = useColors(); const pb = useTabInset(); const { session } = useAuth(); const { t, lang } = useT(); const loc = lang === "ar" ? "ar" : undefined;
  const [items, setItems] = useState<Notification[] | null>(null); const [err, setErr] = useState<string | null>(null); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { if (!session) return; try { setErr(null); setItems(await listNotifications()); } catch (e: any) { setErr(e?.message ?? String(e)); } }, [session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const unreadIds = (items ?? []).filter((n) => !n.read_at).map((n) => n.id);
  const readAll = async () => { await markRead(unreadIds).catch(() => {}); load(); };
  const sections = [{ title: t("Today"), data: (items ?? []).filter((n) => isToday(n.created_at)) }, { title: t("Earlier"), data: (items ?? []).filter((n) => !isToday(n.created_at)) }].filter((s) => s.data.length);
  const header = <Stack.Screen options={{ title: t("Notifications"), headerLargeTitle: false, headerRight: unreadIds.length ? () => <PressScale onPress={readAll} accessibilityRole="button" hitSlop={S.xs} style={{ minHeight: HIT, justifyContent: "center" }}><Text variant="body" tone="accent">{t("Mark all read")}</Text></PressScale> : undefined }} />;
  if (!session) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}>{header}<EmptyState icon="bell" title={t("Sign in to see notifications")} action={<Button title={t("Sign in")} onPress={() => router.navigate("/account")} />} /></View>;
  if (err) return <View style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}>{header}<EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={err} action={<Button title={t("Retry")} variant="secondary" onPress={load} />} /></View>;
  return (
    <>
      {header}
      <SectionList sections={sections} keyExtractor={(n) => n.id} contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: pb, flexGrow: 1 }} stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.accent} />}
        ListHeaderComponent={items === null ? <View style={{ marginTop: S.xl }}><SkeletonRows n={3} leading={S.sm} /></View> : null}
        ListEmptyComponent={items === null ? null : <EmptyState icon="bell.slash" title={t("No notifications")} />}
        renderSectionHeader={({ section }) => <View style={{ marginTop: S.xl }}><SectionHeader title={section.title} /></View>}
        renderItem={({ item: n, index, section }) => {
          const first = index === 0, last = index === section.data.length - 1;
          return (
            <PressScale onPress={async () => { if (!n.read_at) { await markRead([n.id]).catch(() => {}); load(); } if (n.application_id) router.push(`/applications/${n.application_id}`, { withAnchor: true }); }}
              accessibilityRole="button" accessibilityLabel={`${n.read_at ? "" : `${t("Unread")}. `}${n.title}. ${n.body ?? ""}`}
              style={{ marginHorizontal: S.gutter, backgroundColor: c.surface, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", gap: S.sm, minHeight: SIZE.rowTall,
                borderTopStartRadius: first ? R.card : 0, borderTopEndRadius: first ? R.card : 0, borderBottomStartRadius: last ? R.card : 0, borderBottomEndRadius: last ? R.card : 0, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.separator }}>
              <View style={{ width: SIZE.dot, paddingTop: S.xs }}>{!n.read_at && <View style={{ width: SIZE.dot, height: SIZE.dot, borderRadius: R.round, backgroundColor: c.accent }} />}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", gap: S.xs }}>
                  <Text variant="body" weight={n.read_at ? "400" : "600"} style={{ flex: 1 }} numberOfLines={1}>{n.title}</Text>
                  <Text variant="footnote" tone="secondary" tabular>{time(n.created_at, loc)}</Text>
                </View>
                {!!n.body && <Text variant="subhead" tone="secondary" numberOfLines={2}>{n.body}</Text>}
              </View>
            </PressScale>
          );
        }} />
    </>
  );
}
