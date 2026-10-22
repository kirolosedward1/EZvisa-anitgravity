// Continue application (after payment): the passport number and the employment answers, moved out of the pre-payment
// wizard. Same fields and website rules (validatePassportNumber, validateEmployment); saved into the same additional_notes
// keys the website reads, and the passport number also into the passport_number column.
import { useEffect, useRef, useState } from "react";
import { ScrollView, TextInput, View, Platform, I18nManager } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, Skeleton, InlineError, EmptyState } from "../../components/ui";
import { CircleButton } from "../../components/flow";
import { ChoiceList, YesNoTiles, DateAnswer } from "../../components/wizard/answers";
import { Note } from "../../components/wizard/fields";
import { useColors, S, R, T, curve } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { getApplication, saveContinueAnswers, continueForm, type Application } from "../../lib/data";
import { EMPLOYMENT, SALARY, emptyForm, validateEmployment, validatePassportNumber, iso, type WizardForm } from "../../lib/wizard";
import { employmentQuestions, answer, Q_BY_ID } from "../../lib/questions";
import { success, error as hError, tap } from "../../lib/haptics";

type Emp = Pick<WizardForm, "passportNumber" | "employmentStatus" | "jobTitle" | "companyName" | "employmentStartDate" | "monthlySalary" | "hasNOC" | "averageMonthlyIncome">;
const KEYS: (keyof Emp)[] = ["passportNumber", "employmentStatus", "jobTitle", "companyName", "employmentStartDate", "monthlySalary", "hasNOC", "averageMonthlyIncome"];

