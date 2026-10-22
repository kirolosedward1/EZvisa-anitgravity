import { ScrollView, View, RefreshControl, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../../components/Logo";
import { Text, Flag, Icon, PressScale, SectionHeader, ListGroup, Avatar, Skeleton, useTabInset, Button, ProgressSegments, Timeline } from "../../../components/ui";
import { AppointmentCard } from "../../../components/Appointment";
import { useColors, S, R, curve, ICON } from "../../../lib/theme";
import { POPULAR, toSlug } from "../../../lib/countries";
import { PHOTOS, THUMBS } from "../../../lib/photos";
import { STATUS_LABEL, getApplication, isPaid, requirementsFor, type Application } from "../../../lib/data";
import { useApps } from "../../../lib/useApps";
import { tap, error as hError } from "../../../lib/haptics";
import { useEffect, useRef, useState } from "react";
import { buildChecklist } from "../../../lib/checklist";
import { nextAction } from "../../../lib/nextAction";
import { buildTimeline, doneCount, isUserDiscarded, chooseHero } from "../../../lib/timeline";
import { paymentToResume, startPayment } from "../../../lib/payments";
import { useAuth } from "../../../lib/auth";
import { useForm, type LocalDraft } from "../../../lib/form";
import { hasAnswers, employmentComplete } from "../../../lib/wizard";
import { Q_BY_ID } from "../../../lib/questions";
import { useT } from "../../../lib/i18n";
import { countdown } from "../../../lib/countdown";
import Animated from "react-native-reanimated";
import { LIST_LAYOUT, LIST_IN, LIST_OUT } from "../../../lib/motion";
import { ABANDONED_LIMIT, askDiscard, discardApplication, isAbandoned } from "../../../lib/discard";

const fmtDay = (s: string, lang: string) => new Date(s.slice(0, 10) + "T12:00:00").toLocaleDateString(lang === "ar" ? "ar" : undefined, { day: "numeric", month: "short" });
const tripDates = (a: Application, lang: string) => (a.entry_date ? [fmtDay(a.entry_date, lang), a.exit_date && fmtDay(a.exit_date, lang)].filter(Boolean).join(" – ") : "");
const STEP_LABEL: Record<string, string> = { personal: "Personal", spouse: "Spouse", employment: "Employment", "trip-details": "Trip" };
const SERVER_STEP: Record<string, string> = { ...STEP_LABEL, payment: "Review" };
const draftStep = (d: LocalDraft) => { const q = d.page.startsWith("q:") ? Q_BY_ID[d.page.slice(2)] : null; return q ? STEP_LABEL[q.step] ?? q.step : "Review"; };

/** Hero for a submitted (or finished) application, built only from its live row: destination, trip dates, status,
 *  progress, ONE next action from the real state, the 5-step timeline, and the appointment when staff entered one. */
function Hero({ a, onShowAppointment }: { a: Application; onShowAppointment: () => void }) {
  const c = useColors(); const { t, lang } = useT();
  const [paying, setPaying] = useState(false);
  const name = a.countries?.name ?? "";
  const items = buildChecklist(requirementsFor((a.notes?.wizard as any)?.employmentStatus), a.documents).customer;
  const n = nextAction(a, items);
  const steps = buildTimeline(a); const done = doneCount(steps);
  const cd = ["completed", "rejected", "cancelled"].includes(a.status) ? null : countdown(a.entry_date, a.exit_date, t);
  const status = t(a.status === "submitted" && isPaid(a) ? "Paid" : STATUS_LABEL[a.status] ?? a.status); // same wording as the list
  const open = () => router.push(`/applications/${a.id}`, { withAnchor: true });
  const act = () => {
    tap();
    switch (n.kind) {
      case "continue": router.push(`/continue/${a.id}`); return;
      case "appointment": onShowAppointment(); return;
      case "pay":
        setPaying(true);
        startPayment(a.id).then((o) => router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: o.returned } }))
          .catch((e) => { if (e?.busy) return; if (e?.alreadyPaid) { router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: "success" } }); return; } hError(); open(); })
          .finally(() => setPaying(false));
        return;
      default: open();
    }
  };
  const actionable = n.kind !== "none" && n.kind !== "open";
  return (
    <View style={{ paddingHorizontal: S.lg, marginBottom: S.xxl }} testID="home-hero">
      <PressScale onPress={() => { tap(); open(); }} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={[t(name), status, tripDates(a, lang), cd].filter(Boolean).join(", ")} accessibilityHint={t("Opens the application")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}>
          <Text variant="largeTitle" accessibilityRole="header" numberOfLines={2} style={{ flex: 1 }}>{t(name || "Application")}</Text>
          <Flag country={name} size={64} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: S.xs, marginTop: S.xs }}>
          <Text variant="callout" weight="600" tone={a.status === "cancelled" ? "secondary" : "accent"} color={a.status === "rejected" ? c.red : undefined} testID="hero-status">{status}</Text>
          {!!tripDates(a, lang) && <><Text variant="callout" tone="tertiary">·</Text><Text variant="callout" tone="secondary" tabular testID="hero-dates">{tripDates(a, lang)}</Text></>}
          {!!cd && <><Text variant="callout" tone="tertiary">·</Text><Text variant="callout" tone="secondary" testID="countdown">{cd}</Text></>}
        </View>
        <View style={{ marginTop: S.md }}><ProgressSegments count={steps.length} index={done} fraction={0} current={!["completed", "rejected", "cancelled"].includes(a.status)} label={t("{n} of {total} steps done", { n: done, total: steps.length })} /></View>
      </PressScale>
      <Text variant="subhead" tone="secondary" style={{ marginTop: S.lg }} numberOfLines={3} testID="next-action">{[t(n.title), n.body && t(n.body)].filter(Boolean).join(" · ")}</Text>
      <View style={{ marginTop: S.md }}>
        <Button title={t(n.cta ?? "View application")} variant={actionable ? "primary" : "secondary"} loading={paying} onPress={act} />
      </View>
      <View style={[{ marginTop: S.lg, borderRadius: R.card, backgroundColor: c.card, paddingVertical: S.xs }, curve]} testID="home-timeline">
        <Text variant="footnote" tone="secondary" weight="600" style={{ paddingHorizontal: S.md, paddingTop: S.sm }} accessibilityRole="header">{t("Status")}</Text>
        <Timeline a={a} />
      </View>
    </View>
  );
}

