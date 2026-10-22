import { ScrollView, View, RefreshControl, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../../components/Logo";
import { Text, Flag, Icon, PressScale, SectionHeader, ListGroup, Avatar, Skeleton, useTabInset, journeyIndex, Button, ProgressSegments, Timeline } from "../../../components/ui";
import { useColors, useIsDark, S, R, curve, elevation, ICON } from "../../../lib/theme";
import { POPULAR, toSlug } from "../../../lib/countries";
import { PHOTOS, THUMBS } from "../../../lib/photos";
import { STATUS_LABEL, isPaid, type Application } from "../../../lib/data";
import { useApps, ACTIVE } from "../../../lib/useApps";
import { tap } from "../../../lib/haptics";
import { useEffect, useState } from "react";
import { listRequirements } from "../../../lib/data";
import { buildChecklist, type CheckItem } from "../../../lib/checklist";
import { nextAction } from "../../../lib/nextAction";
import { whatsapp, startPayment } from "../../../lib/api";
import { useForm } from "../../../lib/form";
import { hasAnswers, employmentComplete } from "../../../lib/wizard";
import { Q_BY_ID } from "../../../lib/questions";
import { useT } from "../../../lib/i18n";
import { countdown } from "../../../lib/countdown";
import Animated from "react-native-reanimated";
import { LIST_LAYOUT, LIST_IN, LIST_OUT } from "../../../lib/motion";
import { ABANDONED_LIMIT, askDiscard, discardApplication, isAbandoned } from "../../../lib/discard";

/** Editorial hero built only from the user's REAL active application: destination, status, countdown, journey progress
 *  and ONE primary action (the real next step from status, payment and documents). */
function Hero({ a }: { a: Application }) {
  const c = useColors(); const dark = useIsDark(); const { t, lang } = useT();
  const [items, setItems] = useState<CheckItem[] | null>(null);
  useEffect(() => { let on = true; listRequirements(a.country_id, (a.notes?.wizard as any)?.employmentStatus).then((r) => on && setItems(buildChecklist(r, a.documents).customer)).catch(() => on && setItems([])); return () => { on = false; }; }, [a]);
  const name = a.countries?.name ?? ""; const idx = journeyIndex(a.status, a.payment_status); const cd = countdown(a.entry_date, a.exit_date, t);
  const n = items ? nextAction(a, items) : null;
  const open = () => router.push(`/applications/${a.id}`, { withAnchor: true });
  const act = n?.kind === "continue" ? () => router.push(`/continue/${a.id}`) : !n || n.kind === "none" ? open : n.kind === "pay" ? () => { startPayment(a, a.applicants.length > 1).then((o) => router.push({ pathname: "/payment/[id]", params: { id: a.id, returned: o.returned, pid: o.paymentId ?? "" } })).catch(open); } : open;
  const status = t(STATUS_LABEL[a.status] ?? a.status);
  return (
    <View style={{ paddingHorizontal: S.lg, marginBottom: S.xxl }} testID="home-hero">
      <PressScale onPress={() => { tap(); open(); }} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={[t(name), status, cd].filter(Boolean).join(", ")} accessibilityHint={t("Opens the application")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}>
          <View style={{ flex: 1, gap: S.xxs }}>
            <Text variant="largeTitle" accessibilityRole="header" numberOfLines={2}>{t(name)}</Text>
          </View>
          <HeroFlag country={name} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: S.xs, marginTop: S.sm }}>
          <Text variant="callout" weight="600" tone="accent">{status}</Text>
          {!!cd && <><Text variant="callout" tone="tertiary">·</Text><Text variant="callout" tone="secondary" testID="countdown">{cd}</Text></>}
        </View>
        <View style={{ marginTop: S.md }}><ProgressSegments count={4} index={idx} label={status} /></View>
      </PressScale>
      {n ? (<>
        {n.kind !== "none" && <Text variant="subhead" tone="secondary" style={{ marginTop: S.lg }} numberOfLines={3} testID="next-action">{t(n.title)} · {t(n.body)}</Text>}
        <View style={{ marginTop: S.md }}><Button title={n.kind === "none" || !n.cta ? t("View application") : t(n.cta)} onPress={act} /></View>
      </>) : <View style={{ marginTop: S.lg, gap: S.md }}><Skeleton w="80%" h={14} /><Skeleton h={56} r={R.round} /></View>}
      {/* Status timeline from the live columns only (application_status, payment_status, created_at/updated_at). */}
      <View style={[{ marginTop: S.lg, borderRadius: R.card, backgroundColor: c.card, paddingVertical: S.xs }, curve]} testID="home-timeline">
        <Text variant="footnote" tone="secondary" weight="600" style={{ paddingHorizontal: S.md, paddingTop: S.sm }} accessibilityRole="header">{t("Your application")}</Text>
        <Timeline a={a} t={t} />
      </View>
    </View>
  );
}
/** Round flag, no decoration. */
function HeroFlag({ country }: { country: string }) { return <Flag country={country} size={72} />; }
function HeroSkeleton() {
  return (
    <View style={{ paddingHorizontal: S.lg, marginBottom: S.xxl, gap: S.md }} accessible accessibilityLabel="Loading">
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}><View style={{ flex: 1, gap: S.xs }}><Skeleton w={80} h={12} /><Skeleton w="70%" h={40} r={R.md} /></View><Skeleton w={72} h={72} r={R.round} /></View>
      <Skeleton w="45%" h={16} /><Skeleton h={S.xxs} r={R.xs} /><Skeleton h={56} r={R.round} />
    </View>
  );
}

