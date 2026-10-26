import { track } from "../../lib/analytics";
import { PressScale } from "../../components/ui";
// Application wizard, one question per screen. The questions, labels, options, order and validation come from the
// website wizard (lib/questions.ts on top of lib/wizard.ts), so the data stays identical to www.ezvisa.net/apply.
// Choices and Yes / No auto-advance with haptics; questions that don't apply are skipped; every answer is autosaved
// (phone + the account's draft row) and the flow resumes at the exact question. Review lets you edit one answer and
// come straight back. Links keep the website's params: /apply?step=<slug>&from=<nationality>&to=<destination>.
import { citizenshipName } from "../../lib/citizenship";
import { useEffect, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { ScrollView, View, KeyboardAvoidingView, Platform, AccessibilityInfo, findNodeHandle, Pressable, Modal, TextInput, I18nManager } from "react-native";
import Animated, { useAnimatedKeyboard, FadeIn, FadeOut, useReducedMotion, withTiming, Easing } from "react-native-reanimated";
import { slideIn } from "../../lib/motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { matchEmirate, DEFAULT_RESIDENCE, coerceResidence } from "../../lib/wizard";
import { router, useLocalSearchParams, useRootNavigationState } from "expo-router";
import { Button, Text, Icon, SuccessCheck, InlineError } from "../../components/ui";
import { CircleButton, StepIndicator, type FlowStep } from "../../components/flow";
import { Note } from "../../components/wizard/fields";
import { useFmtDate } from "../../components/wizard/answers";
import { useColors, S, R, curve } from "../../lib/theme";
import { fromSlug } from "../../lib/countries";
import { useForm } from "../../lib/form";
import { useAuth } from "../../lib/auth";
import { needsSchengenVisa } from "../../lib/wizard";
import { useT } from "../../lib/i18n";
import { SUPABASE_ENABLED } from "../../lib/config";
import { whatsapp } from "../../lib/api";
import { money, startPayment, usePaying, useQuote } from "../../lib/payments";
import { formatPayAmount, PAY_AED } from "../../lib/payLabel";
import { submitApplication, guestSubmit, listRequirements, patchNotes, DraftConflictError, type Requirement } from "../../lib/data";
import { PrefillOffer } from "../../components/wizard/extras";
import { fetchTravellers, applyTravellerToForm, markTravellerUsed } from "../../lib/travellers";
import { QuestionView } from "../../components/wizard/QuestionView";
import { SyncIndicator, DraftConflictSheet } from "../../components/wizard/sync";
import { loadProfile, applyProfile, isFreshDraft, profileChanges, saveProfile, markPrefilled, markAsked, shouldAsk, type ProfileChange } from "../../lib/profile";
import { useNetInfo } from "@react-native-community/netinfo";
import { scheduleDraftReminder, cancelDraftReminder } from "../../lib/reminders";
import { error as hError, tap, success, select } from "../../lib/haptics";
import { WORLD } from "../../lib/world";
import { emptyForm, type WizardForm, type WizardStep, type Traveller, TRAVELLER_KEYS, SCHENGEN, SCHENGEN_VISA_REQUIRED, OTHER_NATIONALITY, STEP_TITLES, showSpouse, parseStep, matchCountry, hasAnswers, safeDecode } from "../../lib/wizard";
import { type Question, setAccountEmail, setTravellers, Q_BY_ID, REVIEW, activeQuestions, firstError, firstInvalid, firstUnanswered, normalizePage, pageForStep, stepOfPage, progressOf, displayValue } from "../../lib/questions";

const WORLD_NAMES = WORLD.map((w) => w.name);
const isoDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? s : "");
const titleCase = (s: string) => safeDecode(s).replace(/[-_+]+/g, " ").trim().replace(/\b\w/g, (m) => m.toUpperCase());
const AUTO_MS = 260;
/** Other stable answers the user can reuse from the last application with one tap (trip answers are never copied).
 *  The profile fields (name, nationality, date of birth, passport validity and expiry, phone) are prefilled on their own, see lib/profile.ts. */
const PREFILL_KEYS: (keyof WizardForm)[] = ["cityOfResidence", "hasEmiratesId", "maritalStatus",
  "spouseFirstName", "spouseLastName", "employmentStatus", "jobTitle", "companyName", "employmentStartDate", "monthlySalary", "averageMonthlyIncome"];
const cleanAfterPrefill = (f: WizardForm): WizardForm => coerceResidence({ ...f, nationality: SCHENGEN_VISA_REQUIRED.includes(f.nationality) ? f.nationality : "" });
const STEP_ORDER: WizardStep[] = ["destination", "personal", "payment"];
type Params = { step?: string; from?: string; to?: string; nationality?: string; destination?: string; travelStartDate?: string; travelEndDate?: string; country?: string; resume?: string; city?: string; cityOfResidence?: string };