/** Unsubmitted draft (on this phone, or the account's server draft): destination, step reached, Continue. */
function DraftHero({ country, step, onContinue }: { country: string; step: string; onContinue: () => void }) {
  const { t } = useT();
  return (
    <View style={{ paddingHorizontal: S.lg, marginBottom: S.xxl }} testID="home-hero-draft">
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}>
        <Text variant="largeTitle" accessibilityRole="header" numberOfLines={2} style={{ flex: 1 }}>{t(country || "New application")}</Text>
        {!!country && <Flag country={country} size={64} />}
      </View>
      <Text variant="callout" weight="600" tone="accent" style={{ marginTop: S.xs }}>{`${t("Draft")} · ${t(step)}`}</Text>
      <Text variant="subhead" tone="secondary" style={{ marginTop: S.lg }} testID="next-action">{t("Not submitted yet.")}</Text>
      <View style={{ marginTop: S.md }}><Button title={t("Continue draft")} onPress={() => { tap(); onContinue(); }} /></View>
    </View>
  );
}

function HeroSkeleton() {
  return (
    <View style={{ paddingHorizontal: S.lg, marginBottom: S.xxl, gap: S.md }} accessible accessibilityLabel="Loading" testID="home-skeleton">
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}><View style={{ flex: 1, gap: S.xs }}><Skeleton w="70%" h={40} r={R.md} /><Skeleton w="50%" h={16} /></View><Skeleton w={64} h={64} r={R.round} /></View>
      <Skeleton h={S.xxs} r={R.xs} /><Skeleton w="80%" h={14} /><Skeleton h={56} r={R.round} />
      <View style={{ gap: S.lg, paddingTop: S.sm }}>{Array.from({ length: 5 }).map((_, i) => <View key={i} style={{ flexDirection: "row", gap: S.sm, alignItems: "center" }}><Skeleton w={16} h={16} r={R.round} /><Skeleton w={i % 2 ? "40%" : "55%"} h={14} /></View>)}</View>
    </View>
  );
}

