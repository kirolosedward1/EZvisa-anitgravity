// Home (canvas Home.dc.html, HomeDraft, EmptyHome, HomeOffline, Loading, ErrorState). Signed in or guest.
// - Page title ("Hi, Ahmed" / "Where to next?") with the account avatar.
// - One hero card: the most recent active application (Globi, reference, the ONE next action, progress, its button),
//   else "Pick up where you left off?" for a draft, else "No application yet".
// - Other applications as rows, then three popular countries. Offline: Globi waits, queued uploads show, actions pause.
// Everything comes from the live rows and this phone's drafts (lib/useApps, lib/form); nothing is invented.
import { useGuestCases, forgetGuestCases, type GuestCase } from "../../../lib/guestCases";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useRef, useState } from "react";
import Animated from "react-native-reanimated";
import { Chevron, Text, Flag, Icon, PressScale, Avatar, Skeleton, useTabInset, ProgressSegments, Card, Bubble, PrimaryButton, SecondaryButton, SectionHeader, ErrorView, SearchField } from "../../../components/ui";
import { GlobiPose, GLOBI_SIZE } from "../../../components/globi/GlobiPose";
import { PopularTiles } from "../../../components/home/PopularTiles";
import { useColors, S, R } from "../../../lib/theme";
import { STATUS_LABEL, APP_STATUS_LABEL, employmentOf, getApplication, isPaid, needsContinue, requirementsFor, referenceOf, type Application } from "../../../lib/data";
import { useApps } from "../../../lib/useApps";
import { tap, error as hError } from "../../../lib/haptics";
import { nextAction as cardAction } from "../../../lib/nextStep";
import { buildChecklist } from "../../../lib/checklist";
import { nextAction } from "../../../lib/nextAction";
import { buildTimeline, doneCount, isUserDiscarded, chooseHero } from "../../../lib/timeline";
import { paymentToResume, startPayment } from "../../../lib/payments";
import { useAuth } from "../../../lib/auth";
import { useForm, type LocalDraft } from "../../../lib/form";
import { hasAnswers, PRICE_AED } from "../../../lib/wizard";
import { Q_BY_ID, progressOf, answeredCount, draftPosition } from "../../../lib/questions";
import { useT, ltr } from "../../../lib/i18n";
import { countdown } from "../../../lib/countdown";
import { LIST_LAYOUT, LIST_IN, LIST_OUT } from "../../../lib/motion";
import { ABANDONED_LIMIT, askDiscard, discardApplication, isAbandoned } from "../../../lib/discard";
import { SwipeToDiscard, SwipeLock } from "../../../components/SwipeToDiscard";
import { useAvatar } from "../../../lib/avatar";
import { whatsapp } from "../../../lib/api";
import { onTabScroll } from "../../../lib/tabBarScroll";
import { useUploads, removeUpload } from "../../../lib/uploads";

