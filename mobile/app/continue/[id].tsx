// Continue application (after payment): the employment answers, moved out of the pre-payment wizard.
// Same fields and website rules (validateEmployment); saved into the same additional_notes keys the website reads.
import { useEffect, useRef, useState } from "react";
import { ScrollView, TextInput, View, Platform, I18nManager } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, Skeleton, InlineError } from "../../components/ui";
import { CircleButton } from "../../components/flow";
import { ChoiceList, YesNoTiles, DateAnswer } from "../../components/wizard/answers";
import { Note } from "../../components/wizard/fields";
import { useColors, S, R, T, curve } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { getApplication, patchNotes, type Application } from "../../lib/data";
import { EMPLOYMENT, SALARY, emptyForm, validateEmployment, iso, type WizardForm } from "../../lib/wizard";
import { success, error as hError, tap } from "../../lib/haptics";

type Emp = Pick<WizardForm, "employmentStatus" | "jobTitle" | "companyName" | "employmentStartDate" | "monthlySalary" | "hasNOC" | "averageMonthlyIncome">;
const KEYS: (keyof Emp)[] = ["employmentStatus", "jobTitle", "companyName", "employmentStartDate", "monthlySalary", "hasNOC", "averageMonthlyIncome"];

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
      setA(app); const w = (app.notes?.wizard ?? {}) as Partial<WizardForm>; const n = app.notes as any;
      setF(Object.fromEntries(KEYS.map((k) => [k, (w as any)[k] ?? n?.[k] ?? (emptyForm as any)[k]])) as Emp);
    }).catch((e) => setErr(e?.message ?? String(e)));
  }, [id]);
  const set = (p: Partial<Emp>) => setF((x) => (x ? { ...x, ...p } : x));
  const errs = f ? validateEmployment({ ...emptyForm, ...f } as WizardForm) : {};
  const valid = !!f && Object.keys(errs).length === 0;
  const show = (k: keyof Emp) => (tried || !!String(f?.[k] ?? "").trim()) && errs[k];
  const emp = f?.employmentStatus === "employed"; const biz = f?.employmentStatus === "business" || f?.employmentStatus === "freelancer";

  const save = async () => {
    if (!f || !a) return; setTried(true); if (!valid) { hError(); return; }
    setBusy(true); setErr(null);
    try {
      const clean: Emp = { ...f, jobTitle: emp ? f.jobTitle.trim() : "", companyName: emp || biz ? f.companyName.trim() : "", employmentStartDate: emp ? f.employmentStartDate : "",
        monthlySalary: emp ? f.monthlySalary : "", hasNOC: emp ? f.hasNOC : "", averageMonthlyIncome: biz ? f.averageMonthlyIncome.trim() : "" };
      const w = (a.notes?.wizard ?? {}) as Partial<WizardForm>;
      const r = await patchNotes(a.id, { wizard: { ...w, ...clean } as any, employmentStatus: clean.employmentStatus, jobTitle: clean.jobTitle, companyName: clean.companyName, monthlySalary: clean.monthlySalary } as any);
      if (!r.synced) throw new Error(t("Your application is already in review, so it can't be changed here. Please message us on WhatsApp."));
      success(); router.replace(`/applications/${a.id}`);
    } catch (e: any) { hError(); setErr(e?.message ?? String(e)); } finally { setBusy(false); }
  };

  const input = (k: "jobTitle" | "companyName" | "averageMonthlyIncome", label: string, ph: string, opts: { ref?: React.RefObject<TextInput | null>; next?: () => void; ct?: string; first?: boolean }) => (
    <View style={{ gap: S.xs }}>
      <Text variant="footnote" weight="600" tone="secondary">{t(label)}</Text>
      <TextInput ref={opts.ref as any} value={f![k]} onChangeText={(v) => set({ [k]: v } as Partial<Emp>)} placeholder={t(ph)} placeholderTextColor={c.secondaryLabel} accessibilityLabel={t(label)}
        autoCapitalize="words" autoCorrect={false} textContentType={opts.ct as any} returnKeyType={opts.next ? "next" : "done"} blurOnSubmit={!opts.next} onSubmitEditing={opts.next} testID={`continue-${k}`}
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
        <View style={{ padding: S.lg, gap: S.md }}>{err ? <InlineError text={err} /> : <><Skeleton w="60%" h={28} /><Skeleton h={60} r={R.tile} /><Skeleton h={60} r={R.tile} /></>}</View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.lg }}>
          <View style={{ gap: S.xs }}>
            <Text variant="title1" accessibilityRole="header" testID="continue-title">{t("Continue application")}</Text>
            <Text variant="subhead" tone="secondary">{t("Employment")}</Text>
          </View>
          <View style={{ gap: S.xs }}>
            <Text variant="footnote" weight="600" tone="secondary">{t("Employment Status")}</Text>
            <ChoiceList label={t("Employment Status")} options={EMPLOYMENT} value={f.employmentStatus} onPick={(v) => set({ employmentStatus: v as Emp["employmentStatus"], ...(v !== "employed" ? { hasNOC: "" } : {}) })} />
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
            <View style={{ gap: S.xs }}>
              <Text variant="footnote" weight="600" tone="secondary">{t("Do you have a No Objection Certificate?")} · {t("Optional")}</Text>
              <YesNoTiles label={t("Do you have a No Objection Certificate?")} value={f.hasNOC} onPick={(v) => set({ hasNOC: v as Emp["hasNOC"] })} />
            </View>
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
