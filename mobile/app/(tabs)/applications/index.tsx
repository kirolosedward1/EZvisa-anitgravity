import { useState } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Globi } from "../../../components/mascot/Globi";
import { Chevron, SegmentedControl, EmptyState, Skeleton, Button, Flag, StatusPill, StatusPills, Text, Icon, PressScale, useTabInset, ProgressSegments } from "../../../components/ui";
import { buildTimeline, doneCount } from "../../../lib/timeline";
import { useT, ltr } from "../../../lib/i18n";
import { useColors, useIsDark, S, R, HIT, card } from "../../../lib/theme";
import { STATUS_LABEL, type Application } from "../../../lib/data";
import { nextAction } from "../../../lib/nextStep";
import { useApps, ACTIVE } from "../../../lib/useApps";
import { tap } from "../../../lib/haptics";
import { askDiscard, isAbandoned } from "../../../lib/discard";
import Animated from "react-native-reanimated";
import { LIST_LAYOUT, LIST_IN, LIST_OUT } from "../../../lib/motion";
import { SwipeToDiscard, SwipeLock, SwipeActive } from "../../../components/SwipeToDiscard";
import { useContext } from "react";
import { onTabScroll } from "../../../lib/tabBarScroll";

const fmt = (s?: string | null) => (s ? new Date(s + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
/** "13 Jan – 20 Jan"; one date when there is no return date or it is the same day. */
const range = (a?: string | null, b?: string | null) => (!a ? "" : !b || b.slice(0, 10) === a.slice(0, 10) ? fmt(a) : `${fmt(a)} – ${fmt(b)}`);

function AppCard({ a, onDiscard }: { a: Application; onDiscard?: () => void }) {
  const c = useColors(); const dark = useIsDark(); const { t } = useT(); const name = a.countries?.name ?? "Application"; const steps = buildTimeline(a); const swiping = useContext(SwipeActive);
  const act = nextAction(a);
  const people = a.applicants.map((p) => p.first_name).filter(Boolean).join(` ${t("and")} `);
  return (
    <PressScale onPress={() => { tap(); router.push((nextAction(a)?.href ?? `/applications/${a.id}`) as any); }} onLongPress={onDiscard ? () => askDiscard(onDiscard, t) : undefined} accessibilityRole="button" accessibilityLabel={`${t(name)}, ${a.reference}, ${t(STATUS_LABEL[a.status] ?? a.status)}`}
      accessibilityActions={onDiscard ? [{ name: "discard", label: t("Discard") }] : undefined} onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === "discard" && onDiscard) askDiscard(onDiscard, t); }} lift={!swiping} disabled={swiping} scaleTo={swiping ? 1 : undefined}
      style={[card(c, dark, 1), act && { borderColor: c.accent }, { padding: S.md, gap: S.md }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.xs }}>
        <StatusPills a={a} />
        <Text variant="caption" tone="tertiary" tabular numberOfLines={1}>{ltr(a.reference)}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <Flag country={name} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="headline" numberOfLines={1}>{[t(name), a.travel_purpose && t(a.travel_purpose)].filter(Boolean).join(" · ")}</Text>
          <Text variant="footnote" tone="secondary" numberOfLines={1} tabular>{[people, ltr(range(a.entry_date, a.exit_date))].filter(Boolean).join(" · ")}</Text>
        </View>
        {onDiscard ? (
          // At rest the trash is invisible and untappable (swipe or long-press to discard). VoiceOver uses the
          // discard action on the card (HIG › Accessibility › "Offer alternatives to gestures").

          <PressScale disabled={!swiping} onPress={() => askDiscard(onDiscard, t)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("Discard")} accessibilityElementsHidden={!swiping} importantForAccessibility={swiping ? "auto" : "no-hide-descendants"} testID="app-discard"
            // Web: also out of the accessibility tree and tab order at rest.
            aria-hidden={!swiping} tabIndex={swiping ? 0 : -1} focusable={swiping} accessible={swiping}
            pointerEvents={swiping ? "auto" : "none"} style={{ width: HIT, height: HIT, borderRadius: R.round, alignItems: "center", justifyContent: "center", backgroundColor: c.fill }}>
            <Icon name="trash" size={16} color={c.red} />
          </PressScale>
        ) : <Chevron />}
      </View>
      <ProgressSegments count={steps.length} index={doneCount(steps)} fraction={0} current={!["completed", "rejected", "cancelled"].includes(a.status)} label={t(STATUS_LABEL[a.status] ?? a.status)} />
      {act && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.sm }}>
          <Text variant="footnote" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>{`${t("Next")}: ${t(act.label)}`}</Text>
          <Text variant="subhead" weight="600" tone="accent">{t("Continue")}</Text>
        </View>
      )}
    </PressScale>
  );
}