/** Contract step slugs as the customer reads them. */
const STEP_LABEL: Record<string, string> = { destination: "Destination", personal: "Traveller", trip: "Trip", passport: "Passport", spouse: "Spouse", employment: "Employment" };
const SERVER_STEP: Record<string, string> = { ...STEP_LABEL, payment: "Review & pay" };
const draftStep = (d: LocalDraft) => { const q = d.page.startsWith("q:") ? Q_BY_ID[d.page.slice(2)] : null; return q ? STEP_LABEL[q.step] ?? q.step : "Review & pay"; };
const hhmm = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** The active application (canvas Home hero card): Globi beside the reference, the one next action, progress, button. */
function AppCard({ a, offline }: { a: Application; offline: boolean }) {
  const c = useColors(); const { t } = useT();
  const [paying, setPaying] = useState(false);
  const name = a.countries?.name ?? a.destination_country ?? "";
  const items = buildChecklist(requirementsFor(employmentOf(a)), a.documents, a.status).customer;
  const n = nextAction(a, items);
  const steps = buildTimeline(a); const done = doneCount(steps);
  const cd = ["completed", "rejected", "cancelled"].includes(a.status) ? null : countdown(a.entry_date, a.exit_date, t);
  const pending = cardAction(a);
  const queued = useUploads(a.id).filter((j) => j.state === "queued" || j.state === "failed");
  const open = () => router.push((pending?.href ?? `/applications/${a.id}`) as any, { withAnchor: true });
  const act = () => {
    tap();
    switch (n.kind) {
      case "continue": router.push(`/continue/${a.id}`); return;
      case "appointment": router.push(`/appointment/${a.id}`); return;
      case "pay":
        setPaying(true);
        startPayment(a.id).then((o) => router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: o.returned } }))
          .catch((e) => { if (e?.busy) return; if (e?.alreadyPaid) { router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: "success" } }); return; } hError(); open(); })
          .finally(() => setPaying(false));
        return;
      default: open();
    }
  };
  const ref = a.reference ?? referenceOf(a.id);
  const headline = offline && queued.length ? (queued.length === 1 ? t("One upload is waiting for a connection.") : t("{n} uploads are waiting for a connection.", { n: queued.length })) : t(n.title, n.vars);
  const sub = offline && queued.length ? t("It sends when you're back online.") : [n.body && t(n.body), cd].filter(Boolean).join(" · ");
  return (
    <Card padded testID="home-hero">
      <PressScale onPress={() => { tap(); open(); }} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={[t(name), ref, headline, sub].filter(Boolean).join(", ")} accessibilityHint={t("Opens the application")}
        style={{ flexDirection: "row", gap: S.sm, alignItems: "flex-start" }}>
        <GlobiPose pose={offline ? "waiting" : "checklist"} size={96} style={{ marginTop: -8, marginEnd: -8, marginBottom: -12, marginStart: -16 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="footnote" weight="600" tone="accent" numberOfLines={1} style={{ textTransform: "uppercase", letterSpacing: 0.3 }}>{`${t(name || "Application")} · ${ltr(ref)}`}</Text>
          <Text variant="headline" style={{ fontSize: 17, lineHeight: 22 }} testID="next-action">{headline}</Text>
          {!!sub && <Text variant="callout" tone="secondary">{sub}</Text>}
        </View>
      </PressScale>
      {offline && queued.map((j) => (
        <View key={j.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: S.sm, padding: S.sm, borderRadius: R.md, backgroundColor: c.fillSubtle }} testID="queued-upload">
          <Icon name="clock" size={16} color={c.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text variant="callout" weight="600" numberOfLines={1}>{j.name}</Text>
            <Text variant="footnote" tone="secondary">{[j.size ? `${(j.size / 1048576).toFixed(1)} MB` : "", t("queued")].filter(Boolean).join(" · ")}</Text>
          </View>
          <PressScale onPress={() => { tap(); removeUpload(j.id); }} accessibilityRole="button" accessibilityLabel={`${t("Cancel")} ${j.name}`} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: S.xs }}>
            <Text variant="note" weight="600" tone="secondary">{t("Cancel")}</Text>
          </PressScale>
        </View>
      ))}
      <View style={{ marginTop: S.md }}><ProgressSegments count={steps.length} index={done} fraction={0.35} current={!["completed", "rejected", "cancelled"].includes(a.status)} label={t("{n} of {total} steps done", { n: done, total: steps.length })} /></View>
      <View style={{ marginTop: S.md }}>
        <PrimaryButton title={t(n.cta ?? "View application", n.vars)} loading={paying} disabled={offline && n.kind !== "open" && n.kind !== "none"} onPress={act} testID="hero-action" />
      </View>
    </Card>
  );
}