/** The other applications (the hero one is left out): drafts saved on this phone + the signed-in user's server
 *  applications, most recently updated first. Only drafts and unpaid cases can be discarded. */
type Item = { key: string; country: string; status: string; at: number; open: () => void; remove?: () => void; tone?: "accent" | "secondary"; draft?: string };
function useItems(apps: Application[] | null): Item[] | null {
  const { t } = useT(); const { hydrated, drafts, openDraft, removeDraft, openServerDraft } = useForm();
  if (!hydrated) return null;
  const server = apps ?? [];
  const linked = new Set(server.map((a) => a.id));
  return [
    ...drafts.filter((d) => hasAnswers(d.form) && !(d.draftId && linked.has(d.draftId) && server.find((a) => a.id === d.draftId)?.status !== "draft")).map((d): Item => ({
      key: d.draftId ? `s:${d.draftId}` : `l:${d.key}`, country: d.form.destination || (server.find((a) => a.id === d.draftId)?.destination_country ?? ""), status: `${t("Draft")} · ${t(draftStep(d))}`, at: d.savedAt, draft: draftStep(d),
      open: () => { openDraft(d.key); router.push({ pathname: "/apply", params: { resume: "1" } }); }, remove: () => askDiscard(() => removeDraft(d.key), t) })),
    ...server.filter((a) => !(a.status === "draft" && drafts.some((d) => d.draftId === a.id)) && !isUserDiscarded(a)).map((a): Item => {
      const paid = isPaid(a);
      const status = a.status === "draft" ? t("Draft") : paid && ["submitted", "draft", "reviewing"].includes(a.status) && !employmentComplete((a.notes?.wizard ?? {}) as any) ? t("Continue application")
        : a.status === "submitted" && !paid ? `${t("Submitted")} · ${t("Payment due")}` : paid && a.status === "submitted" ? t("Paid") : t(STATUS_LABEL[a.status] ?? a.status);
      return { key: `s:${a.id}`, country: a.countries?.name ?? a.destination_country ?? "", status, at: Date.parse((a as any).updated_at ?? a.created_at ?? "") || 0, tone: status === t("Continue application") ? "accent" : "secondary",
        // A draft saved from the website or another device opens in the wizard, at the question it was left on.
        open: a.status === "draft" ? () => { openServerDraft(a.id).then((ok) => router.push(ok ? { pathname: "/apply", params: { resume: "1" } } : `/applications/${a.id}`)).catch(() => router.push(`/applications/${a.id}`)); }
          : () => router.push(status === t("Continue application") ? `/continue/${a.id}` : `/applications/${a.id}`, { withAnchor: true }),
        remove: isAbandoned(a) ? () => askDiscard(() => { discardApplication(a).catch(() => {}); }, t) : undefined,
        draft: a.status === "draft" ? SERVER_STEP[a.notes?.wizardStep ?? ""] ?? "Personal" : undefined };
    }),
  ].sort((x, y) => y.at - x.at).filter(((n) => (i: Item) => !i.remove || n++ < ABANDONED_LIMIT)(0));
}