/** Mirrors AppCard exactly (flag, two lines, progress, pill). */
function AppCardSkeleton() {
  const c = useColors(); const dark = useIsDark();
  return (
    <View style={[card(c, dark, 1), { padding: S.md, gap: S.md }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}><Skeleton w={40} h={40} r={R.round} /><View style={{ flex: 1, gap: S.xs }}><Skeleton w="45%" h={20} /><Skeleton w="70%" h={12} /></View></View>
      <View style={{ gap: S.xs }}><Skeleton h={S.xxs} r={R.xs} /><Skeleton w={84} h={20} r={R.sm} /></View>
    </View>
  );
}

export default function Applications() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets(); const { t } = useT();
  const { session, apps, err, refreshing, refresh, discard } = useApps();
  const [tab, setTab] = useState<"active" | "past">("active");
  const [swiping, setSwiping] = useState(false); // a row is being swiped: the list does not scroll (SwipeLock)
  const list = (apps ?? []).filter((a) => (tab === "active" ? ACTIVE(a.status) : !ACTIVE(a.status)));
  return (
    <SwipeLock.Provider value={setSwiping}>
    <ScrollView scrollEnabled={!swiping} onScroll={onTabScroll} scrollEventThrottle={16} style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: pb, paddingHorizontal: S.gutter, flexGrow: 1 }}
      refreshControl={session ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.tint} /> : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.lg }}>
        <Text variant="largeTitle" accessibilityRole="header">{t("Applications")}</Text>
      </View>
      {!session ? (
        <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}>
          <EmptyState icon="doc.text" mascot={<Globi pose="suitcase" size={128} />} title={t("Your applications live here")} action={<Button title={t("Sign in")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />} />
        </View>
      ) : (<>
        <View style={{ marginBottom: S.xl }}><SegmentedControl label={t("Filter")} options={[{ value: "active", label: `${t("Active")}${apps ? ` · ${apps.filter((a) => ACTIVE(a.status)).length}` : ""}` }, { value: "past", label: `${t("Past")}${apps ? ` · ${apps.filter((a) => !ACTIVE(a.status)).length}` : ""}` }]} value={tab} onChange={(v) => setTab(v as any)} /></View>
        {!!err && <EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={err} action={<Button title={t("Retry")} variant="secondary" onPress={refresh} />} />}
        {!err && apps === null && <View style={{ gap: S.sm }} accessible accessibilityLabel={t("Loading")}>{[0, 1].map((i) => <AppCardSkeleton key={i} />)}</View>}
        {!err && apps && list.length === 0 && (
          <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}>
            <EmptyState icon="airplane" mascot={<Globi pose={tab === "active" ? "plane" : "sleep"} mood={tab === "active" ? "happy" : "sleepy"} size={128} />} title={tab === "active" ? t("No active applications") : t("Nothing here yet")} action={tab === "active" ? <Button title={t("Start application")} onPress={() => router.push("/apply")} /> : undefined} />
          </View>
        )}
        <View style={{ gap: S.sm }}>{list.map((a) => <Animated.View key={a.id} layout={LIST_LAYOUT} entering={LIST_IN} exiting={LIST_OUT}>{isAbandoned(a)
          ? <SwipeToDiscard radius={R.card} onDiscard={() => { discard(a).catch(() => {}); }} testID="app-swipe"><AppCard a={a} onDiscard={() => { discard(a).catch(() => {}); }} /></SwipeToDiscard>
          : <AppCard a={a} />}</Animated.View>)}</View>
      </>)}
    </ScrollView>
    </SwipeLock.Provider>
  );
}