/** A draft (canvas HomeDraft): Globi asks "Pick up where you left off?" with the question it stopped at. */
function DraftCard({ country, local, step, onResume }: { country: string; local?: LocalDraft; step: string; onResume: () => void }) {
  const { t } = useT();
  const q = local?.page.startsWith("q:") ? Q_BY_ID[local.page.slice(2)] : null;
  const where = q ? t("stopped at {q}", { q: t(q.label).toLowerCase() }) : t("stopped at {q}", { q: t(step).toLowerCase() });
  const prog = local ? progressOf(local.form, local.page) : null;
  return (
    <Card padded testID="home-hero-draft">
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <GlobiPose pose="passport" size={96} style={{ marginTop: -8, marginEnd: -8, marginBottom: -12, marginStart: -16 }} />
        <Bubble style={{ flex: 1 }}>
          <Text variant="headline" style={{ fontSize: 16, lineHeight: 21 }} accessibilityRole="header">{t("Pick up where you left off?")}</Text>
          <Text variant="callout" tone="secondary" testID="next-action">{[country && t(country), where].filter(Boolean).join(" · ")}</Text>
        </Bubble>
      </View>
      {prog && <View style={{ marginTop: S.md }}><ProgressSegments count={prog.steps.length} index={prog.stepIndex} fraction={prog.segs[prog.stepIndex]?.fill ?? 0} /></View>}
      <View style={{ marginTop: S.md }}><PrimaryButton title={t("Resume")} onPress={() => { tap(); onResume(); }} testID="resume-draft" /></View>
    </Card>
  );
}

