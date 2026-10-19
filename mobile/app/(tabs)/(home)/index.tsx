import { ScrollView, View, RefreshControl, Pressable, Image } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../../components/Logo";
import { Text, Flag, Icon, PressScale, SectionHeader, Avatar, Skeleton, useTabInset, journeyIndex } from "../../../components/ui";
import { useColors, S, R, curve } from "../../../lib/theme";
import { POPULAR, toSlug } from "../../../lib/countries";
import { LinearGradient } from "expo-linear-gradient";
import { PHOTOS } from "../../../lib/photos";
import { STATUS_LABEL, type Application } from "../../../lib/data";
import { useApps, ACTIVE } from "../../../lib/useApps";
import { tap } from "../../../lib/haptics";
import { useEffect, useState } from "react";
import { listRequirements } from "../../../lib/data";
import { buildChecklist, type CheckItem } from "../../../lib/checklist";
import { nextAction } from "../../../lib/nextAction";
import { whatsapp, startPayment } from "../../../lib/api";
import { useForm } from "../../../lib/form";
import { hasAnswers, STEP_TITLES, type WizardStep } from "../../../lib/wizard";

/** "Next action" for the active application, computed from its real status, payment and documents. */
function NextActionCard({ a }: { a: Application }) {
  const c = useColors();
  const [items, setItems] = useState<CheckItem[] | null>(null);
  useEffect(() => { let on = true; listRequirements(a.country_id).then((r) => on && setItems(buildChecklist(r, a.documents).customer)).catch(() => on && setItems([])); return () => { on = false; }; }, [a]);
  if (items === null) return <View style={{ marginHorizontal: S.lg }}><Skeleton h={88} r={R.card} /></View>;
  const n = nextAction(a, items);
  const color = n.tone === "red" ? c.red : n.tone === "orange" ? c.orange : n.tone === "green" ? c.green : c.tint;
  const act = n.kind === "pay"
    ? () => { startPayment(a, a.applicants.length > 1).catch(() => router.push(`/applications/${a.id}`)); }
    : n.kind === "none" ? undefined : () => router.push(`/applications/${a.id}`);
  return (
    <PressScale onPress={act ? () => { tap(); act(); } : undefined} disabled={!act} accessibilityRole={act ? "button" : "summary"} accessibilityLabel={`Next step: ${n.title}. ${n.body}`} accessibilityHint={n.cta}
      testID="next-action" style={{ marginHorizontal: S.lg, borderRadius: R.card, backgroundColor: c.card, padding: S.md, flexDirection: "row", alignItems: "center", gap: S.sm }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name={n.icon} size={22} color={color} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" tone="secondary" weight="600">NEXT STEP</Text>
        <Text variant="headline">{n.title}</Text>
        <Text variant="subhead" tone="secondary" numberOfLines={3}>{n.body}</Text>
        {!!n.cta && <Text variant="subhead" tone="tint" weight="600" style={{ marginTop: 2 }}>{n.cta}</Text>}
      </View>
    </PressScale>
  );
}

/** Shown when an unfinished application is saved on this phone. */
function DraftCard() {
  const c = useColors(); const { form, page, hydrated, savedAt, clearDraft } = useForm();
  if (!hydrated || !savedAt || !hasAnswers(form)) return null;
  const pg = STEP_TITLES[page as WizardStep] ? { q: STEP_TITLES[page as WizardStep].title } : undefined;
  const where = form.destination || "your application";
  return (
    <View style={{ marginHorizontal: S.lg, marginBottom: S.xxl, borderRadius: R.card, backgroundColor: c.card, flexDirection: "row", alignItems: "center" }} testID="draft-card">
      <PressScale onPress={() => { tap(); router.push({ pathname: "/apply", params: { resume: "1" } }); }} accessibilityRole="button" accessibilityLabel={`Continue ${where}. Saved on this phone${pg ? `, next: ${pg.q}` : ""}`}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md }}>
        {form.destination ? <Flag country={form.destination} size={44} /> : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name="doc.text.fill" size={20} color={c.tint} /></View>}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">Continue {form.destination || "application"}</Text>
          <Text variant="subhead" tone="secondary">Saved on this phone{pg ? ` · ${pg.q}` : ""}</Text>
        </View>
        <Icon name="chevron.right" size={14} color={c.tertiaryLabel} weight="semibold" />
      </PressScale>
      <Pressable onPress={() => { tap(); clearDraft(); }} accessibilityRole="button" accessibilityLabel="Discard saved application" style={{ width: 44, height: 44, marginRight: S.xs, alignItems: "center", justifyContent: "center" }}>
        <Icon name="xmark" size={14} color={c.secondaryLabel} weight="semibold" />
      </Pressable>
    </View>
  );
}

const today = () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

