// Application wizard: a 1:1 port of the website wizard (web repo app/apply/page.tsx + components/apply/*).
// One screen per web step (personal, spouse, employment, trip-details, payment) with the same fields, order,
// labels, placeholders, controls, header (title, step count, % complete, step menu) and Back / Continue bar.
// URLs match the site: /apply?step=<slug>&from=<nationality>&to=<destination>.
import { useEffect, useRef, useState } from "react";
import { ScrollView, View, KeyboardAvoidingView, Platform, AccessibilityInfo, findNodeHandle, Pressable, Modal } from "react-native";
import Animated, { SlideInRight, SlideInLeft, FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useRootNavigationState } from "expo-router";
import { Button, Text, Icon, SuccessCheck, InlineError } from "../../components/ui";
import { CircleButton } from "../../components/flow";
import { SupportButton } from "../../components/Support";
import { PersonalStep, SpouseStep, EmploymentStep, TripStep, type StepProps } from "../../components/wizard/steps";
import { PaymentStep } from "../../components/wizard/payment";
import { Note } from "../../components/wizard/fields";
import { useColors, S, R } from "../../lib/theme";
import { fromSlug } from "../../lib/countries";
import { useForm } from "../../lib/form";
import { useAuth } from "../../lib/auth";
import { PRICE_AED, SUPABASE_ENABLED } from "../../lib/config";
import { whatsapp, startPayment } from "../../lib/api";
import { submitApplication } from "../../lib/data";
import { error as hError, tap, success } from "../../lib/haptics";
import { WORLD } from "../../lib/world";
import { type WizardForm, type WizardStep, SCHENGEN, STEP_TITLES, visibleSteps, showSpouse, parseStep, validateStep, matchCountry, isValidEmail, isValidPhone, tripDays, hasAnswers } from "../../lib/wizard";

const WORLD_NAMES = WORLD.map((w) => w.name);
const isoDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? s : "");
const titleCase = (s: string) => decodeURIComponent(s).replace(/[-_+]+/g, " ").trim().replace(/\b\w/g, (m) => m.toUpperCase());
const STEPS: WizardStep[] = ["personal", "spouse", "employment", "trip-details", "payment"];
const NEXT_LABEL: Record<WizardStep, string> = { personal: "Continue to Employment", spouse: "Continue", employment: "Continue to Trip Details", "trip-details": "Continue to Review & Payment", payment: "Proceed to Payment" };

type Params = { step?: string; from?: string; to?: string; nationality?: string; destination?: string; travelStartDate?: string; travelEndDate?: string; country?: string; resume?: string };

/** The web's error banner text for each step. */
function bannerText(step: WizardStep, f: WizardForm) {
  if (step === "personal") {
    if (f.email && !isValidEmail(f.email.trim())) return "Please enter a valid email address. Check for typos in the domain.";
    if (f.phone && !isValidPhone(f.phone)) return "Please enter a valid phone number (8-15 digits, not all same or sequential).";
    return "Please fill in all required fields before continuing.";
  }
  if (step === "spouse") return "Please fill in all required spouse information before continuing.";
  if (step === "employment") return "Please fill in all required fields for your selected employment status.";
  if (f.travelStartDate && f.travelEndDate && tripDays(f) <= 0) return "Return date must be after departure date.";
  return "Please fill in all required travel details before continuing.";
}