function AppList({ items, title }: { items: Item[]; title: string }) {
  const c = useColors(); const { t } = useT();
  if (!items.length) return null;
  return (
    <ListGroup header={title} inset={S.md + 28 + S.md} style={{ marginHorizontal: S.xxs }}>
      {items.map((i) => (
        <Animated.View key={i.key} layout={LIST_LAYOUT} entering={LIST_IN} exiting={LIST_OUT} style={{ flexDirection: "row", alignItems: "center" }} testID="home-app-row">
          <PressScale onPress={() => { tap(); i.open(); }} onLongPress={i.remove} accessibilityRole="button" accessibilityLabel={`${t(i.country || "Application")}, ${i.status}`}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: S.md, paddingLeft: S.md, paddingRight: i.remove ? 0 : S.md, minHeight: 56 }}>
            {i.country ? <Flag country={i.country} size={28} /> : <View style={{ width: 28, height: 28, borderRadius: R.round, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name="doc.text.fill" size={13} color={c.tint} /></View>}
            <View style={{ flex: 1, paddingVertical: S.xs }}>
              <Text variant="body" numberOfLines={1}>{t(i.country || "New application")}</Text>
              <Text variant="footnote" tone={i.tone ?? "secondary"} numberOfLines={1}>{i.status}</Text>
            </View>
            {!i.remove && <Icon name="chevron.right" size={13} color={c.tertiaryLabel} weight="semibold" />}
          </PressScale>
          {i.remove && (
            <PressScale onPress={() => { tap(); i.remove!(); }} accessibilityRole="button" accessibilityLabel={`${t("Discard")} ${t(i.country || "")}`} testID="draft-remove"
              style={{ width: 44, height: 44, marginRight: S.xs, alignItems: "center", justifyContent: "center" }}>
              <Icon name="trash" size={17} color={c.red} />
            </PressScale>
          )}
        </Animated.View>
      ))}
    </ListGroup>
  );
}

const STORIES = [...POPULAR, "Greece", "Netherlands", "Portugal", "Austria", "Croatia", "Czech Republic"];
const RING = 78, GAP = 2.5;

/** Instagram-highlight style circle: country photo (flag fallback), name only. */
function Story({ name }: { name: string }) {
  const c = useColors(); const { t } = useT(); const photo = THUMBS[toSlug(name)] ?? PHOTOS[toSlug(name)]; const inner = RING - GAP * 4;
  return (
    <PressScale scaleTo={0.92} onPress={() => { tap(); router.push(`/destination/${toSlug(name)}`); }} accessibilityRole="button" accessibilityLabel={name} style={{ width: RING + 8, alignItems: "center", gap: S.xs }}>
      <View style={{ width: RING, height: RING, borderRadius: RING / 2, padding: GAP, borderWidth: StyleSheet.hairlineWidth, borderColor: c.separator }}>
        <View style={{ flex: 1, borderRadius: RING / 2, backgroundColor: c.bg, padding: GAP, alignItems: "center", justifyContent: "center" }}>
          {photo ? <Image source={photo} style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: c.card }} contentFit="cover" cachePolicy="memory" recyclingKey={name} /> : <Flag country={name} size={inner} />}
        </View>
      </View>
      <Text variant="caption" weight="500" numberOfLines={1} center>{t(name)}</Text>
    </PressScale>
  );
}

/** Once per launch: if a checkout opened on this device was paid (or is processing) while the app was closed,
 *  show its result screen, which reads the status from the server. */
let resumeChecked = false;
function useResumePayment() {
  const { loading, session } = useAuth();
  useEffect(() => {
    if (loading || resumeChecked) return; resumeChecked = true;
    paymentToResume(async (id) => (session ? isPaid(await getApplication(id)) : null))
      .then((id) => { if (id) router.push({ pathname: "/payment/[id]", params: { id, returned: "success" } }); })
      .catch(() => {});
  }, [loading, session]);
}