/** Where you are: Details (the questions before payment) -> Review -> Payment. The line after Details fills as you answer. */
function Progress({ f, page }: { f: WizardForm; page: string }) {
  const { t } = useT();
  const p = progressOf(f, page); const cur = p.segs[p.stepIndex];
  const review = p.curStep === "payment";
  const steps: FlowStep[] = [{ key: "details", label: t("Details"), icon: "person.text.rectangle" }, { key: "review", label: t("Review"), icon: "doc.text" }, { key: "pay", label: t("Payment"), icon: "creditcard" }];
  const label = t("{step}, step {i} of {n}", { step: t(STEP_TITLES[p.curStep].title), i: p.stepIndex + 1, n: p.steps.length }) + (!review && cur ? ", " + t("{i} of {n}", { i: cur.index, n: cur.count }) : "");
  return <StepIndicator steps={steps} current={review ? 1 : 0} fraction={review ? 0 : cur?.fill ?? 0} a11yLabel={label} />;
}

export default function Apply() {
  const c = useColors(); const reduce = useReducedMotion(); const insets = useSafeAreaInsets(); const { t, rtl } = useT(); const fmt = useFmtDate();
  const p = useLocalSearchParams<Params>();
  const { form: f, setForm, submitted, setSubmitted, page: rawPage, setPage, hydrated, savedAt, clearDraft, draftId, flushDraft, baseAt, sync, checkRemote, hasConflict, drafts, openDraft, startNew, activeKey } = useForm();
  const guestId = useRef<string | null>(null); // one id per guest submit: a retry after a lost reply can't add a second row
  const { session } = useAuth(); const [paidGuest, setPaidGuest] = useState(false);
  setAccountEmail(session?.user.email); // before any activeQuestions() below: signed in = no email question
  // Citizenship saved in Account details prefills the nationality step (only if it is still empty and visa-required).
  const citizenship = citizenshipName(session?.user.user_metadata?.citizenship as string | undefined) || undefined; // ISO code (or an older saved name)
  useEffect(() => { if (hydrated && citizenship && needsSchengenVisa(citizenship)) setForm((x) => (x.nationality ? x : { ...x, nationality: citizenship })); }, [hydrated, citizenship]);
  const uid = session?.user.id ?? null;
  const [dir, setDir] = useState(1);
  const [showErr, setShowErr] = useState(false); const [errTick, setErrTick] = useState(0); // re-shake on every failed Continue
  const [editing, setEditing] = useState<Set<string> | null>(null); // came from Review: question ids that applied at that moment
  const [resumeAsk, setResumeAsk] = useState(false);
  const [allMode, setAllMode] = useState(false); // nationality: "Other nationality" opened the full visa-required list
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const inFlight = useRef(false); const auto = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<any>(null);
  const lastSlug = useRef<string | undefined>(undefined); const started = useRef(false);
  const fRef = useRef(f); fRef.current = f;
  const navReady = !!useRootNavigationState()?.key;
  const isRTL = rtl || I18nManager.isRTL;
  // Inline validation: errors appear on their own once typing pauses (no need to press Continue first).
  const [settled, setSettled] = useState(true);
  useEffect(() => { setSettled(false); const tm = setTimeout(() => setSettled(true), 700); return () => clearTimeout(tm); }, [f]);
  const net = useNetInfo(); const offline = net.isConnected === false;
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [prefill, setPrefill] = useState<{ values: Partial<WizardForm>; name: string } | null>(null); const prefillAsked = useRef<string | null>(null);
  const [fromProfile, setFromProfile] = useState<{ key: string; values: Partial<WizardForm>; source?: "profile" | "traveller" } | null>(null); // answers filled from the profile / a saved traveller in this draft
  // Saved travellers of the account (lib/travellers.ts): null while loading. The "Who is travelling?" question
  // applies once the list is in (setTravellers); the silent profile prefill waits for it and steps aside when there are any.
  const [travellers, setTravellersState] = useState<Traveller[] | null>(null);
  const [pickedTraveller, setPickedTraveller] = useState<string | null>(null); // traveller id, or "none" for "Someone else"
  useEffect(() => {
    let on = true;
    if (!uid) { setTravellers([]); setTravellersState([]); return; }
    setTravellersState(null);
    fetchTravellers().then((list) => { if (!on) return; setTravellers(list); setTravellersState(list); }).catch(() => { if (on) { setTravellers([]); setTravellersState([]); } });
    return () => { on = false; };
  }, [uid]);
  useEffect(() => () => setTravellers([]), []); // leaving the wizard: the next open loads them again
  // The picked traveller is recorded on the account's draft row (notes.travellerId), once the row exists.
  useEffect(() => {
    if (!pickedTraveller || !draftId || !session) return;
    patchNotes(draftId, { travellerId: pickedTraveller === "none" ? undefined : pickedTraveller }).catch(() => {});
  }, [pickedTraveller, draftId, session]);
  const [profileAsk, setProfileAsk] = useState<{ uid: string; key: string; changes: ProfileChange[] } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false); const [profileErr, setProfileErr] = useState<string | null>(null); const [profileSavedFor, setProfileSavedFor] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null); const prevStep = useRef<WizardStep | null>(null);
  useEffect(() => { listRequirements().then(setReqs).catch(() => {}); cancelDraftReminder(); }, []);

  const page = hydrated ? normalizePage(rawPage, f) : rawPage;
  const q: Question | null = page.startsWith("q:") ? Q_BY_ID[page.slice(2)] : null;
  const step: WizardStep = stepOfPage(page);
  useEffect(() => { setAllMode(false); }, [page]);
  // Section finished: success haptic, short chip in the header, VoiceOver announcement.
  useEffect(() => {
    const prev = prevStep.current; prevStep.current = step;
    if (!prev || STEP_ORDER.indexOf(step) <= STEP_ORDER.indexOf(prev) || editing) return;
    const done = t("{step} done", { step: t(STEP_TITLES[prev].title) });
    success(); setMilestone(done); AccessibilityInfo.announceForAccessibility(done);
    const tm = setTimeout(() => setMilestone(null), 2200); return () => clearTimeout(tm);
  }, [step]);
  // Signed in, new application: fill the empty answers from the user's own profile (lib/profile.ts) and offer the other
  // stable answers of their last application. A draft that already has personal answers, or the account's draft that
  // resume is about to load (lib/form.tsx), is never touched. Every field stays editable; nothing is written back here.
  useEffect(() => {
    if (!hydrated || !uid || submitted || travellers === null || prefillAsked.current === `${uid}:${activeKey}`) return;
    prefillAsked.current = `${uid}:${activeKey}`; // once per account and draft ("Start Fresh" / a new application gets its own)
    if (draftId || !isFreshDraft(fRef.current)) return;
    const key = activeKey; let on = true; // `on` turns false when the account or the draft changes meanwhile
    const hasSaved = travellers.length > 0; // saved travellers: the customer picks one explicitly instead of a silent prefill
    loadProfile(uid).then((r) => {
      if (!on || !r || !isFreshDraft(fRef.current) || (r.hasDraft && !hasAnswers(fRef.current))) return;
      const { form: nf, filled } = hasSaved ? { form: fRef.current, filled: [] as ReturnType<typeof applyProfile>["filled"] } : applyProfile(fRef.current, r.profile);
      if (filled.length) {
        fRef.current = nf; setForm(nf); markPrefilled(key, uid);
        setFromProfile({ key, values: Object.fromEntries(filled.map((k) => [k, nf[k]])) });
        AccessibilityInfo.announceForAccessibility(t("Some answers are filled in from your profile. Check them and edit if needed."));
      }
      const w = r.last; if (!w) return;
      const values: Partial<WizardForm> = {};
      for (const k of PREFILL_KEYS) { const v = (w as any)[k]; if (v !== undefined && v !== null && v !== "" && !(nf as any)[k]) (values as any)[k] = v; }
      // Subtitle = what "Use" fills (e.g. "Dubai · Single · Employed"), so it is not mistaken for the profile prefill.
      const vf = { ...emptyForm, ...values } as WizardForm;
      const what = ["cityOfResidence", "maritalStatus", "employmentStatus", "jobCompany", "companyName"].map((id) => (Q_BY_ID[id] ? displayValue(Q_BY_ID[id], vf, t, fmt) : "")).filter(Boolean);
      if (Object.keys(values).length) setPrefill({ values, name: [...new Set(what)].join(" · ") || [w.firstName, w.lastName].filter(Boolean).join(" ") });
    }).catch(() => {});
    return () => { on = false; };
  }, [hydrated, uid, activeKey, travellers]);
  // Review: if answers that came from the profile were changed, ask once whether to update the profile too.
  const onReview = rawPage === REVIEW;
  useEffect(() => {
    if (!onReview || !uid || submitted) return;
    const key = activeKey; let on = true;
    shouldAsk(key, uid).then((ask) => (ask ? loadProfile(uid) : null)).then((r) => {
      if (!on) return;
      const changes = r ? profileChanges(fRef.current, r.profile) : [];
      setProfileErr(null); setProfileAsk(changes.length ? { uid, key, changes } : null);
    }).catch(() => {});
    return () => { on = false; };
  }, [onReview, uid, activeKey]);
  const answerProfile = async (update: boolean) => {
    if (!profileAsk || profileBusy) return; tap(); setProfileErr(null);
    if (!update) { markAsked(profileAsk.key); setProfileAsk(null); return; }
    setProfileBusy(true);
    try { await saveProfile(profileAsk.uid, fRef.current, profileAsk.changes); success(); markAsked(profileAsk.key); setProfileAsk(null); setProfileSavedFor(profileAsk.key); }
    catch (e: any) { hError(); setProfileErr(t(e?.message ?? String(e))); }
    finally { setProfileBusy(false); }
  };
  const usePrefill = () => {
    if (!prefill) return; tap();
    const nf = cleanAfterPrefill({ ...fRef.current, ...Object.fromEntries(Object.entries(prefill.values).filter(([k]) => !(fRef.current as any)[k] || k === "phoneCountry")) } as WizardForm);
    setForm(nf); setPrefill(null); const u = firstUnanswered(nf); if (u) goTo(`q:${u.id}`, 1);
  };

  // Link values: from = nationality, to = destination (aliases nationality/destination/country), dates.
  const linkValues = (): Partial<WizardForm> => {
    const dest = matchCountry(p.to ?? p.destination, SCHENGEN) ?? (p.country ? fromSlug(p.country) : null);
    const natRaw = p.from ?? p.nationality;
    // Only nationals who need a Schengen visa; a visa-exempt or unknown nationality in the link is ignored.
    const nat = natRaw ? matchCountry(natRaw, SCHENGEN_VISA_REQUIRED) ?? null : null;
    const start = isoDate(p.travelStartDate), end = isoDate(p.travelEndDate);
    // Residence is UAE only (RESIDENCE_COUNTRIES); a city in the link is kept only if it is one of the emirates.
    const city = matchEmirate(p.city ?? p.cityOfResidence);
    return { countryOfResidence: DEFAULT_RESIDENCE, ...(city && { cityOfResidence: city }), ...(dest && { destination: dest }), ...(nat && { nationality: nat }), ...(start && { travelStartDate: start }), ...(end && { travelEndDate: end }) };
  };
  // On open: offer to restore an in-progress application (like the site); link values always win.
  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    let had = hasAnswers(fRef.current);
    const v = linkValues();
    // Opening a different country than the draft in progress: switch to that country's own saved draft, or a new one.
    // The other draft stays saved on this phone (Home lists every draft).
    if (had && v.destination && fRef.current.destination && v.destination !== fRef.current.destination) {
      const other = drafts.find((d) => d.form.destination === v.destination);
      const nf = other ? openDraft(other.key)! : startNew(); fRef.current = nf; had = !!other;
    }
    if (!p.resume && !submitted && savedAt && had && !v.destination) setResumeAsk(true);
    if (Object.keys(v).length) {
      const nf = { ...fRef.current, ...v }; setForm(nf);
      if (!had && !p.step) { const u = firstUnanswered(nf); if (u) setPage(`q:${u.id}`); }
    }
  }, [hydrated]);
  useEffect(() => {
    if (!hydrated || !started.current) return;
    const v = linkValues();
    if (Object.keys(v).length) setForm((x) => ({ ...x, ...v }));
  }, [p.to, p.destination, p.country, p.from, p.nationality, p.travelStartDate, p.travelEndDate]);
  // ?step=<slug> opens that step's first question (unknown -> personal; documents -> review; spouse only when it applies).
  useEffect(() => {
    if (!hydrated) return;
    if (lastSlug.current !== undefined && p.step === lastSlug.current) return;
    if (p.step === undefined) { if (lastSlug.current === undefined) lastSlug.current = stepOfPage(page); return; }
    const s = parseStep(p.step);
    lastSlug.current = s; setDir(-1); setPage(pageForStep(s, fRef.current)); setShowErr(false); setEditing(null);
  }, [hydrated, p.step]);
  // Keep ?step= in sync with the current step, like the site.
  useEffect(() => { if (hydrated && navReady && lastSlug.current !== undefined && step !== lastSlug.current) { lastSlug.current = step; router.setParams({ step }); } }, [step, navReady, hydrated]);
  // Signed-in users: always the account email (the email question is skipped), so the application shows up in their account.
  // Re-applied whenever the email changes underneath (a new or switched draft, a traveller prefill), not only on sign-in.
  useEffect(() => { const e = session?.user.email; if (e && f.email !== e) setForm((x) => (x.email === e ? x : { ...x, email: e })); }, [session, f.email]);
  // Every answer: save the account draft right away (local autosave runs on every change in lib/form.tsx).
  useEffect(() => { if (hydrated && session && !submitted) flushDraft(); }, [page]);
  // Funnel analytics (lib/analytics.ts): question ids, step names and the destination only; never answers.
  useEffect(() => { track("wizard_open"); return () => track("wizard_close"); }, []);
  useEffect(() => { if (hydrated && !submitted) track("wizard_page", { page: page.replace(/^q:/, ""), signedIn: !!session, ...(f.destination && { destination: f.destination }) }); }, [page, hydrated]);
  const seenStep = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || submitted) return;
    const s = page === REVIEW ? "review" : step; const prev = seenStep.current;
    if (s === prev) return;
    seenStep.current = s;
    if (prev && dir > 0) track("wizard_step_completed", { step: prev as any });
    track("wizard_step_viewed", { step: s as any });
  }, [page, hydrated]);
  useEffect(() => { if (submitted) { track("wizard_step_completed", { step: "review" }); track("wizard_submit", { guest: !!submitted.guestEmail }); } }, [!!submitted]);
  // New question: move VoiceOver focus to its title.
  useEffect(() => {
    setShowErr(false);
    if (Platform.OS === "web") return;
    const tm = setTimeout(() => { const h = titleRef.current ? findNodeHandle(titleRef.current) : null; if (h) AccessibilityInfo.setAccessibilityFocus(h); }, 350);
    return () => clearTimeout(tm);
  }, [page]);
  useEffect(() => () => { if (auto.current) clearTimeout(auto.current); }, []);

  const patch = (x: Partial<WizardForm>) => { setForm((y) => ({ ...y, ...x })); if (submitted) setSubmitted(null); };
  const goTo = (pg: string, d: number) => { if (auto.current) clearTimeout(auto.current); setDir(d); setPage(pg); setShowErr(false); };

  const advance = (nf0: WizardForm = fRef.current) => {
    if (!q) return;
    // Signed in: the email question is never shown, so the account email always counts as answered.
    const nf = session?.user.email && nf0.email !== session.user.email ? { ...nf0, email: session.user.email } : nf0;
    if (nf !== nf0) { fRef.current = nf; patch({ email: nf.email }); }
    const e = firstError(q, nf);
    if (e) { hError(); setShowErr(true); setErrTick((n) => n + 1); AccessibilityInfo.announceForAccessibility(t(e)); return; }
    tap();
    const list = activeQuestions(nf);
    if (editing) {
      const fresh = list.find((x) => !editing.has(x.id)); // became relevant because of this edit (e.g. married -> spouse questions)
      const bad = firstInvalid(nf);
      const target = bad && bad.id !== q.id ? bad : fresh;
      if (target) { const s = new Set(editing); s.add(target.id); setEditing(s); goTo(`q:${target.id}`, 1); return; }
      setEditing(null); goTo(REVIEW, 1); return;
    }
    const i = list.findIndex((x) => x.id === q.id);
    goTo(list[i + 1] ? `q:${list[i + 1].id}` : REVIEW, 1);
  };
  /** Tap on a choice / Yes-No / country: save, then auto-advance (unless the website shows a warning for that answer). */
  const pick = (v: string) => {
    if (!q) return;
    if (q.kind === "traveller") {
      // "Who is travelling?": fill the answers the saved traveller carries, then jump to the first question still open.
      const tr = v === "none" ? null : (travellers ?? []).find((x) => x.id === v) ?? null;
      let nf = fRef.current;
      if (tr) {
        nf = cleanAfterPrefill(applyTravellerToForm(nf, tr)); fRef.current = nf; patch(nf);
        setPickedTraveller(tr.id); markTravellerUsed(tr.id);
        setFromProfile({ key: activeKey, source: "traveller", values: Object.fromEntries(TRAVELLER_KEYS.filter((k) => tr[k] !== undefined && tr[k] !== "").map((k) => [k, nf[k]])) });
        AccessibilityInfo.announceForAccessibility(t("Details filled from your saved traveller. Check them and edit if needed."));
      } else setPickedTraveller("none");
      if (auto.current) clearTimeout(auto.current);
      auto.current = setTimeout(() => {
        if (editing) { setEditing(null); goTo(REVIEW, 1); return; }
        const u = firstUnanswered(nf); goTo(u ? `q:${u.id}` : REVIEW, 1);
      }, reduce ? 80 : AUTO_MS);
      return;
    }
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
    if (editing) { setEditing(null); goTo(REVIEW, -1); return; }
    const list = activeQuestions(f);
    if (page === REVIEW) { goTo(`q:${list[list.length - 1].id}`, -1); return; }
    const i = list.findIndex((x) => x.id === q?.id);
    if (i > 0) goTo(`q:${list[i - 1].id}`, -1); else close();
  };
  const close = () => {
    if (hasAnswers(fRef.current) && !submitted) scheduleDraftReminder(t("Continue your application"), t("Your answers are saved."));
    if (router.canGoBack()) router.back(); else router.replace("/");
  };
  const edit = (id: string) => { tap(); setEditing(new Set(activeQuestions(f).map((x) => x.id))); goTo(`q:${id}`, -1); };

  const spouse = showSpouse(f);
  // Price only from the server (check-payment quote for the saved row, or the create-payment response); never computed here.
  const quote = useQuote(submitted?.applicationId ?? (session ? draftId : null), page);
  const paying = usePaying();
  const invalid = firstInvalid(f);
  /** Submit once: button disabled + in-flight guard + the same draft row updated idempotently (lib/data.ts). */
  const submit = async () => {
    if (inFlight.current) return;
    if (invalid) { hError(); edit(invalid.id); return; }
    inFlight.current = true; setBusy(true); setErr(null);
    if (profileAsk) { markAsked(profileAsk.key); setProfileAsk(null); } // submitting without answering = keep the profile as is
    try {
      if (!session) { // guest checkout: pay first, sign in with the same email afterwards
        const g = await guestSubmit(f, guestId.current ?? (guestId.current = Crypto.randomUUID())); success(); cancelDraftReminder();
        guestId.current = null; // the next application gets its own id
        setSubmitted({ applicationId: g.id, reference: g.reference, destination: f.destination, spouse, guestEmail: g.email }); clearDraft(); return;
      }
      // Submit only what the server confirmed: an unsaved or changed-elsewhere draft is never submitted.
      const id = await flushDraft();
      if (!id) { hError(); if (!hasConflict()) setErr(offline ? t("You're offline. Connect to submit.") : t("Not saved yet. Check your connection and try again.")); return; }
      const a = await submitApplication(f, id, baseAt()); success(); cancelDraftReminder();
      setSubmitted({ applicationId: a.id, reference: a.reference, destination: a.destination_country, spouse }); clearDraft();
    } catch (e: any) { hError(); if (e instanceof DraftConflictError) checkRemote(); else setErr(e?.message ?? String(e)); }
    finally { inFlight.current = false; setBusy(false); }
  };

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const top = Platform.OS === "ios" ? S.sm : insets.top + S.xs;

  if (submitted) return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.md, padding: S.xl }}>
        <SuccessCheck />
        <Text variant="largeTitle" center accessibilityRole="header" style={{ marginTop: S.md }}>{t("Submitted")}</Text>
        <Text variant="title3" tone="secondary" tabular center>{submitted.reference}</Text>
      </View>
      <View style={{ paddingHorizontal: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), gap: S.xs }}>
        <InlineError text={err} />
        <Button title={paying ? t("Opening secure payment…") : quote ? t(PAY_AED, { amount: formatPayAmount(quote.amount) }) : t("Pay securely")} icon="creditcard.fill" loading={busy || paying} disabled={busy || paying} onPress={async () => {
          if (inFlight.current || paying) return; inFlight.current = true; setBusy(true); setErr(null);
          const id = submitted.applicationId;
          const result = (returned: string) => { router.replace({ pathname: "/payment/[id]", params: { id, returned } }); setTimeout(() => setSubmitted(null), 400); };
          try { track("payment_started"); const o = await startPayment(id); result(o.returned); }
          catch (e: any) { if (e?.busy) return; if (e?.alreadyPaid) { result("success"); return; } hError(); setErr(e?.message ?? String(e)); }
          finally { inFlight.current = false; setBusy(false); }
        }} />
        {submitted.guestEmail && <Note tone="blue" icon="person.crop.circle"><Text variant="subhead" testID="guest-note">{paidGuest ? t("Next: sign in with {e} to add your details and upload documents.", { e: submitted.guestEmail }) : t("After paying, sign in with {e} to continue.", { e: submitted.guestEmail })}</Text></Note>}
        {submitted.guestEmail ? <Button title={t("Sign in to continue")} variant={paidGuest ? "primary" : "secondary"} onPress={() => { router.replace({ pathname: "/auth", params: { mode: "signup", email: submitted.guestEmail } }); setTimeout(() => setSubmitted(null), 400); }} /> :
        null /* the trip plan unlocks after payment (lib/itinerary planAllowed) */}
        <Button title={t("Pay via WhatsApp instead")} variant="plain" color={c.label} onPress={() => whatsapp(`Hi EZvisa, I'd like to pay for application ${submitted.reference}.`)} />
        {!submitted.guestEmail && <Button title={t("Done")} variant="plain" color={c.label} onPress={() => { const id = submitted.applicationId; router.navigate(id ? `/applications/${id}` : "/applications", { withAnchor: true }); setTimeout(() => setSubmitted(null), 400); }} />}
      </View>
    </View>
  );

  const entering = slideIn(dir, isRTL, reduce);
  const header = (
    <View style={{ paddingTop: top, paddingHorizontal: S.lg, gap: S.md, paddingBottom: S.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}><CircleButton icon="chevron.left" label={editing ? t("Back to review") : t("Back")} onPress={back} /></View>
        <View style={{ flex: 1, alignItems: "center" }}>
          {milestone ? <Text variant="caption" weight="600" color={c.green} testID="milestone">{"✓ " + milestone}</Text> : <SyncIndicator hasAnswers={hasAnswers(f)} />}
        </View>
        <CircleButton icon="xmark" label={t("Close")} onPress={() => { tap(); close(); }} />
      </View>
      <Progress f={f} page={page} />
    </View>
  );

  // ---------------- Review ----------------
  if (page === REVIEW) {
    const qs = activeQuestions(f).filter((x) => x.kind !== "traveller"); // the picker owns no answer: its values show on the other rows
    const groups = (["destination", "personal"] as const).map((s) => ({ s, qs: qs.filter((x) => x.step === s) })).filter((g) => g.qs.length);
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {header}
        <ScrollView contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.lg }}>
          <Animated.View entering={entering} style={{ gap: S.lg }}>
            <View style={{ gap: S.xxs }}>
              <Text ref={titleRef} variant="largeTitle" accessibilityRole="header">{t("Review")}</Text>
              <Text variant="subhead" tone="secondary">{t("Tap an answer to change it.")}</Text>
            </View>
            {!!invalid && <View style={{ gap: S.sm }} testID="review-gaps">
              <Note tone="red" icon="exclamationmark.circle.fill"><Text variant="subhead">{t("{n} answers missing", { n: qs.filter((x) => firstError(x, f)).length })}</Text></Note>
              <Button title={t("Fix next")} variant="secondary" size="M" icon="arrow.right" onPress={() => edit(invalid.id)} />
            </View>}
            {offline && <Note tone="amber" icon="wifi.slash"><Text variant="subhead">{t("You're offline. Your answers are saved on this phone and will save to your account when you're back online.")}</Text></Note>}
            {!!profileAsk && profileAsk.key === activeKey && profileAsk.uid === uid && (
              <View testID="profile-ask" accessibilityRole="summary" style={[{ borderRadius: R.card, backgroundColor: c.card, padding: S.md, gap: S.sm }, curve]}>
                <Text variant="headline" accessibilityRole="header">{t("Update your profile too?")}</Text>
                <Text variant="subhead" tone="secondary">{t("You changed details that came from your profile. Save them for your next application?")}</Text>
                {profileAsk.changes.map((ch) => {
                  const show = (v: string) => (ch.key === "dateOfBirth" ? fmt(v) : ch.key === "nationality" ? t(v) : v);
                  return (
                    <View key={ch.key} style={{ gap: S.xxs }} accessible accessibilityLabel={t("{field}: {to}, profile has {from}", { field: t(ch.label), to: show(ch.to), from: show(ch.from) })}>
                      <Text variant="footnote" tone="secondary">{t(ch.label)}</Text>
                      <Text variant="body" weight="500">{show(ch.to)}</Text>
                      <Text variant="caption" tone="secondary">{t("Profile: {v}", { v: show(ch.from) })}</Text>
                    </View>
                  );
                })}
                <InlineError text={profileErr} />
                <View style={{ flexDirection: "row", gap: S.sm }}>
                  <View style={{ flex: 1 }}><Button title={t("Keep profile")} variant="secondary" size="M" disabled={profileBusy} onPress={() => answerProfile(false)} /></View>
                  <View style={{ flex: 1 }}><Button title={t("Update profile")} size="M" loading={profileBusy} onPress={() => answerProfile(true)} /></View>
                </View>
              </View>
            )}
            {profileSavedFor === activeKey && <Note tone="green" icon="checkmark.circle.fill"><Text variant="subhead">{t("Profile updated.")}</Text></Note>}
            {groups.map((g) => (
              <View key={g.s} style={{ gap: S.xs }}>
                <Text variant="footnote" tone="secondary" weight="600" accessibilityRole="header">{t(STEP_TITLES[g.s].title)}</Text>
                <View style={[{ borderRadius: R.card, backgroundColor: c.card, overflow: "hidden" }, curve]}>
                  {g.qs.map((x, i) => {
                    const e = firstError(x, f); const v = displayValue(x, f, t, fmt);
                    return (
                      <PressScale key={x.id} onPress={() => edit(x.id)} accessibilityRole="button" accessibilityLabel={`${t(x.label)}: ${v || (e ? t("Missing") : t("Not answered"))}`} accessibilityHint={t("Edit")} testID={`review-${x.id}`}
                        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.md, paddingVertical: S.sm, minHeight: 56, opacity: pressed ? 0.6 : 1,
                          borderTopWidth: i ? 1 : 0, borderTopColor: c.separator })}>
                        <View style={{ flex: 1, gap: S.xxs }}>
                          <Text variant="footnote" tone="secondary">{t(x.label)}</Text>
                          {e && !v ? <Text variant="subhead" tone="red" weight="500">{t("Missing")}</Text>
                            : <Text variant="body" weight="500">{v || t("Not answered")}</Text>}
                          {e && !!v && <Text variant="footnote" tone="red">{t(e)}</Text>}
                        </View>
                        <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}><Icon name="chevron.right" size={13} color={c.tertiaryLabel} weight="semibold" /></View>
                      </PressScale>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={[{ borderRadius: R.card, backgroundColor: c.card, padding: S.md, gap: S.xs }, curve]} testID="review-total">
              {quote && spouse && <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text variant="subhead" tone="secondary">{t("Including Accompanying Spouse")}</Text></View>}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text variant="headline">{t("Total Fee")}</Text>
                {quote ? <Text variant="title2" tone="tint" tabular>{money(quote)}</Text> : <Text variant="subhead" tone="secondary">{t("Shown at checkout")}</Text>}
              </View>
              <Text variant="footnote" tone="secondary">{t("Embassy fees are paid at the appointment.")}</Text>
            </View>
            {!session && <Note tone="blue" icon="person.crop.circle"><Text variant="subhead">{t("No account needed to pay. Afterwards, sign in with {e} to continue.", { e: f.email.trim() })}</Text></Note>}
            <InlineError text={err} />
          </Animated.View>
        </ScrollView>
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: Math.max(insets.bottom, S.md), backgroundColor: c.bg }}>
          <Button title={!SUPABASE_ENABLED ? t("Unavailable") : busy ? t("Submitting...") : t("Submit application")} icon={session ? "lock.fill" : undefined}
            loading={busy} disabled={!SUPABASE_ENABLED || busy || (offline && !!session)} onPress={submit} />
        </View>
        <DraftConflictSheet />
      </View>
    );
  }

  // ---------------- One question ----------------
  if (!q) return null;
  const pv = fromProfile && fromProfile.key === activeKey ? fromProfile.values : null;
  const prefilledHere = !!pv && q.keys.some((k) => k in pv && JSON.stringify(pv[k]) === JSON.stringify(f[k]));
  return (
    <QuestionView q={q} f={f} patch={patch} pick={pick} advance={() => advance()} showErr={showErr} errTick={errTick} settled={settled}
      header={header} entering={entering} pageKey={page} titleRef={titleRef} allMode={allMode} doneLabel={editing ? t("Save") : undefined}
      chips={prefilledHere ? <View testID="from-profile" style={{ flexDirection: "row", alignItems: "center", gap: S.xxs, paddingHorizontal: S.xs, paddingVertical: S.xxs, borderRadius: R.round, backgroundColor: c.fill }}>
        <Icon name="person.crop.circle" size={12} color={c.tint} /><Text variant="caption" tone="secondary" weight="600">{t(fromProfile?.source === "traveller" ? "From your saved travellers" : "From your profile")}</Text></View> : undefined}
      belowTitle={!!prefill && !allMode ? <PrefillOffer name={prefill.name} onUse={usePrefill} onDismiss={() => { tap(); setPrefill(null); }} /> : undefined}>
      <DraftConflictSheet />
      <Modal visible={resumeAsk} transparent animationType="fade" onRequestClose={() => setResumeAsk(false)}>
        <View style={{ flex: 1, backgroundColor: c.overlay, justifyContent: "center", padding: S.gutter }}>
          <View style={[{ backgroundColor: c.bg, borderRadius: R.card, padding: S.lg, gap: S.md }, curve]} accessibilityViewIsModal>
            <Text variant="title3" accessibilityRole="header">{t("Continue Application?")}</Text>
            <Text variant="subhead" tone="secondary">{t("Pick up where you left off, or start fresh.")}</Text>
            <View style={{ flexDirection: "row", gap: S.sm }}>
              <View style={{ flex: 1 }}><Button title={t("Start Fresh")} variant="secondary" onPress={() => { setResumeAsk(false); startNew(); const v = linkValues(); setForm((x) => ({ ...x, ...v })); setEditing(null); }} /></View>
              <View style={{ flex: 1 }}><Button title={t("Continue")} onPress={() => setResumeAsk(false)} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </QuestionView>
  );
}