/** Wallet-style pass for the current application. */
function Pass({ a }: { a: Application }) {
  const c = useColors(); const idx = journeyIndex(a.status); const name = a.countries?.name ?? "";
  return (
    <PressScale onPress={() => { tap(); router.push(`/applications/${a.id}`); }} accessibilityRole="button" accessibilityLabel={`${name} application, ${STATUS_LABEL[a.status] ?? a.status}`}
      style={[{ marginHorizontal: S.lg, borderRadius: R.card, backgroundColor: c.brand, padding: S.lg, gap: S.xl }, curve]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <Flag country={name} size={40} />
        <View style={{ flex: 1 }}><Text variant="title3" color="#fff">{name}</Text><Text variant="footnote" color="rgba(255,255,255,0.72)" tabular>{a.reference}</Text></View>
        <Icon name="chevron.right" size={14} color="rgba(255,255,255,0.8)" weight="semibold" />
      </View>
      <View style={{ gap: S.xs }}>
        <Text variant="headline" color="#fff">{STATUS_LABEL[a.status] ?? a.status}</Text>
        <View style={{ flexDirection: "row", gap: 4 }}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= idx ? "#fff" : "rgba(255,255,255,0.3)" }} />)}</View>
      </View>
    </PressScale>
  );
}

const STORIES = [...POPULAR, "Greece", "Netherlands", "Portugal", "Austria", "Croatia", "Czech Republic"];
const RING = 78, GAP = 2.5;

/** Instagram-highlight style circle: brand-gradient ring, country photo (flag fallback), name only. */
function Story({ name }: { name: string }) {
  const c = useColors(); const photo = PHOTOS[toSlug(name)]; const inner = RING - GAP * 4;
  return (
    <PressScale scaleTo={0.92} onPress={() => { tap(); router.push(`/destination/${toSlug(name)}`); }} accessibilityRole="button" accessibilityLabel={name} style={{ width: RING + 8, alignItems: "center", gap: 6 }}>
      <LinearGradient colors={[c.brand, c.tint, "#7B61FF"]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ width: RING, height: RING, borderRadius: RING / 2, padding: GAP }}>
        <View style={{ flex: 1, borderRadius: RING / 2, backgroundColor: c.bg, padding: GAP, alignItems: "center", justifyContent: "center" }}>
          {photo ? <Image source={photo} style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: c.card }} resizeMode="cover" /> : <Flag country={name} size={inner} />}
        </View>
      </LinearGradient>
      <Text variant="caption" weight="500" numberOfLines={1} center>{name}</Text>
    </PressScale>
  );
}

export default function Home() {
  const c = useColors(); const pb = useTabInset(); const insets = useSafeAreaInsets();
  const { session, apps, unread, refreshing, refresh } = useApps(true);
  const name = (session?.user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const active = apps?.find((a) => ACTIVE(a.status) && a.status !== "draft");
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + S.xs, paddingBottom: pb }}
      refreshControl={session ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.tint} /> : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, minHeight: 48 }}>
        <Logo height={22} />
        <Pressable onPress={() => { tap(); router.push(session ? "/account/notifications" : { pathname: "/auth", params: { mode: "signin" } }); }} accessibilityRole="button" accessibilityLabel={session ? (unread ? `Notifications, ${unread} unread` : "Notifications") : "Sign in"} hitSlop={8}>
          {session ? (
            <View><Avatar name={(session.user.user_metadata?.full_name as string) ?? session.user.email ?? ""} size={36} />{unread > 0 && <View style={{ position: "absolute", top: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: c.red, borderWidth: 2, borderColor: c.bg }} />}</View>
          ) : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><Icon name="person.fill" size={16} color={c.label} /></View>}
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: S.lg, marginTop: S.xl, marginBottom: S.xl }}>
        <Text variant="footnote" tone="secondary" weight="600">{today()}</Text>
        <Text variant="display" accessibilityRole="header" style={{ marginTop: 2 }}>{name ? `Hi, ${name}` : "Where to next?"}</Text>
      </View>
      <PressScale onPress={() => { tap(); router.navigate("/countries"); }} accessibilityRole="search" accessibilityLabel="Search destinations"
        style={{ marginHorizontal: S.lg, marginBottom: S.xxl, minHeight: 56, borderRadius: R.round, backgroundColor: c.card, flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.lg }}>
        <Icon name="magnifyingglass" size={17} color={c.label} weight="semibold" />
        <Text variant="body" tone="secondary">Search destinations</Text>
      </PressScale>
      {session && apps === null && <View style={{ marginHorizontal: S.lg, marginBottom: S.xxl }}><Skeleton h={150} r={R.card} /></View>}
      {!!active && <View style={{ marginBottom: S.xxl, gap: S.sm }}><Pass a={active} /><NextActionCard a={active} /></View>}
      <DraftCard />
      <SectionHeader title="Popular countries" action="See all" onAction={() => router.navigate("/countries")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.lg - 4, gap: S.xs }} testID="popular-stories">
        {STORIES.map((n) => <Story key={n} name={n} />)}
      </ScrollView>
    </ScrollView>
  );
}