export default function Apply() {
  const c = useColors(); const reduce = useReducedMotion(); const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<Params>();
  const { form: f, setForm, submitted, setSubmitted, page, setPage, hydrated, savedAt, clearDraft, draftId, cloudSavedAt, flushDraft } = useForm();
  const { session } = useAuth();
  const [dir, setDir] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false); // jumped back from Review & Payment: Continue returns there
  const [resumeAsk, setResumeAsk] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null); const titleRef = useRef<any>(null);
  const lastSlug = useRef<string | undefined>(undefined); const started = useRef(false);
  const fRef = useRef(f); fRef.current = f;
  const navReady = !!useRootNavigationState()?.key;

  // Link values: from = nationality, to = destination (aliases nationality/destination/country), dates.
  const linkValues = (): Partial<WizardForm> => {
    const dest = matchCountry(p.to ?? p.destination, SCHENGEN) ?? (p.country ? fromSlug(p.country) : null);
    const natRaw = p.from ?? p.nationality;
    const nat = natRaw ? matchCountry(natRaw, WORLD_NAMES) ?? (titleCase(natRaw) || null) : null;
    const start = isoDate(p.travelStartDate), end = isoDate(p.travelEndDate);
    return { ...(dest && { destination: dest }), ...(nat && { nationality: nat }), ...(start && { travelStartDate: start }), ...(end && { travelEndDate: end }) };
  };
  // On open: like the site, offer to restore an in-progress application; link values always win.
  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    if (!p.resume && !submitted && savedAt && hasAnswers(fRef.current)) setResumeAsk(true);
    const v = linkValues();
    if (Object.keys(v).length) setForm((x) => ({ ...x, ...v }));
  }, [hydrated]);
  useEffect(() => {
    if (!hydrated || !started.current) return;
    const v = linkValues();
    if (Object.keys(v).length) setForm((x) => ({ ...x, ...v }));
  }, [p.to, p.destination, p.country, p.from, p.nationality, p.travelStartDate, p.travelEndDate]);
  // Which step a link opens (same slugs as the site; unknown -> personal; documents -> payment). No link: resume the saved step.
  useEffect(() => {
    if (!hydrated) return;
    if (lastSlug.current !== undefined && p.step === lastSlug.current) return;
    if (p.step === undefined && !p.country) { if (lastSlug.current === undefined) lastSlug.current = page; return; }
    let s = parseStep(p.step);
    if (s === "spouse" && !showSpouse(fRef.current)) s = "employment"; // the site skips spouse unless married & the spouse travels
    lastSlug.current = s; setDir(-1); setPage(s); setShowErrors(false); setEditing(false);
  }, [hydrated, p.step, p.country]);
  const steps = visibleSteps(f);
  const step: WizardStep = steps.includes(page as WizardStep) ? (page as WizardStep) : page === "spouse" ? "employment" : "personal";
  const idx = steps.indexOf(step);
  // Keep ?step= in sync, like the site.
  useEffect(() => { if (hydrated && navReady && lastSlug.current !== undefined && step !== lastSlug.current) { lastSlug.current = step; router.setParams({ step }); } }, [step, navReady, hydrated]);
  // Signed-in users: prefill email and names (as the site does).
  useEffect(() => {
    const u = session?.user; if (!u) return;
    const full = (u.user_metadata?.full_name as string | undefined) ?? "";
    setForm((x) => ({ ...x, email: x.email || u.email || "", firstName: x.firstName || (u.user_metadata?.first_name as string) || full.split(" ")[0] || "", lastName: x.lastName || (u.user_metadata?.last_name as string) || full.split(" ").slice(1).join(" ") || "" }));
  }, [session]);
  // New step: scroll to top and move VoiceOver/TalkBack focus to the step title.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === "web") return;
    const t = setTimeout(() => { const h = titleRef.current ? findNodeHandle(titleRef.current) : null; if (h) AccessibilityInfo.setAccessibilityFocus(h); }, 400);
    return () => clearTimeout(t);
  }, [step]);

  const patch = (x: Partial<WizardForm>) => { setForm((y) => ({ ...y, ...x })); if (submitted) setSubmitted(null); };
  const set: StepProps["set"] = (k) => (v) => patch({ [k]: v } as Partial<WizardForm>);
  const errors = validateStep(step, f);
  const incomplete = steps.filter((s) => s !== "payment" && Object.keys(validateStep(s, f)).length > 0);
  const go = (s: WizardStep, d: number) => { setDir(d); setPage(s); setShowErrors(false); setMenu(false); };
  const next = () => {
    if (Object.keys(errors).length) {
      hError(); setShowErrors(true); scroll.current?.scrollTo({ y: 0, animated: true });
      AccessibilityInfo.announceForAccessibility(bannerText(step, f));
      return;
    }
    tap();
    if (editing) { const first = incomplete.find((s) => s !== step); if (first) { go(first, 1); return; } setEditing(false); go("payment", 1); return; }
    go(steps[Math.min(idx + 1, steps.length - 1)], 1);
  };
  const back = () => { if (editing) { setEditing(false); go("payment", 1); return; } if (idx > 0) go(steps[idx - 1], -1); };
  const close = () => { tap(); if (router.canGoBack()) router.back(); else router.replace("/"); };
  const reachable = (i: number) => i < idx || (i > idx && steps.slice(0, i).every((s) => s === "payment" || !Object.keys(validateStep(s, f)).length));
  const pickStep = (s: WizardStep) => { const i = steps.indexOf(s); if (i === idx || !reachable(i)) return; if (step === "payment" && i < idx) setEditing(true); go(s, i < idx ? -1 : 1); };
  const fix = (s: WizardStep) => { setEditing(true); go(s, -1); setTimeout(() => setShowErrors(true), 50); };

  const spouse = showSpouse(f);
  const amount = submitted?.amount ?? PRICE_AED * (spouse ? 2 : 1);
  const pay = async () => {
    if (incomplete.length) { hError(); fix(incomplete[0]); return; }
    if (!session) { router.push({ pathname: "/auth", params: { mode: "signin" } }); return; }
    setBusy(true); setErr(null);
    try {
      const id = (await flushDraft()) ?? draftId;
      const a = await submitApplication(f, id); success();
      setSubmitted({ applicationId: a.id, reference: a.reference, amount, destination: a.destination_country, spouse }); clearDraft();
    }
    catch (e: any) { hError(); setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const top = Platform.OS === "ios" ? S.sm : insets.top + S.xs;
  const bottomBar = (children: React.ReactNode) => (
    <View style={{ flexDirection: "row", gap: S.sm, paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: Math.max(insets.bottom, S.md), backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.separator }}>{children}</View>
  );

  if (submitted) return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.md, padding: S.xl }}>
        <SuccessCheck />
        <Text variant="largeTitle" center accessibilityRole="header" style={{ marginTop: S.md }}>Submitted</Text>
        <Text variant="title3" tone="secondary" tabular center>{submitted.reference}</Text>
      </View>
      <View style={{ paddingHorizontal: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), gap: S.xs }}>
        <InlineError text={err} />
        <Button title={`Pay ${amount} AED securely`} icon="creditcard.fill" loading={busy} onPress={async () => {
          setBusy(true); setErr(null);
          try { await startPayment({ id: submitted.applicationId, destination_country: submitted.destination ?? null, total_amount: amount }, !!submitted.spouse); router.navigate(`/applications/${submitted.applicationId}`); setTimeout(() => setSubmitted(null), 400); }
          catch (e: any) { hError(); setErr(e?.message ?? String(e)); }
          finally { setBusy(false); }
        }} />
        <Button title="Pay via WhatsApp instead" variant="plain" color={c.label} onPress={() => whatsapp(`Hi EZvisa, I'd like to pay for application ${submitted.reference} (${amount} AED).`)} />
        <Button title="Done" variant="plain" color={c.label} onPress={() => { const id = submitted.applicationId; router.navigate(id ? `/applications/${id}` : "/applications"); setTimeout(() => setSubmitted(null), 400); }} />
      </View>
    </View>
  );

  const total = steps.length; const visual = idx + 1;
  const pct = Math.round(((visual - 1) / (total - 1)) * 100);
  const saved = !!savedAt && hasAnswers(f);
  const props: StepProps = { f, set, patch, errors, show: showErrors };
  const entering = reduce ? undefined : (dir > 0 ? SlideInRight : SlideInLeft).duration(240);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: top, paddingHorizontal: S.md, flexDirection: "row", justifyContent: "flex-end", gap: S.xs }}>
        <SupportButton context={`application, ${STEP_TITLES[step].title}`} />
        <CircleButton icon="xmark" label="Close" onPress={close} />
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ paddingHorizontal: S.md, paddingBottom: S.xl }}>
        {/* Title + progress (web: "Visa Application", "Step X of N ✓ Saved", "% complete") */}
        <View style={{ alignItems: "center", marginBottom: S.lg }}>
          <Text variant="title1" weight="600" center accessibilityRole="header">Visa Application</Text>
          <Text variant="subhead" tone="secondary" center style={{ marginTop: 4 }}>Complete your application in {total} simple steps</Text>
        </View>
        <View style={{ marginBottom: S.md }} accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${visual} of ${total}, ${pct}% complete${saved ? ", saved on this phone" : ""}`}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.xs }}>
            <View style={{ flexDirection: "row", gap: S.xs, alignItems: "center" }}>
              <Text variant="caption" tone="secondary">Step {visual} of {total}</Text>
              {saved && <Text variant="caption" weight="600" color={c.green} testID="saved-indicator">{cloudSavedAt && session ? "✓ Saved to your account" : "✓ Saved on this phone"}</Text>}
            </View>
            <Text variant="caption" tone="secondary">{pct}% complete</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.fill, overflow: "hidden" }}>
            <View style={{ height: 6, borderRadius: 3, width: `${pct}%`, backgroundColor: c.tintFill }} />
          </View>
        </View>
        {/* Step menu (web mobile dropdown) */}
        <View style={{ marginBottom: S.md }}>
          <Pressable onPress={() => { tap(); setMenu(!menu); }} accessibilityRole="button" accessibilityState={{ expanded: menu }} accessibilityLabel={`Step ${visual}: ${STEP_TITLES[step].title}, ${STEP_TITLES[step].description}`} accessibilityHint="Shows all steps"
            style={{ flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, borderRadius: R.input, borderWidth: 1, borderColor: c.separator, backgroundColor: c.card }}>
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: c.tintFill, alignItems: "center", justifyContent: "center" }}><Text variant="headline" color={c.onTint}>{visual}</Text></View>
            <View style={{ flex: 1 }}>
              <Text ref={titleRef} variant="subhead" weight="700">{STEP_TITLES[step].title}</Text>
              <Text variant="caption" tone="secondary">{STEP_TITLES[step].description}</Text>
            </View>
            <Icon name={menu ? "chevron.up" : "chevron.down"} size={15} color={c.secondaryLabel} weight="semibold" />
          </Pressable>
          {menu && (
            <Animated.View entering={reduce ? undefined : FadeIn.duration(150)} exiting={reduce ? undefined : FadeOut.duration(120)} style={{ marginTop: S.xs, padding: 4, borderRadius: R.input, borderWidth: 1, borderColor: c.separator, backgroundColor: c.card }}>
              {steps.map((s, i) => {
                const cur = i === idx; const done = i < idx; const ok = reachable(i);
                return (
                  <Pressable key={s} onPress={() => pickStep(s)} disabled={cur || !ok} accessibilityRole="button" accessibilityState={{ selected: cur, disabled: !cur && !ok }} accessibilityLabel={`Step ${i + 1}: ${STEP_TITLES[s].title}${done ? ", completed" : ""}`}
                    style={{ flexDirection: "row", gap: S.md, alignItems: "center", padding: S.sm, minHeight: 52, borderRadius: 10, backgroundColor: cur ? c.bg : "transparent", opacity: cur || ok ? 1 : 0.5 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: cur ? c.tintFill : done ? c.green + "1A" : c.fill, borderWidth: cur ? 0 : 1, borderColor: done ? c.green + "40" : c.separator }}>
                      {done ? <Icon name="checkmark.circle.fill" size={16} color={c.green} /> : <Text variant="footnote" weight="700" color={cur ? c.onTint : c.secondaryLabel}>{i + 1}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="subhead" weight="600">{STEP_TITLES[s].title}</Text>
                      <Text variant="caption" tone="secondary">{STEP_TITLES[s].description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Animated.View>
          )}
        </View>
        {/* Step content card */}
        <Animated.View key={step} entering={entering} style={{ borderRadius: R.input, borderWidth: 1, borderColor: c.separator, backgroundColor: c.bg, padding: S.md, gap: S.lg }}>
          {showErrors && Object.keys(errors).length > 0 && (
            <View accessibilityRole="alert" testID="step-error"><Note tone="red"><Text variant="subhead">{bannerText(step, f)}</Text></Note></View>
          )}
          {step === "personal" && <PersonalStep {...props} />}
          {step === "spouse" && <SpouseStep {...props} />}
          {step === "employment" && <EmploymentStep {...props} />}
          {step === "trip-details" && <TripStep {...props} />}
          {step === "payment" && <PaymentStep f={f} amount={amount} incomplete={incomplete} onFix={fix} signedIn={!!session} error={err}
            onSignIn={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />}
        </Animated.View>
      </ScrollView>
      {step === "personal" && !editing
        ? bottomBar(<View style={{ flex: 1 }}><Button title={NEXT_LABEL.personal} onPress={next} /></View>)
        : bottomBar(<>
            <View style={{ flex: 1 }}><Button title={editing ? "Cancel" : "Back"} variant="secondary" onPress={back} disabled={busy} /></View>
            <View style={{ flex: 2 }}>
              {step === "payment"
                ? <Button title={!SUPABASE_ENABLED ? "Unavailable" : session ? (busy ? "Submitting..." : "Proceed to Payment") : "Sign in to Continue"} icon={session ? "lock.fill" : undefined} loading={busy} disabled={!SUPABASE_ENABLED} onPress={pay} />
                : <Button title={editing ? "Save & Review" : NEXT_LABEL[step]} onPress={next} />}
            </View>
          </>)}
      <Modal visible={resumeAsk} transparent animationType="fade" onRequestClose={() => setResumeAsk(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: S.lg }}>
          <View style={{ backgroundColor: c.bg, borderRadius: R.card, padding: S.lg, gap: S.md }} accessibilityViewIsModal>
            <Text variant="title3" weight="600" accessibilityRole="header">Continue Application?</Text>
            <Text variant="subhead" tone="secondary">We found a previous in-progress visa application. Would you like to restore your details or start fresh?</Text>
            <View style={{ flexDirection: "row", gap: S.sm }}>
              <View style={{ flex: 1 }}><Button title="Start Fresh" variant="secondary" onPress={() => { setResumeAsk(false); clearDraft(); const v = linkValues(); setForm((x) => ({ ...x, ...v })); setPage("personal"); setEditing(false); }} /></View>
              <View style={{ flex: 1 }}><Button title="Restore Details" onPress={() => setResumeAsk(false)} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
