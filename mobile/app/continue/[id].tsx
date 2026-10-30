// Continue application (after payment): every question that is not needed to pay (trip details, passport & residence,
// spouse, employment), one per screen, with the same screen as the wizard (components/wizard/QuestionView). Only the
// questions still missing are asked (rows from the website already have most answers). Each answer is saved to the
// application row as you go (saveAfterPayment); the last one returns to the application.
import { useEffect, useRef, useState } from "react";
import { View, Platform, AccessibilityInfo, I18nManager } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Skeleton, InlineError, EmptyState, Button, showSaved, StepHeader, PressScale, type IconName } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { QuestionView } from "../../components/wizard/QuestionView";
import { useColors, S, R } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { slideIn } from "../../lib/motion";
import { getApplication, saveAfterPayment, continueForm, isWebsiteRow, withTimeout, patchNotes } from "../../lib/data";
import { DETAIL_STEP_TITLES, OTHER_NATIONALITY, emptyForm, travellerKey, type DetailStep, type WizardForm, type Traveller } from "../../lib/wizard";
import { continueQuestions, continueError, Q_BY_ID, type Question } from "../../lib/questions";
import { fetchTravellers, rememberTravellersAfterPayment, markTravellerUsed } from "../../lib/travellers";
import { TravellerRows } from "../../components/wizard/travellers";
import { success, error as hError, tap, select } from "../../lib/haptics";
import { missingDocuments, flexibleNotes } from "../../lib/missing";

const AUTO_MS = 260;

/** Short label + icon per after-payment step; Documents (upload) always comes last. */
const STEP_UI: Record<string, [string, IconName]> = { trip: ["Trip", "airplane"], passport: ["Passport", "person.text.rectangle"], spouse: ["Spouse", "person.2.fill"], employment: ["Employment", "briefcase.fill"] };

