import { PressScale } from "../../components/ui";
// Trip plan for one application: a few optional questions (cities, budget, who's travelling, interests), then an
// editable day-by-day plan from the local template engine (lib/itinerary.ts). Clearly labelled "Ideas, not bookings".
// Saved on the phone and in additional_notes.itinerary; exported as a PDF with expo-print + expo-sharing.
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, AccessibilityInfo, I18nManager } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { slideIn } from "../../lib/motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Button, Icon, Text, Skeleton, EmptyState, InlineError, SavedCheck, type IconName } from "../../components/ui";
import { CircleButton } from "../../components/flow";
import { AnswerRow } from "../../components/wizard/answers";
import { Note } from "../../components/wizard/fields";
import { useColors, useIsDark, S, R, T, curve, card } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { getApplication, type Application } from "../../lib/data";
import { BUDGETS, WHO, INTERESTS, emptyPrefs, generatePlan, loadPlan, savePlan, planHtml, suggestedCities, newId, type Plan, type Prefs, type Interest, type Slot } from "../../lib/itinerary";
import { select, success, tap, error as hError } from "../../lib/haptics";

const QS = ["cities", "budget", "who", "interests"] as const;
type QStep = (typeof QS)[number];

export default function TripPlan() {
  const { id } = useLocalSearchParams<{ id: string }>(); const dark = useIsDark();
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, lang, rtl } = useT(); const reduce = useReducedMotion();
  const isRTL = rtl || I18nManager.isRTL;
  const [a, setA] = useState<Application | null>(null); const [err, setErr] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [q, setQ] = useState<QStep | null>(null); const [dir, setDir] = useState(1);
  const [prefs, setPrefs] = useState<Prefs>(emptyPrefs); const [city, setCity] = useState("");
  const [editing, setEditing] = useState(false); const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null); const [savedTick, setSavedTick] = useState(0); const [saving, setSaving] = useState(false); const [exporting, setExporting] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    try { setErr(null); const app = await getApplication(id!); setA(app); const p = await loadPlan(app); setPlan(p); if (p) setPrefs(p.prefs); else { setQ("cities"); setPrefs({ ...emptyPrefs, cities: suggestedCities(app).slice(0, 1) }); } }
    catch (e: any) { setErr(e?.message ?? String(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const close = () => { tap(); if (router.canGoBack()) router.back(); else router.replace(`/applications/${id}`); };
  const go = (s: QStep | null, d = 1) => { setDir(d); setQ(s); };
  const persist = async (p: Plan) => {
    if (!a || busy.current) return; busy.current = true; setSaving(true);
    const r = await savePlan(a, p); setSaving(false); busy.current = false; setDirty(false);
    const m = r.synced ? t("Saved to your account") : r.error ? t("Saved on this phone. Couldn't reach your account: {e}", { e: r.error }) : t("Saved on this phone. Your application is already in review, so it can't be changed in your account.");
    setSaveMsg(m); setSavedTick((n) => n + 1); AccessibilityInfo.announceForAccessibility(m); if (r.synced) success();
  };
  const generate = async () => {
    if (!a) return;
    const p = generatePlan(a, prefs, lang); success(); setPlan(p); setQ(null); setEditing(false); await persist(p);
  };
  const update = (fn: (p: Plan) => Plan) => { setPlan((p) => (p ? fn(p) : p)); setDirty(true); setSaveMsg(null); };
  const exportPdf = async () => {
    if (!a || !plan || exporting) return; setExporting(true);
    try {
      const html = planHtml(a, plan, lang);
      if (Platform.OS === "web") await Print.printAsync({ html });
      else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: t("Trip plan") });
        else await Print.printAsync({ uri });
      }
    } catch (e: any) { hError(); setSaveMsg(e?.message ?? String(e)); }
    finally { setExporting(false); }
  };

  const top = Platform.OS === "ios" ? S.sm : insets.top + S.xs;
  const header = (left?: React.ReactNode) => (
    <View style={{ paddingTop: top, paddingHorizontal: S.lg, paddingBottom: S.sm, flexDirection: "row", alignItems: "center", gap: S.sm }}>
      {left ?? <View style={{ width: 44 }} />}
      <View style={{ flex: 1 }} />
      <CircleButton icon="xmark" label={t("Close")} onPress={close} />
    </View>
  );
  if (err) return <View style={{ flex: 1, backgroundColor: c.bg }}>{header()}<EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={err} action={<Button title={t("Retry")} variant="secondary" onPress={load} />} /></View>;
  if (!a || plan === undefined) return <View style={{ flex: 1, backgroundColor: c.bg }}>{header()}<View style={{ padding: S.lg, gap: S.md }} accessible accessibilityLabel={t("Loading")}><Skeleton w="60%" h={32} /><Skeleton h={120} r={R.card} /><Skeleton h={120} r={R.card} /></View></View>;

  // ---------- questions (one per screen, all optional) ----------
  if (q) {
    const i = QS.indexOf(q);
    const next = () => { tap(); if (i < QS.length - 1) go(QS[i + 1]); else generate(); };
    const back = () => { tap(); if (i > 0) go(QS[i - 1], -1); else if (plan) go(null, -1); else close(); };
    const pickAuto = (patch: Partial<Prefs>) => { setPrefs((p) => ({ ...p, ...patch })); setTimeout(next, reduce ? 60 : 240); };
    const sugg = suggestedCities(a).filter((x) => !prefs.cities.includes(x));
    const addCity = () => { const v = city.trim(); if (v && !prefs.cities.includes(v)) { select(); setPrefs((p) => ({ ...p, cities: [...p.cities, v] })); } setCity(""); };
    const entering = slideIn(dir, isRTL, reduce);
    const titles: Record<QStep, string> = { cities: "Which cities?", budget: "What's your budget?", who: "Who's travelling?", interests: "What do you enjoy?" };
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {header(<View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}><CircleButton icon="chevron.left" label={t("Back")} onPress={back} /></View>)}
        <View style={{ paddingHorizontal: S.lg, flexDirection: "row", gap: S.xxs }} accessible accessibilityRole="progressbar" accessibilityLabel={t("{i} of {n}", { i: i + 1, n: QS.length })}>
          {QS.map((_, k) => <View key={k} style={{ flex: 1, height: 4, borderRadius: R.xs, backgroundColor: k <= i ? c.tintFill : c.fill }} />)}
        </View>
        <Animated.View key={q} entering={entering} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: S.lg, gap: S.lg }}>
            <View style={{ gap: S.xs }}>
              <Text variant="caption" weight="600" tone="secondary">{t("Trip plan")} · {t("Optional")}</Text>
              <Text variant="title1" accessibilityRole="header" testID="trip-question">{t(titles[q])}</Text>
            </View>
            {q === "cities" && <View style={{ gap: S.md }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
                {prefs.cities.map((x) => <Chip key={x} label={x} on icon="xmark" a11y={t("Remove {c}", { c: x })} onPress={() => setPrefs((p) => ({ ...p, cities: p.cities.filter((y) => y !== x) }))} />)}
                {sugg.map((x) => <Chip key={x} label={x} icon="plus" a11y={t("Add {c}", { c: x })} onPress={() => setPrefs((p) => ({ ...p, cities: [...p.cities, x] }))} />)}
              </View>
              <View style={[{ flexDirection: "row", alignItems: "center", gap: S.xs, minHeight: 56, borderRadius: R.tile, backgroundColor: c.card, paddingHorizontal: S.md }, curve]}>
                <TextInput value={city} onChangeText={setCity} onSubmitEditing={addCity} placeholder={t("Add a city")} placeholderTextColor={c.secondaryLabel} returnKeyType="done" accessibilityLabel={t("Add a city")} testID="trip-city-input"
                  style={[T.body, { flex: 1, color: c.label, paddingVertical: S.sm, textAlign: isRTL ? "right" : "left" }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
                <PressScale onPress={addCity} disabled={!city.trim()} accessibilityRole="button" accessibilityLabel={t("Add")} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: city.trim() ? 1 : 0.4 }}><Icon name="plus" size={18} color={c.tint} weight="semibold" /></PressScale>
              </View>
              <Text variant="footnote" tone="secondary">{t("In the order you'll visit them. Days are split evenly.")}</Text>
            </View>}
            {q === "budget" && <View accessibilityRole="radiogroup" style={{ gap: S.xs }}>{BUDGETS.map((o) => <AnswerRow key={o.value} label={t(o.label)} selected={prefs.budget === o.value} onPress={() => pickAuto({ budget: o.value })} />)}</View>}
            {q === "who" && <View accessibilityRole="radiogroup" style={{ gap: S.xs }}>{WHO.map((o) => <AnswerRow key={o.value} label={t(o.label)} selected={prefs.who === o.value} onPress={() => pickAuto({ who: o.value })} />)}</View>}
            {q === "interests" && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
              {INTERESTS.map((o) => { const on = prefs.interests.includes(o.value);
                return <Chip key={o.value} label={t(o.label)} on={on} icon={o.icon as IconName} a11y={t(o.label)} checkbox onPress={() => setPrefs((p) => ({ ...p, interests: on ? p.interests.filter((x) => x !== o.value) : [...p.interests, o.value as Interest] }))} />; })}
            </View>}
          </ScrollView>
        </Animated.View>
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: Math.max(insets.bottom, S.md), gap: S.xs }}>
          <Button title={q === "interests" ? t("Create plan") : t("Continue")} onPress={next} />
          {q !== "interests" && <Button title={t("Skip")} variant="plain" color={c.secondaryLabel} onPress={next} />}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ---------- plan ----------
  if (!plan) return null;
  const fmt = (s: string | null) => (s ? new Date(s + "T12:00:00").toLocaleDateString(lang === "ar" ? "ar" : "en-GB", { weekday: "short", day: "numeric", month: "short" }) : "");
  const setDay = (di: number, patch: Partial<Plan["days"][number]>) => update((p) => ({ ...p, days: p.days.map((d, k) => (k === di ? { ...d, ...patch } : d)) }));
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {header(<PressScale onPress={() => { tap(); setEditing(!editing); }} accessibilityRole="button" accessibilityLabel={editing ? t("Done editing") : t("Edit plan")} testID="trip-edit"
        style={{ minHeight: 44, paddingHorizontal: S.md, borderRadius: R.round, backgroundColor: editing ? c.tintFill : c.card, flexDirection: "row", alignItems: "center", gap: S.xs }}>
        <Icon name={editing ? "checkmark" : "pencil"} size={14} color={editing ? "#fff" : c.label} weight="semibold" /><Text variant="subhead" weight="600" color={editing ? "#fff" : c.label}>{editing ? t("Done") : t("Edit")}</Text></PressScale>)}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.md }}>
        <View style={{ gap: S.xs }}>
          <Text variant="largeTitle" accessibilityRole="header">{t("Trip plan")}</Text>
          <Text variant="subhead" tone="secondary">{t(a.destination_country ?? "")}{a.entry_date ? ` · ${fmt(a.entry_date)} – ${fmt(a.exit_date)}` : ""}</Text>
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.sm, paddingVertical: S.xs, borderRadius: R.round, backgroundColor: c.orange + "1F" }} testID="ideas-badge">
            <Icon name="lightbulb.fill" size={13} color={c.orange} /><Text variant="caption" weight="700" color={c.orange}>{t("Ideas, not bookings")}</Text>
          </View>
        </View>
        {plan.days.map((d, di) => (
          <View key={d.id} style={[card(c, dark, 1), { padding: S.md, gap: S.sm }]} testID={`day-${d.n}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
              <Text variant="footnote" weight="700" tone="tint">{t("Day {n}", { n: d.n })}</Text>
              {!!d.date && <Text variant="footnote" tone="secondary">· {fmt(d.date)}</Text>}
              <View style={{ flex: 1 }} /><Text variant="footnote" tone="secondary">{d.city}</Text>
            </View>
            {editing ? <TextInput value={d.title} onChangeText={(v) => setDay(di, { title: v })} accessibilityLabel={t("Day {n} title", { n: d.n })} style={[T.headline, { color: c.label, minHeight: 44, borderBottomWidth: 1, borderBottomColor: c.separator, textAlign: isRTL ? "right" : "left" }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
              : <Text variant="headline">{d.title}</Text>}
            {d.items.map((it, ii) => (
              <View key={it.id} style={{ flexDirection: "row", alignItems: editing ? "center" : "flex-start", gap: S.sm }}>
                <PressScale disabled={!editing} onPress={() => { select(); const order: Slot[] = ["Morning", "Afternoon", "Evening"]; setDay(di, { items: d.items.map((x, k) => (k === ii ? { ...x, time: order[(order.indexOf(x.time) + 1) % 3] } : x)) }); }}
                  accessibilityRole={editing ? "button" : "text"} accessibilityLabel={t(it.time)} accessibilityHint={editing ? t("Changes the time of day") : undefined} style={{ width: 84, minHeight: editing ? 44 : undefined, justifyContent: "center" }}>
                  <Text variant="caption" weight="600" tone={editing ? "tint" : "secondary"}>{t(it.time)}</Text>
                </PressScale>
                {editing ? <>
                  <TextInput value={it.text} onChangeText={(v) => setDay(di, { items: d.items.map((x, k) => (k === ii ? { ...x, text: v } : x)) })} multiline accessibilityLabel={t("Idea")}
                    style={[T.subhead, { flex: 1, color: c.label, minHeight: 44, paddingVertical: S.xs, textAlign: isRTL ? "right" : "left" }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
                  <PressScale onPress={() => { select(); setDay(di, { items: d.items.filter((_, k) => k !== ii) }); }} accessibilityRole="button" accessibilityLabel={t("Delete idea")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={16} color={c.red} /></PressScale>
                </> : <Text variant="subhead" style={{ flex: 1 }}>{it.text}</Text>}
              </View>
            ))}
            {editing && <PressScale onPress={() => { select(); setDay(di, { items: [...d.items, { id: newId(), time: "Afternoon", text: "" }] }); }} accessibilityRole="button" accessibilityLabel={t("Add idea to day {n}", { n: d.n })} testID={`add-idea-${d.n}`}
              style={{ flexDirection: "row", alignItems: "center", gap: S.xs, minHeight: 44 }}><Icon name="plus" size={14} color={c.tint} weight="semibold" /><Text variant="subhead" tone="tint" weight="600">{t("Add idea")}</Text></PressScale>}
          </View>
        ))}
        {editing && <View style={{ flexDirection: "row", gap: S.sm }}>
          <View style={{ flex: 1 }}><Button title={t("Add day")} icon="plus" variant="secondary" size="M" onPress={() => update((p) => { const last = p.days[p.days.length - 1]; const date = last?.date ? new Date(new Date(last.date + "T12:00:00").getTime() + 864e5).toISOString().slice(0, 10) : null; return { ...p, days: [...p.days, { id: newId(), n: p.days.length + 1, date, city: last?.city ?? "", title: t("Free day"), items: [] }] }; })} /></View>
          <View style={{ flex: 1 }}><Button title={t("Remove last day")} variant="secondary" size="M" disabled={plan.days.length <= 1} onPress={() => update((p) => ({ ...p, days: p.days.slice(0, -1) }))} /></View>
        </View>}
        {!!saveMsg && <Note tone={saveMsg === t("Saved to your account") ? "green" : "amber"}><View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>{saveMsg === t("Saved to your account") && <SavedCheck key={saveMsg + String(savedTick)} />}<Text variant="subhead" tone="secondary" testID="trip-save-msg" style={{ flex: 1 }}>{saveMsg}</Text></View></Note>}
        <Button title={t("Change answers")} icon="arrow.counterclockwise" variant="plain" color={c.secondaryLabel} onPress={() => go("cities", -1)} />
      </ScrollView>
      <View style={{ flexDirection: "row", gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: Math.max(insets.bottom, S.md) }}>
        <View style={{ flex: 1 }}><Button title={t("Save")} variant={dirty ? "primary" : "secondary"} loading={saving} disabled={saving} onPress={() => persist(plan)} /></View>
        <View style={{ flex: 1 }}><Button title={t("Export PDF")} icon="square.and.arrow.up" variant="secondary" loading={exporting} onPress={exportPdf} /></View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, on, icon, onPress, a11y, checkbox }: { label: string; on?: boolean; icon?: IconName; onPress: () => void; a11y: string; checkbox?: boolean }) {
  const c = useColors();
  return (
    <PressScale onPress={() => { select(); onPress(); }} accessibilityRole={checkbox ? "checkbox" : "button"} accessibilityState={checkbox ? { checked: !!on } : undefined} aria-checked={checkbox ? !!on : undefined} accessibilityLabel={a11y}
      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: S.xs, minHeight: 48, paddingHorizontal: S.md, borderRadius: R.round, backgroundColor: on ? c.tintFill : c.card, opacity: pressed ? 0.75 : 1 }, curve]}>
      {!!icon && <Icon name={icon} size={15} color={on ? "#fff" : c.tint} />}
      <Text variant="subhead" weight="600" color={on ? "#fff" : c.label}>{label}</Text>
    </PressScale>
  );
}
