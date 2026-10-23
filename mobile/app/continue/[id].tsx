// Continue application (after payment): every question that is not needed to pay (trip details, passport & residence,
// spouse, employment), one per screen, with the same screen as the wizard (components/wizard/QuestionView). Only the
// questions still missing are asked (rows from the website already have most answers). Each answer is saved to the
// application row as you go (saveAfterPayment); the last one returns to the application.
import { useEffect, useRef, useState } from "react";
import { View, Platform, AccessibilityInfo, I18nManager } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useReducedMotion, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Skeleton, InlineError, EmptyState } from "../../components/ui";
import { CircleButton } from "../../components/flow";
import { QuestionView } from "../../components/wizard/QuestionView";
import { useColors, S, R, SPRING } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { slideIn } from "../../lib/motion";
import { getApplication, saveAfterPayment, continueForm, isWebsiteRow } from "../../lib/data";
import { STEP_TITLES, OTHER_NATIONALITY, emptyForm, type WizardForm } from "../../lib/wizard";
import { continueQuestions, continueError, Q_BY_ID, type Question } from "../../lib/questions";
import { success, error as hError, tap, select } from "../../lib/haptics";

const AUTO_MS = 260;

function Bar({ fill }: { fill: number }) {
  const c = useColors(); const reduce = useReducedMotion(); const w = useSharedValue(fill);
  useEffect(() => { w.value = reduce ? fill : withSpring(fill, SPRING.enter); }, [fill, reduce]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return <View style={{ height: S.xxs, borderRadius: R.xs, backgroundColor: c.fill, overflow: "hidden" }}><Animated.View style={[{ height: S.xxs, borderRadius: R.xs, backgroundColor: c.accent }, a]} /></View>;
}

export default function ContinueApplication() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, rtl } = useT(); const isRTL = rtl || I18nManager.isRTL; const reduce = useReducedMotion();
  const [f, setF] = useState<WizardForm | null>(null); const fRef = useRef<WizardForm | null>(null); fRef.current = f;
  const [qid, setQid] = useState<string | null>(null); const [dir, setDir] = useState(1); const [website, setWebsite] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const [showErr, setShowErr] = useState(false); const [errTick, setErrTick] = useState(0); const [allMode, setAllMode] = useState(false);
  const [settled, setSettled] = useState(true); const [busy, setBusy] = useState(false);
  const auto = useRef<ReturnType<typeof setTimeout> | null>(null); const titleRef = useRef<any>(null);
  /** Saves run one after another, so an older answer set can never land after a newer one. */
  const saving = useRef<Promise<void>>(Promise.resolve());
  /** The answers as loaded from the row (a saved departure date stays valid as the trip gets closer). */
  const saved = useRef<WizardForm>(emptyForm);
  /** Questions this screen pre-filled (not answered by the customer yet): still shown once, with that choice selected. */
  const preset = useRef<Set<string>>(new Set());
  /** Still to ask: missing or invalid, pre-filled here, or optional and unanswered. */
  const pending = (x: Question, nf: WizardForm) => !!continueError(x, nf, saved.current) || preset.current.has(x.id)
    || (!x.required && !x.keys.some((k) => !!String((nf as any)[k] ?? "").trim()));
  useEffect(() => { setSettled(false); const tm = setTimeout(() => setSettled(true), 700); return () => clearTimeout(tm); }, [f]);
  useEffect(() => () => { if (auto.current) clearTimeout(auto.current); }, []);

  useEffect(() => {
    getApplication(id!).then((app) => {
      const form = continueForm(app); saved.current = form;
      const web = isWebsiteRow(app);
      // The spouse travels with them: "Who are you traveling with?" starts on With Spouse (still asked: children may come too).
      if (!web && form.spouseAccompanying === "yes" && !form.travelingWith) { form.travelingWith = "spouse"; preset.current.add("travelingWith"); }
      setWebsite(web); setF(form);
      const first = continueQuestions(form, web).find((x) => !!continueError(x, form, saved.current) || preset.current.has(x.id));
      if (first) setQid(first.id); else router.replace(`/applications/${id}`, { withAnchor: true });
    }).catch((e) => setLoadErr(e?.message ?? String(e)));
  }, [id]);

  const q: Question | null = qid ? Q_BY_ID[qid] ?? null : null;
  const list = f ? continueQuestions(f, website) : [];
  const idx = q ? list.findIndex((x) => x.id === q.id) : -1;
  const patch = (x: Partial<WizardForm>) => setF((y) => (y ? { ...y, ...x } : y));
  const goTo = (next: string, d: number) => { if (auto.current) clearTimeout(auto.current); setDir(d); setQid(next); setShowErr(false); setAllMode(false); setErr(null); };
  const close = () => { tap(); if (router.canGoBack()) router.back(); else router.replace(`/applications/${id}`, { withAnchor: true }); };

  /** Save what we have, queued behind earlier saves (best effort while moving on; awaited on the last question). */
  const save = (nf: WizardForm) => {
    const run = saving.current.catch(() => {}).then(async () => {
      const r = await saveAfterPayment(id!, nf);
      if (!r.synced) throw new Error(t("Your application is already in review, so it can't be changed here. Please message us on WhatsApp."));
    });
    saving.current = run;
    return run;
  };
  const advance = async (nf: WizardForm | null = fRef.current) => {
    if (!q || !nf || busy) return;
    const e = continueError(q, nf, saved.current);
    if (e) { hError(); setShowErr(true); setErrTick((n) => n + 1); AccessibilityInfo.announceForAccessibility(t(e)); return; }
    tap(); preset.current.delete(q.id);
    const qs = continueQuestions(nf, website); const i = qs.findIndex((x) => x.id === q.id);
    // Next question that still needs an answer (answers already on the row are not asked again).
    const next = qs.slice(i + 1).find((x) => pending(x, nf));
    if (next) { save(nf).catch(() => {}); goTo(next.id, 1); return; }
    setBusy(true); setErr(null);
    try { await save(nf); success(); router.replace(`/applications/${id}`, { withAnchor: true }); }
    catch (x: any) { hError(); setErr(x?.message ?? String(x)); }
    finally { setBusy(false); }
  };
  const pick = (v: string) => {
    if (!q || !fRef.current) return;
    if (v === OTHER_NATIONALITY && q.allNames) { select(); setAllMode(true); return; }
    const changes = { [q.keys[0]]: v, ...(q.onPick?.(v, fRef.current) ?? {}) } as Partial<WizardForm>;
    const nf = { ...fRef.current, ...changes }; fRef.current = nf; patch(changes);
    const note = q.note?.(nf);
    if (note && note.tone !== "green") return;
    if (auto.current) clearTimeout(auto.current);
    auto.current = setTimeout(() => advance(nf), reduce ? 80 : AUTO_MS);
  };
  const back = () => {
    tap();
    if (allMode) { setAllMode(false); return; }
    if (idx > 0) goTo(list[idx - 1].id, -1); else close();
  };

  const top = Platform.OS === "ios" ? S.sm : insets.top + S.xs;
  const header = (
    <View style={{ paddingTop: top, paddingHorizontal: S.lg, gap: S.md, paddingBottom: S.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}><CircleButton icon="chevron.left" label={t("Back")} onPress={back} /></View>
        <View style={{ flex: 1, alignItems: "center" }}><Text variant="subhead" weight="600" testID="continue-title">{t("Continue application")}</Text></View>
        <CircleButton icon="xmark" label={t("Close")} onPress={close} />
      </View>
      {q && list.length > 0 && (
        <View accessible accessibilityRole="progressbar" accessibilityLabel={t("{step}, {i} of {n}", { step: t(STEP_TITLES[q.step].title), i: idx + 1, n: list.length })} style={{ gap: S.xs }}>
          <Bar fill={(idx + 1) / list.length} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="caption" weight="600" tone="secondary">{t(STEP_TITLES[q.step].title)}</Text>
            <Text variant="caption" tone="secondary" tabular>{t("{i} of {n}", { i: idx + 1, n: list.length })}</Text>
          </View>
        </View>
      )}
    </View>
  );

  if (!f || !q) return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      {loadErr ? <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}><EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={loadErr} /></View>
        : <View style={{ padding: S.lg, gap: S.md }}><Skeleton w="60%" h={28} /><Skeleton h={60} r={R.tile} /><Skeleton h={60} r={R.tile} /></View>}
    </View>
  );

  return (
    <QuestionView q={q} f={f} patch={patch} pick={pick} advance={() => advance()} showErr={showErr} errTick={errTick} settled={settled}
      header={header} entering={slideIn(dir, isRTL, reduce)} pageKey={q.id} titleRef={titleRef} allMode={allMode}
      doneLabel={busy ? t("Saving…") : undefined} errorOf={(x, y) => continueError(x, y, saved.current)} belowTitle={err ? <InlineError text={err} /> : undefined} />
  );
}