/** Every application in one compact list: drafts saved on this phone + the signed-in user's server applications,
 *  most recently updated first. Only local drafts can be removed here. */
function AppList({ apps }: { apps: Application[] | null }) {
  const c = useColors(); const { t } = useT(); const { hydrated, drafts, openDraft, removeDraft } = useForm();
  if (!hydrated) return null;
  const server = apps ?? [];
  const linked = new Set(server.map((a) => a.id));
  type Item = { key: string; country: string; status: string; at: number; open: () => void; remove?: () => void; tone?: "accent" | "secondary" };
  const items: Item[] = [
    ...drafts.filter((d) => hasAnswers(d.form) && !(d.draftId && linked.has(d.draftId) && server.find((a) => a.id === d.draftId)?.status !== "draft")).map((d): Item => {
      const q = d.page.startsWith("q:") ? Q_BY_ID[d.page.slice(2)] : null;
      return { key: `l:${d.key}`, country: d.form.destination, status: `${t("Draft")} · ${q ? t(STEP_LABEL[q.step] ?? q.step) : t("Review")}`, at: d.savedAt,
        open: () => { openDraft(d.key); router.push({ pathname: "/apply", params: { resume: "1" } }); }, remove: () => askDiscard(() => removeDraft(d.key), t) };
    }),
    ...server.filter((a) => !(a.status === "draft" && drafts.some((d) => d.draftId === a.id))).map((a): Item => {
      const paid = isPaid(a);
      const status = a.status === "draft" ? t("Draft") : paid && ["submitted", "draft", "reviewing"].includes(a.status) && !employmentComplete((a.notes?.wizard ?? {}) as any) ? t("Continue application")
        : a.status === "submitted" && !paid ? `${t("Submitted")} · ${t("Payment due")}` : paid && a.status === "submitted" ? t("Paid") : t(STATUS_LABEL[a.status] ?? a.status);
      return { key: `s:${a.id}`, country: a.countries?.name ?? a.destination_country ?? "", status, at: Date.parse((a as any).updated_at ?? a.created_at ?? "") || 0, tone: status === t("Continue application") ? "accent" : "secondary",
        open: () => router.push(status === t("Continue application") ? `/continue/${a.id}` : `/applications/${a.id}`, { withAnchor: true }),
        remove: isAbandoned(a) ? () => askDiscard(() => { discardApplication(a).catch(() => {}); }, t) : undefined };
    }),
  ].sort((x, y) => y.at - x.at).filter(((n) => (i: Item) => !i.remove || n++ < ABANDONED_LIMIT)(0));
  if (!items.length || (items.length === 1 && items[0].key.startsWith("s:"))) return null; // one server app = the hero above
  return (
    <ListGroup header={t("Your applications")} inset={S.md + 28 + S.md} style={{ marginHorizontal: S.xxs }}>
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
const STEP_LABEL: Record<string, string> = { personal: "Personal", spouse: "Spouse", employment: "Employment", "trip-details": "Trip" };

const today = (lang: string) => new Date().toLocaleDateString(lang === "ar" ? "ar" : undefined, { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

/** Wallet-style pass for the current application. */
const STORIES = [...POPULAR, "Greece", "Netherlands", "Portugal", "Austria", "Croatia", "Czech Republic"];
const RING = 78, GAP = 2.5;

/** Instagram-highlight style circle: brand-gradient ring, country photo (flag fallback), name only. */
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


export default function Home() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets(); const { t, lang } = useT();
  const { session, apps, unread, refreshing, refresh } = useApps(true);
  const name = (session?.user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const active = apps?.find((a) => ACTIVE(a.status) && a.status !== "draft");
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xs, paddingBottom: pb }}
      refreshControl={session ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.tint} /> : undefined}>
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
      {session && apps === null ? <HeroSkeleton /> : active ? <Hero a={active} /> : (
        <View style={{ paddingHorizontal: S.lg, marginBottom: S.xl }} testID="home-headline">
          <Text variant="largeTitle" accessibilityRole="header">{name ? t("Hi, {name}", { name }) : t("Where to next?")}</Text>
          {session && apps?.length === 0 && (
            <View style={[{ marginTop: S.lg, borderRadius: R.card, backgroundColor: c.card, padding: S.md, gap: S.sm }, curve]} testID="home-timeline-empty">
              <Text variant="headline">{t("No application yet")}</Text>
              <Text variant="subhead" tone="secondary">{t("Start an application to track it here.")}</Text>
              <Button title={t("Start application")} size="M" onPress={() => router.push("/apply")} />
            </View>
          )}
        </View>
      )}
      <PressScale onPress={() => { tap(); router.navigate("/countries"); }} accessibilityRole="search" accessibilityLabel={t("Search destinations")}
        style={{ marginHorizontal: S.lg, marginBottom: S.xxl, minHeight: 44, borderRadius: R.md, backgroundColor: c.fill, flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.sm }}>
        <Icon name="magnifyingglass" size={ICON.md} color={c.secondaryLabel} weight="medium" />
        <Text variant="body" tone="secondary">{t("Search destinations")}</Text>
      </PressScale>
      <AppList apps={session ? apps : null} />
      <SectionHeader title={t("Popular countries")} action={t("See all")} onAction={() => router.navigate("/countries")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.lg - 4, gap: S.xs }} testID="popular-stories">
        {STORIES.map((n) => <Story key={n} name={n} />)}
      </ScrollView>
    </ScrollView>
  );
}
