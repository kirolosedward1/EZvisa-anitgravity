// Applications (canvas Applications.dc.html, SignedOutTab.dc.html, DiscardConfirm.dc.html).
// Signed in: title with "+", Active / Past, "Needs you" (something for the customer to do, drafts included) and
// "With the team", each row with its flag, the travellers, a status line and a pill (Upload, Continue, Pay, Ready).
// Unpaid drafts swipe left to discard (asked once). Guest: drafts on this phone, then why to sign in.
import { useState } from "react";
import { ScrollView, View, RefreshControl, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { GlobiPose } from "../../../components/globi/GlobiPose";
import { SegmentedControl, EmptyState, Skeleton, Flag, Text, PressScale, useTabInset, Card, SectionHeader, PrimaryButton, SecondaryButton, ErrorView, HeaderIconButton } from "../../../components/ui";
import { useT } from "../../../lib/i18n";
import { useColors, S, R } from "../../../lib/theme";
import { STATUS_LABEL, isPaid, needsContinue, type Application } from "../../../lib/data";
import { nextAction } from "../../../lib/nextStep";
import { useApps, ACTIVE } from "../../../lib/useApps";
import { useForm, type LocalDraft } from "../../../lib/form";
import { hasAnswers } from "../../../lib/wizard";
import { answeredCount, draftPosition } from "../../../lib/questions";
import { tap } from "../../../lib/haptics";
import { askDiscard, isAbandoned } from "../../../lib/discard";
import { LIST_LAYOUT, LIST_IN, LIST_OUT } from "../../../lib/motion";
import { SwipeToDiscard, SwipeLock } from "../../../components/SwipeToDiscard";
import { onTabScroll } from "../../../lib/tabBarScroll";
import { countdown } from "../../../lib/countdown";
import { whatsapp } from "../../../lib/api";

type Pill = { label: string; tone: "accent" | "neutral" | "success" };
type RowItem = { key: string; country: string; title: string; status: string; pill?: Pill; open: () => void; discard?: () => void; answers?: number; draft?: boolean };
const READY = ["ready", "approved", "appointment_booked", "completed"];
const weekday = (at: number, lang: string) => new Date(at).toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : undefined, { weekday: "short" });

function StatusPill({ p }: { p: Pill }) {
  const c = useColors();
  const bg = p.tone === "accent" ? c.accentSoft : p.tone === "success" ? c.successSoft : c.fill;
  const fg = p.tone === "accent" ? c.accent : p.tone === "success" ? c.success : c.textSecondary;
  return <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.round, backgroundColor: bg }}><Text variant="footnote" weight="600" color={fg}>{p.label}</Text></View>;
}

/** One list card of rows with inset separators (canvas). */
function Rows({ title, items }: { title: string; items: RowItem[] }) {
  const c = useColors(); const { t } = useT();
  if (!items.length) return null;
  return (
    <View testID={`apps-${title}`}>
      <SectionHeader title={title} />
      <Card>
        {items.map((i, idx) => {
          const ask = i.discard ? () => askDiscard(i.discard!, t, { country: i.country, answers: i.answers, draft: i.draft }) : undefined;
          return (
            <Animated.View key={i.key} layout={LIST_LAYOUT} entering={LIST_IN} exiting={LIST_OUT}>
              <SwipeToDiscard enabled={!!i.discard} onDiscard={() => ask?.()} testID="app-swipe">
                <PressScale onPress={() => { tap(); i.open(); }} onLongPress={ask} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={[i.title, i.status, i.pill?.label].filter(Boolean).join(", ")}
                  accessibilityActions={ask ? [{ name: "discard", label: t("Discard") }] : undefined} onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === "discard") ask?.(); }} testID="app-row"
                  style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.md, paddingVertical: 10, minHeight: 64, backgroundColor: c.surface }}>
                  <Flag country={i.country} size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="row" weight="600" numberOfLines={1}>{i.title}</Text>
                    <Text variant="note" tone="secondary" numberOfLines={2}>{i.status}</Text>
                  </View>
                  {i.pill && <StatusPill p={i.pill} />}
                </PressScale>
              </SwipeToDiscard>
              {idx < items.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginStart: S.md + 40 + S.sm }} />}
            </Animated.View>
          );
        })}
      </Card>
    </View>
  );
}

function RowsSkeleton() {
  return (
    <Card>{[0, 1].map((i) => (
      <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md }}>
        <Skeleton w={40} h={40} r={20} /><View style={{ flex: 1, gap: 6 }}><Skeleton w="45%" h={16} /><Skeleton w="70%" h={12} /></View><Skeleton w={64} h={24} r={12} />
      </View>
    ))}</Card>
  );
}