/** A case this phone submitted as a guest (pay first): finish the account so the application is yours. */
function GuestCaseCard({ g }: { g: GuestCase }) {
  const { t } = useT();
  return (
    <Card padded testID="home-guest-case">
      <View style={{ flexDirection: "row", gap: S.sm, alignItems: "center" }}>
        <GlobiPose pose="lock" size={GLOBI_SIZE.home} style={{ margin: -8 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="caption" weight="600" tone="accent">{[t(g.country), g.reference].filter(Boolean).join(" · ").toUpperCase()}</Text>
          <Text variant="question">{t("Create your account")}</Text>
          <Text variant="note" tone="secondary">{t("Use {e} to follow this application, add your details and upload documents.", { e: g.email })}</Text>
        </View>
      </View>
      <View style={{ marginTop: S.md }}><PrimaryButton title={t("Continue")} onPress={() => { tap(); router.push({ pathname: "/payment/[id]", params: { id: g.id, returned: "closed", email: g.email } }); }} testID="guest-case-continue" /></View>
    </Card>
  );
}

/** No application yet (canvas EmptyHome). */
function EmptyCard() {
  const { t } = useT();
  return (
    <Card padded testID="home-empty">
      <View style={{ alignItems: "center", gap: 14, paddingVertical: S.xs }}>
        <GlobiPose pose="welcome" size={142} style={{ margin: -11 }} />
        <View style={{ gap: 6, alignItems: "center" }}>
          <Text variant="question" center accessibilityRole="header">{t("No application yet")}</Text>
          <Text variant="callout" tone="secondary" center>{t("Seven questions, about 3 minutes.")}</Text>
        </View>
        <View style={{ alignSelf: "stretch" }}><PrimaryButton title={t("Start application")} onPress={() => { tap(); router.push("/apply"); }} testID="home-start" /></View>
        <Text variant="footnote" tone="secondary" center>{t("{p} AED per person. Embassy fees paid at the appointment.", { p: PRICE_AED })}</Text>
      </View>
    </Card>
  );
}

/** Loading (canvas Loading.dc.html): the Home layout as flat blocks. */
function HomeSkeleton() {
  const { t } = useT();
  return (
    <View style={{ gap: S.lg }} accessible accessibilityLabel={t("Loading your applications")} testID="home-skeleton">
      <Card padded>
        <View style={{ flexDirection: "row", gap: S.sm }}>
          <View style={{ opacity: 0.5 }}><GlobiPose pose="waiting" size={66} animated={false} /></View>
          <View style={{ flex: 1, gap: S.xs }}><Skeleton w={120} h={12} /><Skeleton h={20} /><Skeleton w="70%" h={20} /><Skeleton w="60%" h={14} /></View>
        </View>
        <Skeleton h={4} style={{ marginTop: S.md }} /><Skeleton h={48} r={R.button} style={{ marginTop: S.md }} />
      </Card>
      <View style={{ gap: S.xs }}>
        <Skeleton w={120} h={13} />
        <Card>{[0, 1].map((i) => <View key={i} style={{ flexDirection: "row", gap: S.sm, alignItems: "center", padding: S.md }}><Skeleton w={40} h={40} r={20} /><View style={{ flex: 1, gap: 6 }}><Skeleton w={i ? "30%" : "40%"} h={14} /><Skeleton w={i ? "50%" : "60%"} h={12} /></View></View>)}</Card>
      </View>
      <View style={{ gap: S.xs }}><Skeleton w={140} h={13} /><View style={{ flexDirection: "row", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} w="31%" h={84} r={R.card} />)}</View></View>
    </View>
  );
}

/** The other applications (the hero one is left out): drafts saved on this phone + the signed-in user's server
 *  applications, most recently updated first. Only drafts and unpaid cases can be discarded. */
type Item = { key: string; country: string; status: string; action?: string; actionHref?: string; at: number; open: () => void; /** discards without asking (swipe); the trash button asks once */ remove?: () => void; tone?: "accent" | "secondary" | "green"; draft?: string; answers?: number };
function useItems(apps: Application[] | null): Item[] | null {
  const { t } = useT(); const { hydrated, drafts, openDraft, removeDraft, openServerDraft } = useForm();
  if (!hydrated) return null;
  const server = apps ?? [];
  const linked = new Set(server.map((a) => a.id));
  return [
    ...drafts.filter((d) => hasAnswers(d.form) && !(d.draftId && linked.has(d.draftId) && server.find((a) => a.id === d.draftId)?.status !== "draft")).map((d): Item => ({
      key: d.draftId ? `s:${d.draftId}` : `l:${d.key}`, country: d.form.destination || (server.find((a) => a.id === d.draftId)?.destination_country ?? ""), status: `${t("Draft")} · ${t("Details {i} of {n}", draftPosition(d.form, d.page))}`, at: d.savedAt, draft: draftStep(d), answers: answeredCount(d.form),
      open: () => { openDraft(d.key); router.push({ pathname: "/apply", params: { resume: "1" } }); }, remove: () => removeDraft(d.key) })),
    ...server.filter((a) => !(a.status === "draft" && drafts.some((d) => d.draftId === a.id)) && !isUserDiscarded(a)).map((a): Item => {
      const paid = isPaid(a);
      const act = cardAction(a);
      const status = a.status === "draft" ? t("Draft") : act ? t(a.status === "submitted" ? "Paid" : APP_STATUS_LABEL[a.status] ?? a.status) : needsContinue(a) ? t("Continue application")
        : a.status === "submitted" && !paid ? `${t("Submitted")} · ${t("Payment due")}` : paid && a.status === "submitted" ? t("Paid") : t(APP_STATUS_LABEL[a.status] ?? a.status);
      return { key: `s:${a.id}`, country: a.countries?.name ?? a.destination_country ?? "", status, action: act ? t(act.label) : undefined, actionHref: act?.href, at: Date.parse((a as any).updated_at ?? a.created_at ?? "") || 0, tone: status === t("Continue application") ? "accent" : ["ready", "appointment_booked", "completed"].includes(a.status) ? "green" : "secondary",
        // A draft saved from the website or another device opens in the wizard, at the question it was left on.
        open: a.status === "draft" ? () => { openServerDraft(a.id).then((ok) => router.push(ok ? { pathname: "/apply", params: { resume: "1" } } : `/applications/${a.id}`)).catch(() => router.push(`/applications/${a.id}`)); }
          : act ? () => router.push(act.href as any, { withAnchor: true })
          : () => router.push(status === t("Continue application") ? `/continue/${a.id}` : `/applications/${a.id}`, { withAnchor: true }),
        remove: isAbandoned(a) ? () => { discardApplication(a).catch(() => {}); } : undefined,
        draft: a.status === "draft" ? SERVER_STEP[a.notes?.wizardStep ?? ""] ?? "Personal" : undefined };
    }),
  ].sort((x, y) => y.at - x.at).filter(((n) => (i: Item) => !i.remove || n++ < ABANDONED_LIMIT)(0));
}

/** "Other applications" (canvas Home): round flag, name, status, chevron. Unpaid drafts swipe left to discard. */
function AppList({ items, title }: { items: Item[]; title: string }) {
  const c = useColors(); const { t } = useT();
  if (!items.length) return null;
  return (
    <View testID="home-others">
      <SectionHeader title={title} />
      <View style={{ marginHorizontal: S.gutter }}><Card>
        {items.map((i, idx) => (
          <Animated.View key={i.key} layout={LIST_LAYOUT} entering={LIST_IN} exiting={LIST_OUT} testID="home-app-row">
            <SwipeToDiscard enabled={!!i.remove} onDiscard={() => askDiscard(i.remove!, t, { country: i.country, answers: i.answers, draft: !!i.draft })} testID="home-swipe">
              <PressScale onPress={() => { tap(); i.open(); }} onLongPress={i.remove ? () => askDiscard(i.remove!, t, { country: i.country, answers: i.answers, draft: !!i.draft }) : undefined} accessibilityRole="button" accessibilityLabel={`${t(i.country || "Application")}, ${i.status}`}
                accessibilityHint={i.remove ? t("Swipe left to discard") : undefined} scaleTo={0.99}
                style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.md, minHeight: 56, paddingVertical: S.xs, backgroundColor: c.surface }}>
                {i.country ? <Flag country={i.country} size={40} /> : <View style={{ width: 40, height: 40, borderRadius: R.round, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name="doc.text.fill" size={15} color={c.tint} /></View>}
                <View style={{ flex: 1 }}>
                  <Text variant="row" numberOfLines={1}>{t(i.country || "New application")}</Text>
                  <Text variant="note" tone={i.tone === "green" ? "success" : i.tone === "accent" ? "accent" : "secondary"} numberOfLines={1}>{[i.status, i.action].filter(Boolean).join(" · ")}</Text>
                </View>
                <Chevron size={13} />
              </PressScale>
            </SwipeToDiscard>
            {idx < items.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginStart: S.md + 40 + S.sm }} />}
          </Animated.View>
        ))}
      </Card></View>
    </View>
  );
}