export default function Home() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets(); const { t } = useT();
  const { session, apps, unread, refreshing, refresh, err, load } = useApps(true, true);
  useResumePayment();
  const scroll = useRef<ScrollView>(null); const apptY = useRef<number | null>(null);
  const name = (session?.user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const items = useItems(session ? apps : null);
  const server = session ? apps ?? [] : [];

  // Hero: most recent active case; else the newest draft (server or this phone); else the newest finished case.
  const hero = items ? chooseHero(server, items.filter((i) => i.draft)) : null;
  const heroApp = hero?.kind === "app" ? hero.a : undefined;
  const draftItem = hero?.kind === "draft" ? hero.d : undefined;
  const heroKey = heroApp ? `s:${heroApp.id}` : draftItem?.key;
  const others = (items ?? []).filter((i) => i.key !== heroKey);
  const loading = !!session && apps === null && !err;
  const failed = !!session && apps === null && !!err;
  const showAppointment = () => { if (apptY.current != null) scroll.current?.scrollTo({ y: Math.max(0, apptY.current - S.lg), animated: true }); };
  const continueDraft = () => {
    draftItem?.open();
  };

  return (
    <ScrollView ref={scroll} style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xs, paddingBottom: pb }}
      refreshControl={session ? <RefreshControl refreshing={refreshing} onRefresh={() => { tap(); refresh(); }} tintColor={c.tint} /> : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, minHeight: 48 }}>
        <Logo height={22} />
        <PressScale onPress={() => { tap(); router.push(session ? "/account/notifications" : { pathname: "/auth", params: { mode: "signin" } }); }} accessibilityRole="button" accessibilityLabel={session ? (unread ? `Notifications, ${unread} unread` : "Notifications") : "Sign in"} hitSlop={8}>
          {session ? (
            <View><Avatar name={(session.user.user_metadata?.full_name as string) ?? session.user.email ?? ""} size={36} />{unread > 0 && <View style={{ position: "absolute", top: -1, right: -1, width: 12, height: 12, borderRadius: R.xs, backgroundColor: c.red, borderWidth: 2, borderColor: c.bg }} />}</View>
          ) : <View style={{ width: 44, height: 44, borderRadius: R.round, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name="person.fill" size={16} color={c.label} /></View>}
        </PressScale>
      </View>
      <View style={{ marginTop: S.xl }} />
      {loading ? <HeroSkeleton /> : failed ? (
        <View style={[{ marginHorizontal: S.lg, marginBottom: S.xxl, borderRadius: R.card, backgroundColor: c.card, padding: S.md, gap: S.sm }, curve]} testID="home-error" accessibilityLiveRegion="polite">
          <Text variant="headline">{t("Couldn't load your applications.")}</Text>
          <Text variant="subhead" tone="secondary">{t("Check your connection and try again.")}</Text>
          <Button title={t("Try again")} size="M" variant="secondary" onPress={() => { tap(); load(); }} />
        </View>
      ) : heroApp ? (
        <>
          <Hero a={heroApp} onShowAppointment={showAppointment} />
          <View onLayout={(e) => { apptY.current = e.nativeEvent.layout.y; }}><AppointmentCard a={heroApp} /></View>
        </>
      ) : draftItem ? (
        <DraftHero country={draftItem.country} step={draftItem.draft ?? ""} onContinue={continueDraft} />
      ) : (
        <View style={{ paddingHorizontal: S.lg, marginBottom: S.xl }} testID="home-headline">
          <Text variant="largeTitle" accessibilityRole="header">{name ? t("Hi, {name}", { name }) : t("Where to next?")}</Text>
          {session && apps?.length === 0 && (
            <View style={[{ marginTop: S.lg, borderRadius: R.card, backgroundColor: c.card, padding: S.md, gap: S.sm }, curve]} testID="home-timeline-empty">
              <Text variant="headline">{t("No application yet")}</Text>
              <Text variant="subhead" tone="secondary">{t("Start an application to track it here.")}</Text>
              <Button title={t("Start application")} size="M" onPress={() => { tap(); router.push("/apply"); }} />
            </View>
          )}
        </View>
      )}
      <PressScale onPress={() => { tap(); router.navigate("/countries"); }} accessibilityRole="search" accessibilityLabel={t("Search destinations")}
        style={{ marginHorizontal: S.lg, marginBottom: S.xxl, minHeight: 44, borderRadius: R.md, backgroundColor: c.fill, flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.sm }}>
        <Icon name="magnifyingglass" size={ICON.md} color={c.secondaryLabel} weight="medium" />
        <Text variant="body" tone="secondary">{t("Search destinations")}</Text>
      </PressScale>
      <AppList items={others} title={heroKey ? t("Other applications") : t("Your applications")} />
      <SectionHeader title={t("Popular countries")} action={t("See all")} onAction={() => router.navigate("/countries")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.lg - 4, gap: S.xs }} testID="popular-stories">
        {STORIES.map((n) => <Story key={n} name={n} />)}
      </ScrollView>
    </ScrollView>
  );
}