export default function Applications() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets(); const { t, lang } = useT();
  const { session, apps, err, refreshing, refresh, discard, load } = useApps();
  const { drafts, openDraft, removeDraft, openServerDraft } = useForm();
  const [tab, setTab] = useState<"active" | "past">("active");
  const [swiping, setSwiping] = useState(false);

  // Drafts on this phone that are not already a server row in the list (guest drafts, or not synced yet).
  const linked = new Set((apps ?? []).map((a) => a.id));
  const mine = drafts.filter((d) => hasAnswers(d.form) && (session ? !(d.draftId && linked.has(d.draftId)) : !d.owner));
  const draftRow = (d: LocalDraft): RowItem => {
    const pos = draftPosition(d.form, d.page);
    return { key: `l:${d.key}`, country: d.form.destination, title: t(d.form.destination || "New application"), draft: true, answers: answeredCount(d.form),
      status: [session ? t("Draft") : t("Guest draft"), t("Details {i} of {n}", pos), session ? t("saved {d}", { d: weekday(d.savedAt, lang) }) : t("on this phone")].join(" · "),
      pill: { label: t("Continue"), tone: "neutral" },
      open: () => { openDraft(d.key); router.push({ pathname: "/apply", params: { resume: "1" } }); }, discard: () => removeDraft(d.key) };
  };
  const appRow = (a: Application): RowItem => {
    const name = a.countries?.name ?? a.destination_country ?? "";
    const people = a.applicants.map((p) => p.first_name).filter(Boolean).join(` ${t("and")} `);
    const act = nextAction(a); const paid = isPaid(a);
    const cd = ACTIVE(a.status) ? countdown(a.entry_date, a.exit_date, t) : null;
    const status = [a.status === "submitted" && paid ? t("Paid") : a.status === "submitted" && !paid ? t("Payment due") : t(STATUS_LABEL[a.status] ?? a.status), act && t(act.label), cd].filter(Boolean).join(" · ");
    const pill: Pill | undefined = a.status === "draft" || needsContinue(a) ? { label: t("Continue"), tone: "neutral" } : act ? { label: t(act.label.split(" ")[0]), tone: "accent" } : READY.includes(a.status) ? { label: t("Ready"), tone: "success" } : undefined;
    return { key: a.id, country: name, title: [t(name || "Application"), people].filter(Boolean).join(" · "), status, pill, draft: a.status === "draft",
      open: a.status === "draft" ? () => { openServerDraft(a.id).then((ok) => router.push(ok ? { pathname: "/apply", params: { resume: "1" } } : `/applications/${a.id}`)).catch(() => router.push(`/applications/${a.id}`)); }
        : () => router.push((act?.href ?? `/applications/${a.id}`) as any),
      discard: isAbandoned(a) ? () => { discard(a).catch(() => {}); } : undefined };
  };
  const activeApps = (apps ?? []).filter((a) => ACTIVE(a.status)); const pastApps = (apps ?? []).filter((a) => !ACTIVE(a.status));
  const needsYou = [...mine.map(draftRow), ...activeApps.filter((a) => a.status === "draft" || !!nextAction(a) || needsContinue(a)).map(appRow)];
  const withTeam = activeApps.filter((a) => !(a.status === "draft" || !!nextAction(a) || needsContinue(a))).map(appRow);
  const nActive = needsYou.length + withTeam.length;

  return (
    <SwipeLock.Provider value={setSwiping}>
    <ScrollView scrollEnabled={!swiping} onScroll={onTabScroll} scrollEventThrottle={16} style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.md, paddingBottom: pb, paddingHorizontal: S.gutter, gap: S.md, flexGrow: 1 }}
      refreshControl={session ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.tint} /> : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <Text variant="pageTitle" accessibilityRole="header">{t("Applications")}</Text>
        {session && <HeaderIconButton icon="plus" label={t("New application")} filled onPress={() => router.push("/apply")} testID="new-application" />}
      </View>
      {!session ? (<>
        {/* Guest (canvas SignedOutTab): drafts on this phone, then why to sign in. */}
        {mine.length > 0 && <Rows title={t("On this phone")} items={mine.map(draftRow)} />}
        <Card padded testID="signed-out">
          <View style={{ alignItems: "center", gap: S.sm, paddingVertical: S.xs }}>
            <GlobiPose pose="passport" size={123} />
            <Text variant="question" center accessibilityRole="header">{t("Your applications live here")}</Text>
            <Text variant="callout" tone="secondary" center style={{ maxWidth: 280 }}>{t("Sign in to see every application, from this phone and ezvisa.net.")}</Text>
            <View style={{ alignSelf: "stretch", gap: 10, marginTop: S.xs }}>
              <PrimaryButton title={t("Sign in")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />
              <SecondaryButton title={t("Create account")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signup" } })} />
            </View>
            <Text variant="footnote" tone="secondary" center>{t("Paid as a guest? Sign in with the same email.")}</Text>
          </View>
        </Card>
      </>) : (<>
        <SegmentedControl label={t("Filter")} options={[{ value: "active", label: `${t("Active")}${apps ? ` · ${nActive}` : ""}` }, { value: "past", label: `${t("Past")}${apps ? ` · ${pastApps.length}` : ""}` }]} value={tab} onChange={(v) => setTab(v as any)} />
        {!!err && apps === null && <Card padded><ErrorView compact title={t("Couldn't load your applications")} message={t("Check your connection and try again. Your answers are saved.")} onRetry={load} onWhatsApp={() => whatsapp()} /></Card>}
        {!err && apps === null && <RowsSkeleton />}
        {apps && tab === "active" && (nActive === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}>
            <EmptyState icon="airplane" mascot={<GlobiPose pose="checklist" size={128} />} title={t("No active applications")} action={<PrimaryButton title={t("Start application")} onPress={() => router.push("/apply")} />} />
          </View>
        ) : (<>
          <Rows title={t("Needs you")} items={needsYou} />
          <Rows title={t("With the team")} items={withTeam} />
          {needsYou.some((i) => i.discard) && <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: S.xxs }}>{t("Swipe left on an unpaid draft to discard it.")}</Text>}
        </>))}
        {apps && tab === "past" && (pastApps.length ? <Rows title={t("Past")} items={pastApps.map(appRow)} /> : (
          <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}><EmptyState icon="airplane" mascot={<GlobiPose pose="waiting" size={128} />} title={t("Nothing here yet")} /></View>
        ))}
        {apps && (
          <Card padded style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.sm }}>
            <GlobiPose pose="checklist" size={47} style={{ margin: -4 }} />
            <Text variant="callout" style={{ flex: 1 }}>{t("Also on ezvisa.net with the same email.")}</Text>
          </Card>
        )}
      </>)}
    </ScrollView>
    </SwipeLock.Provider>
  );
}