export default function ContinueApplication() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, rtl } = useT(); const isRTL = rtl || I18nManager.isRTL;
  const [a, setA] = useState<Application | null>(null); const [f, setF] = useState<Emp | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [tried, setTried] = useState(false);
  const companyRef = useRef<TextInput>(null);
  const kb = useAnimatedKeyboard(); const barBottom = Math.max(insets.bottom, S.md);
  const kbPad = useAnimatedStyle(() => ({ paddingBottom: Platform.OS === "ios" ? Math.max(0, kb.height.value - barBottom + S.md) : 0 }));
  useEffect(() => {
    getApplication(id!).then((app) => {
      setA(app); const w = continueForm(app); const n = app.notes as any;
      setF(Object.fromEntries(KEYS.map((k) => [k, (w as any)[k] || n?.[k] || (emptyForm as any)[k]])) as Emp);
    }).catch((e) => setErr(e?.message ?? String(e)));
  }, [id]);
  const set = (p: Partial<Emp>) => setF((x) => (x ? { ...x, ...p } : x));
  const hasValidPassport = ((a?.notes?.wizard ?? {}) as Partial<WizardForm>).hasValidPassport ?? "";
  const errs = f ? { ...validatePassportNumber({ hasValidPassport, passportNumber: f.passportNumber }), ...validateEmployment({ ...emptyForm, ...f } as WizardForm) } : {};
  const valid = !!f && Object.keys(errs).length === 0;
  const show = (k: keyof Emp) => (tried || !!String(f?.[k] ?? "").trim()) && errs[k];
  const emp = f?.employmentStatus === "employed"; const biz = f?.employmentStatus === "business" || f?.employmentStatus === "freelancer";
  // Which employment questions show comes from the wizard config (lib/questions.ts): NOC only when employed.
  const shown = new Set(f ? employmentQuestions({ ...emptyForm, ...f } as WizardForm).map((q) => q.id) : []);

  const save = async () => {
    if (!f || !a) return; setTried(true); if (!valid) { hError(); return; }
    setBusy(true); setErr(null);
    try {
      const clean: Emp = { ...f, passportNumber: f.passportNumber.trim().toUpperCase(), jobTitle: emp ? f.jobTitle.trim() : "", companyName: emp || biz ? f.companyName.trim() : "", employmentStartDate: emp ? f.employmentStartDate : "",
        monthlySalary: emp ? f.monthlySalary : "", hasNOC: shown.has("hasNOC") ? f.hasNOC : "", averageMonthlyIncome: biz ? f.averageMonthlyIncome.trim() : "" };
      const w = (a.notes?.wizard ?? {}) as Partial<WizardForm>;
      const r = await saveContinueAnswers(a.id, { wizard: { ...w, ...clean } as any, employmentStatus: clean.employmentStatus, jobTitle: clean.jobTitle, companyName: clean.companyName, monthlySalary: clean.monthlySalary } as any, clean.passportNumber);
      if (!r.synced) throw new Error(t("Your application is already in review, so it can't be changed here. Please message us on WhatsApp."));
      success(); router.replace(`/applications/${a.id}`);
    } catch (e: any) { hError(); setErr(e?.message ?? String(e)); } finally { setBusy(false); }
  };

  const input = (k: "passportNumber" | "jobTitle" | "companyName" | "averageMonthlyIncome", label: string, ph: string, opts: { ref?: React.RefObject<TextInput | null>; next?: () => void; ct?: string; first?: boolean; caps?: "words" | "characters" }) => (
    <View style={{ gap: S.xs }}>
      <Text variant="footnote" weight="600" tone="secondary">{t(label)}</Text>
      <TextInput ref={opts.ref as any} value={f![k]} onChangeText={(v) => set({ [k]: opts.caps === "characters" ? v.toUpperCase() : v } as Partial<Emp>)} placeholder={t(ph)} placeholderTextColor={c.secondaryLabel} accessibilityLabel={t(label)}
        autoCapitalize={opts.caps ?? "words"} autoCorrect={false} textContentType={opts.ct as any} returnKeyType={opts.next ? "next" : "done"} blurOnSubmit={!opts.next} onSubmitEditing={opts.next} testID={`continue-${k}`}
        style={[T.title3, { color: c.label, minHeight: 60, borderRadius: R.tile, backgroundColor: c.card, paddingHorizontal: S.md, paddingVertical: S.sm, borderWidth: show(k) ? 1.5 : 0, borderColor: c.red, textAlign: isRTL ? "right" : "left" }, curve, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]} />
      {!!show(k) && <Text variant="footnote" tone="red">{t(errs[k]!)}</Text>}
    </View>
  );

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: c.bg }, kbPad]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, paddingTop: Platform.OS === "ios" ? S.sm : insets.top + S.xs, paddingBottom: S.sm }}>
        <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}><CircleButton icon="chevron.left" label={t("Back")} onPress={() => { tap(); if (router.canGoBack()) router.back(); else router.replace(`/applications/${id}`); }} /></View>
        <View style={{ flex: 1 }} />
      </View>
      {!f ? (
        err ? <View style={{ flex: 1, justifyContent: "center", paddingBottom: S.x6 }}><EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={err} /></View> : <View style={{ padding: S.lg, gap: S.md }}>{ <><Skeleton w="60%" h={28} /><Skeleton h={60} r={R.tile} /><Skeleton h={60} r={R.tile} /></>}</View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.lg }}>
          <View style={{ gap: S.xs }}>
            <Text variant="title1" accessibilityRole="header" testID="continue-title">{t("Continue application")}</Text>
            <Text variant="subhead" tone="secondary">{t("Passport and employment")}</Text>
          </View>
          {hasValidPassport !== "no" && input("passportNumber", "Passport Number", "e.g. A1234567", { caps: "characters" })}
          <View style={{ gap: S.xs }}>
            <Text variant="footnote" weight="600" tone="secondary">{t("Employment Status")}</Text>
            <ChoiceList label={t("Employment Status")} options={EMPLOYMENT} value={f.employmentStatus} onPick={(v) => set(answer(Q_BY_ID.employmentStatus, v, { ...emptyForm, ...f } as WizardForm) as Partial<Emp>)} />
            {tried && !!errs.employmentStatus && <Text variant="footnote" tone="red">{t(errs.employmentStatus)}</Text>}
          </View>
          {emp && <>
            {/* Job title + company together */}
            {input("jobTitle", "Job Title", "Enter job title", { next: () => companyRef.current?.focus(), ct: "jobTitle" })}
            {input("companyName", "Company Name", "Enter company name", { ref: companyRef, ct: "organizationName" })}
            <View style={{ gap: S.xs }}>
              <Text variant="footnote" weight="600" tone="secondary">{t("Employment Start Date")}</Text>
              <DateAnswer label={t("Employment Start Date")} value={f.employmentStartDate} onChange={(v) => set({ employmentStartDate: v })} max={iso(new Date())} style="wheel" placeholder="Select start date" />
            </View>
            <View style={{ gap: S.xs }}>
              <Text variant="footnote" weight="600" tone="secondary">{t("Monthly Salary Range")}</Text>
              <ChoiceList label={t("Monthly Salary Range")} options={SALARY} value={f.monthlySalary} onPick={(v) => set({ monthlySalary: v })} />
              {tried && !!errs.monthlySalary && <Text variant="footnote" tone="red">{t(errs.monthlySalary)}</Text>}
            </View>
            {shown.has("hasNOC") && <View style={{ gap: S.xs }} testID="continue-noc">
              <Text variant="footnote" weight="600" tone="secondary">{t("Do you have a No Objection Certificate?")} · {t("Optional")}</Text>
              <YesNoTiles label={t("Do you have a No Objection Certificate?")} value={f.hasNOC} onPick={(v) => set({ hasNOC: v as Emp["hasNOC"] })} />
            </View>}
          </>}
          {biz && <>
            {input("companyName", "Company Name", "Enter company name", { next: () => companyRef.current?.focus(), ct: "organizationName" })}
            {input("averageMonthlyIncome", "Average Monthly Income", "e.g., 15,000 AED", { ref: companyRef })}
          </>}
          <InlineError text={err} />
        </ScrollView>
      )}
      {!!f && (
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: barBottom, backgroundColor: c.bg }}>
          <Button title={busy ? t("Saving…") : t("Save and continue")} loading={busy} disabled={!valid || busy} onPress={save} />
        </View>
      )}
    </Animated.View>
  );
}