export default function ContinueApplication() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, rtl } = useT(); const isRTL = rtl || I18nManager.isRTL; const reduce = useReducedMotion();
  const { session, loading: authLoading } = useAuth(); const me = session?.user?.email; const [nonce, setNonce] = useState(0); const [allDone, setAllDone] = useState(false);
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
  // Saved travellers (lib/travellers.ts): the spouse can be picked from them (everyone but this case's main applicant).
  const [travellers, setTravellers] = useState<Traveller[]>([]); const mainTravellerId = useRef<string | null>(null);
  useEffect(() => { if (!me) return; let on = true; fetchTravellers().then((l) => { if (on) setTravellers(l); }).catch(() => {}); return () => { on = false; }; }, [me]);

  useEffect(() => {
    if (!me) return; let live = true; setLoadErr(null); setAllDone(false);
    withTimeout(getApplication(id!)).then((app) => {
      if (!live) return;
      mainTravellerId.current = app.notes?.travellerId ?? null;
      const form = continueForm(app); saved.current = form;
      const web = isWebsiteRow(app);
      // The spouse travels with them: "Who are you traveling with?" starts on With Spouse (still asked: children may come too).
      if (!web && form.spouseAccompanying === "yes" && !form.travelingWith) { form.travelingWith = "spouse"; preset.current.add("travelingWith"); }
      setWebsite(web); setF(form);
      const first = continueQuestions(form, web).find((x) => !!continueError(x, form, saved.current) || preset.current.has(x.id));
      if (first) setQid(first.id); else { setAllDone(true); router.replace(`/applications/${id}`, { withAnchor: true }); }
    }).catch((e) => { if (live) setLoadErr(t(e?.message ?? String(e))); });
    return () => { live = false; };
  }, [id, me, nonce]);

  const q: Question | null = qid ? Q_BY_ID[qid] ?? null : null;
  const list = f ? continueQuestions(f, website) : [];
  const idx = q ? list.findIndex((x) => x.id === q.id) : -1;
  // Steps of this row's questions (website rows: passport + employment), then Documents.
  const stepKeys = [...new Set(list.map((x) => x.step as string))];
  const inStep = q ? list.filter((x) => x.step === q.step) : [];
  const patch = (x: Partial<WizardForm>) => setF((y) => (y ? { ...y, ...x } : y));
  const goTo = (next: string, d: number) => { if (auto.current) clearTimeout(auto.current); setDir(d); setQid(next); setShowErr(false); setAllMode(false); setErr(null); };
  const close = () => { tap(); if (router.canGoBack()) router.back(); else router.replace(`/applications/${id}`, { withAnchor: true }); };

  /** Save what we have, queued behind earlier saves (best effort while moving on; awaited on the last question). */
  const save = (nf: WizardForm) => {
    const run = saving.current.catch(() => {}).then(async () => {
      const r = await saveAfterPayment(id!, nf);
      if (!r.synced) throw new Error(t("Your application is already in review, so it can't be changed here. Please message us on WhatsApp."));
      // App-only notes keys (kept by the contract's applicationColumns): "To get later" and the flexible window.
      await patchNotes(id!, { missingDocuments: missingDocuments(nf), ...flexibleNotes(nf) }).catch(() => {});
      rememberTravellersAfterPayment(nf); // paid case: passport details + spouse become saved travellers (never throws)
      showSaved(); // the server confirmed: 1.5 s "Saved" pill
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
  // Canvas: Trip · Passport · Spouse · Employment segments (only the steps this row still has) and "Save" on the right:
  // every answer is already saved, so Save just closes.
  const segIndex = q ? stepKeys.indexOf(q.step) : 0;
  const header = (
    <View style={{ paddingTop: top, paddingBottom: S.sm }}>
      <StepHeader steps={stepKeys.map((k) => t(STEP_UI[k]?.[0] ?? k))} index={segIndex} fraction={inStep.length && q ? inStep.indexOf(q) / inStep.length : 0} onBack={back}
        a11yLabel={q ? t("{step}, {i} of {n}", { step: t(DETAIL_STEP_TITLES[q.step as DetailStep]?.title ?? q.step), i: idx + 1, n: list.length }) : t("Continue application")}
        right={<PressScale onPress={close} accessibilityRole="button" accessibilityLabel={t("Save and close")} testID="continue-save" style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Text variant="callout" weight="600" tone="accent">{t("Save")}</Text></PressScale>} />
    </View>
  );

  if (!f || !q) return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      {!session && !authLoading ? <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}><EmptyState icon="person.crop.circle" title={t("Sign in to continue your application")} message={t("Use the email you paid with.")} action={<Button title={t("Sign in")} onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />} /></View>
        : loadErr ? <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}><EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={loadErr} action={<Button title={t("Retry")} variant="secondary" onPress={() => setNonce((n) => n + 1)} />} /></View>
        : allDone ? <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}><EmptyState icon="checkmark.circle.fill" title={t("Nothing left to add")} action={<Button title={t("Open application")} onPress={() => router.replace(`/applications/${id}`, { withAnchor: true })} />} /></View>
        : <View style={{ padding: S.lg, gap: S.md }}><Skeleton w="60%" h={28} /><Skeleton h={60} r={R.tile} /><Skeleton h={60} r={R.tile} /></View>}
    </View>
  );

  // Spouse name: pick the spouse from the saved travellers (the main applicant of this case is left out).
  const mainKey = travellerKey(f);
  const spouseOptions = q.id === "spouseName" ? travellers.filter((x) => x.id !== mainTravellerId.current && travellerKey(x) !== mainKey) : [];
  const pickSpouse = (v: string) => {
    const tr = v === "none" ? null : spouseOptions.find((x) => x.id === v) ?? null;
    if (tr) {
      patch({ spouseFirstName: tr.firstName ?? "", spouseLastName: tr.lastName ?? "", ...(tr.hasValidPassport === "yes" || tr.hasValidPassport === "no" ? { spouseHasValidPassport: tr.hasValidPassport } : {}) });
      markTravellerUsed(tr.id);
    }
    patchNotes(id!, { spouseTravellerId: tr?.id }).catch(() => {});
  };
  const spousePicker = spouseOptions.length ? (
    <View style={{ gap: S.sm, paddingBottom: S.xs }} testID="spouse-picker">
      <Text variant="subhead" tone="secondary">{t("Pick a saved traveller to fill in the spouse details.")}</Text>
      <TravellerRows travellers={spouseOptions} onPick={pickSpouse} someoneElse={t("Enter spouse details")} testID="spouse-traveller" />
    </View>
  ) : null;

  return (
    <QuestionView q={q} f={f} patch={patch} pick={pick} advance={() => advance()} showErr={showErr} errTick={errTick} settled={settled}
      header={header} entering={slideIn(dir, isRTL, reduce)} pageKey={q.id} titleRef={titleRef} allMode={allMode}
      doneLabel={busy ? t("Saving…") : !list.slice(idx + 1).some((x) => pending(x, f)) ? t("Finish and upload documents") : undefined} errorOf={(x, y) => continueError(x, y, saved.current)}
      belowTitle={err || spousePicker ? <>{err ? <InlineError text={err} /> : null}{spousePicker}</> : undefined} />
  );
}