/** Once per launch: if a checkout opened on this device was paid (or is processing) while the app was closed,
 *  show its result screen, which reads the status from the server. */
let resumeChecked = false;
function useResumePayment() {
  const { loading, session } = useAuth();
  useEffect(() => {
    if (loading || resumeChecked) return; resumeChecked = true;
    paymentToResume(async (id) => {
      if (!session) return null; // guest checkout: resume (the result screen verifies with the server)
      try { return isPaid(await getApplication(id)); }
      catch (e: any) { return /couldn't find this application/i.test(String(e?.message)) ? "missing" : null; }
    })
      .then((id) => { if (id) router.push({ pathname: "/payment/[id]", params: { id, returned: "success" } }); })
      .catch(() => {});
  }, [loading, session]);
}

export default function Home() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets(); const { t } = useT();
  const { session, apps, unread, refreshing, refresh, err, load } = useApps(true, true);
  const { drafts } = useForm();
  const photo = useAvatar(session?.user.id);
  const net = useNetInfo(); const offline = net.isConnected === false;
  const [swiping, setSwiping] = useState(false);
  const [q, setQ] = useState("");
  useResumePayment();
  const guestCases = useGuestCases();
  useEffect(() => { if (session?.user.email) forgetGuestCases(session.user.email); }, [session?.user.email]);
  const guestCase = !session ? guestCases[0] : undefined;
  const loadedAt = useRef<number | null>(null);
  useEffect(() => { if (apps) loadedAt.current = Date.now(); }, [apps]);
  const [errAt, setErrAt] = useState<number | null>(null);
  useEffect(() => { setErrAt(err ? Date.now() : null); }, [err]);
  const fullName = (session?.user.user_metadata?.full_name as string | undefined) ?? "";
  const first = fullName.split(" ")[0];
  const items = useItems(session ? apps : null);
  const server = session ? apps ?? [] : [];

  // Hero: most recent active case; else the newest draft (server or this phone); else the newest finished case.
  const hero = items ? chooseHero(server, items.filter((i) => i.draft)) : null;
  const heroApp = hero?.kind === "app" ? hero.a : undefined;
  const draftItem = hero?.kind === "draft" ? hero.d : undefined;
  const heroKey = heroApp ? `s:${heroApp.id}` : draftItem?.key;
  const others = (items ?? []).filter((i) => i.key !== heroKey);
  const local = draftItem ? drafts.find((d) => `l:${d.key}` === draftItem.key || (!!d.draftId && `s:${d.draftId}` === draftItem.key)) : undefined;
  const loading = !!session && apps === null && !err;
  const failed = !!session && apps === null && !!err;
  const empty = !loading && !failed && !heroApp && !draftItem && !guestCase;
  const title = first ? t("Hi, {name}", { name: first }) : t("Where to next?");
  const othersTitle = offline && loadedAt.current ? `${t("Other applications")} · ${t("from {t}", { t: hhmm(loadedAt.current) })}` : heroKey ? t("Other applications") : t("Your applications");

  return (
    <SwipeLock.Provider value={setSwiping}>
    <ScrollView scrollEnabled={!swiping} onScroll={onTabScroll} scrollEventThrottle={16} style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.md + (offline ? 64 : 0), paddingBottom: pb, gap: S.lg }}
      refreshControl={session ? <RefreshControl refreshing={refreshing} onRefresh={() => { tap(); refresh(); }} tintColor={c.tint} /> : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.gutter, minHeight: 44 }} testID="home-header">
        <Text variant="pageTitle" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>{title}</Text>
        {session ? (
          <PressScale onPress={() => { tap(); router.navigate(unread ? "/account/notifications" : "/account"); }} accessibilityRole="button" hitSlop={8} testID="home-avatar"
            accessibilityLabel={unread ? t("Account, {n} unread notifications", { n: unread }) : t("Account")}>
            <Avatar name={fullName || session.user.email || ""} size={36} uri={photo} />
            {unread > 0 && <View style={{ position: "absolute", top: -1, end: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: c.danger, borderWidth: 2, borderColor: c.bg }} />}
          </PressScale>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: S.gutter }}>
        {loading ? <HomeSkeleton /> : failed ? (
          <Card padded><ErrorView compact title={t("Couldn't load your applications")} message={t("Check your connection and try again. Your answers are saved.")} onRetry={() => { tap(); load(); }} onWhatsApp={() => whatsapp()}
            diagnostic={[offline ? "offline" : "network error", errAt ? hhmm(errAt) : ""].filter(Boolean).join(" · ")} /></Card>
        ) : guestCase ? <GuestCaseCard g={guestCase} />
          : heroApp ? <AppCard a={heroApp} offline={offline} />
          : draftItem ? <DraftCard country={draftItem.country} local={local} step={draftItem.draft ?? ""} onResume={() => draftItem.open()} />
          : <EmptyCard />}
      </View>
      {empty && (
        <View style={{ paddingHorizontal: S.gutter }}>
          <SearchField value={q} onChangeText={setQ} placeholder={t("Search destinations")} returnKeyType="search" testID="home-search"
            onSubmitEditing={() => { const v = q.trim(); router.navigate(v ? { pathname: "/countries", params: { q: v } } : "/countries"); }} />
        </View>
      )}
      <AppList items={others} title={othersTitle} />
      {!offline && !loading && <PopularTiles />}
    </ScrollView>
    </SwipeLock.Provider>
  );
}
