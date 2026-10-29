// One question per screen: title, answer UI by kind, notes, inline error and the Continue bar. Shared by the wizard
// (app/apply, before payment) and Continue application (app/continue/[id], after payment), so both look and behave the same.
import React, { useRef, useState } from "react";
import { ScrollView, View, Platform, TextInput, I18nManager, type TextInputInstance } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, Shake, PressScale, QuestionHeader, Chip } from "../ui";
import { PhoneField } from "../CountryPicker";
import { Checkbox, Note } from "./fields";
import { DatesAnswer, DatesSummary } from "./dates";
import { ChoiceList, YesNoTiles, CountryList, DateAnswer, AdditionalCountries } from "./answers";
import { TravellerRows } from "./travellers";
import { useColors, S, R, T, curve } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { select, tap } from "../../lib/haptics";
import { OTHER_NATIONALITY, tripDays, iso as isoLocal, type WizardForm } from "../../lib/wizard";
import { type Question, questionErrors, firstError, isAnswered, getAccountEmail, getTravellers, askOf } from "../../lib/questions";

type Props = {
  q: Question; f: WizardForm; patch: (x: Partial<WizardForm>) => void;
  /** Choice / Yes-No / country tapped (the screen decides whether to auto-advance). */
  pick: (v: string) => void;
  /** Continue pressed (or Return on the last field). */
  advance: () => void;
  showErr: boolean; errTick: number; settled: boolean;
  header: React.ReactNode; entering: any; pageKey: string; titleRef: React.RefObject<any>;
  /** Nationality: "Other nationality" opened the full list. */
  allMode?: boolean;
  /** Chips above the title (e.g. "From your profile") and content under it (e.g. the reuse-last-answers offer). */
  chips?: React.ReactNode; belowTitle?: React.ReactNode;
  /** Button title when answered (default "Continue"; "Save" when editing from Review). */
  doneLabel?: string;
  /** This screen's error rule (default firstError; Continue application keeps a saved departure date valid). */
  errorOf?: (q: Question, f: WizardForm) => string | undefined;
  /** Tapping Globi (opens the "why I ask" sheet). Without it Globi is decorative. */
  onGlobiPress?: () => void;
  children?: React.ReactNode;
};

/** White field with a hairline; blue while typing, red on an error. */
const fieldStyle = (c: ReturnType<typeof useColors>, err: boolean, rtl: boolean, focused = false) =>
  [T.title3, { color: c.label, minHeight: 52, borderRadius: R.input, backgroundColor: c.surface, paddingHorizontal: S.md, paddingVertical: S.sm, borderWidth: err || focused ? 1.5 : 1, borderColor: err ? c.red : focused ? c.accent : c.border, textAlign: rtl ? "right" : "left" }, curve, Platform.OS === "web" && ({ outlineStyle: "none" } as any)] as any;

export function QuestionView({ q, f, patch, pick, advance, showErr, errTick, settled, header, entering, pageKey, titleRef, allMode, chips, belowTitle, doneLabel, errorOf = firstError, onGlobiPress, children }: Props) {
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, rtl } = useT(); const isRTL = rtl || I18nManager.isRTL;
  const inputRef = useRef<TextInputInstance>(null); const input2Ref = useRef<TextInputInstance>(null);
  // Lift the screen (and its Continue bar) above the iOS keyboard; S.md between button and keyboard.
  const kb = useAnimatedKeyboard(); const barBottom = Math.max(insets.bottom, S.md);
  const kbPad = useAnimatedStyle(() => ({ paddingBottom: Platform.OS === "ios" ? Math.max(0, kb.height.value - barBottom + S.md) : 0 }));
  const account = getAccountEmail();

  const [focus, setFocus] = useState<string | null>(null); // the field being typed in (blue border)
  const liveErr = errorOf(q, f);
  const hasInput = q.kind === "contact" ? !!f.phoneLocal.trim() && (!!account || !!f.email.trim()) : q.kind === "pair" ? q.keys.every((k) => !!String(f[k] ?? "").trim()) : isAnswered(q, f);
  const e = showErr || (settled && hasInput) ? liveErr : undefined;
  const note = q.note?.(f);
  const answered = isAnswered(q, f);
  const days = q.id === "travelEndDate" ? tripDays(f) : 0;

  // The question is the screen title, inside Globi's speech bubble (canvas). No description line under it: the
  // website's field label stays only as the accessible name of the answer controls.
  const other = !!(allMode && q.allNames);
  const question = other ? t(OTHER_NATIONALITY) : t(askOf(q, f), { country: f.destination ? t(f.destination) : "" });
  const chipRow = (!q.required || chips) ? (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: S.xs }}>
      {!q.required && <Chip label={t("Optional")} tone="neutral" />}
      {chips}
    </View>
  ) : undefined;
  const title = (
    <View style={{ gap: S.sm }}>
      <QuestionHeader question={question} pose={other ? "magnify" : q.pose} chip={chipRow} titleRef={titleRef} onGlobiPress={onGlobiPress} />
      {belowTitle}
    </View>
  );
  const errBox = e ? <Shake on={`${e}|${errTick}`}><View accessibilityRole="alert" testID="question-error"><Note tone="red" icon="exclamationmark.circle.fill"><Text variant="subhead" tone="red">{t(e)}</Text></Note></View></Shake> : null;
  // When the error says the same as the note, show it once, as the error.
  const noteBox = note && note.text !== e ? <Note tone={note.tone}>{t(note.text)}</Note> : null;
  const tp = q.text ?? {};
  const qe = questionErrors(q, f);

  const body = (() => {
    switch (q.kind) {
      case "choice": return <ChoiceList label={t(q.label)} options={q.options!} flag={q.flag} value={f[q.keys[0]] as string} onPick={pick} />;
      case "yesno": return <YesNoTiles label={t(q.label)} value={f[q.keys[0]] as string} onPick={pick} />;
      case "text": case "textarea": return (
        <TextInput ref={inputRef} value={String(f[q.keys[0]] ?? "")} onChangeText={(v) => patch({ [q.keys[0]]: tp.upper ? v.toUpperCase() : v } as Partial<WizardForm>)}
          placeholder={t(q.placeholder ?? "")} placeholderTextColor={c.secondaryLabel} accessibilityLabel={t(q.label)} autoFocus
          keyboardType={tp.keyboard ?? "default"} autoCapitalize={tp.caps ?? "sentences"} autoCorrect={q.kind === "textarea"} spellCheck={q.kind === "textarea"}
          textContentType={tp.contentType as any} autoComplete={tp.autoComplete as any} multiline={q.kind === "textarea"} textAlignVertical={q.kind === "textarea" ? "top" : "center"}
          returnKeyType={q.kind === "textarea" ? "default" : "next"} onSubmitEditing={q.kind === "textarea" ? undefined : advance} blurOnSubmit={false} testID="question-input"
          onFocus={() => setFocus(q.keys[0])} onBlur={() => setFocus(null)} style={[...fieldStyle(c, !!e, isRTL, focus === q.keys[0]), q.kind === "textarea" && [T.body, { minHeight: 150 }]]} />
      );
      case "pair": {
        const [a, b] = q.fields ?? [];
        const field = (x: NonNullable<Question["fields"]>[number], first: boolean) => (
          <View style={{ gap: S.xs }} key={String(x.key)}>
            <Text variant="footnote" weight="600" tone="secondary">{t(x.label)}</Text>
            <TextInput ref={first ? inputRef : input2Ref} value={String(f[x.key] ?? "")} onChangeText={(v) => patch({ [x.key]: v } as Partial<WizardForm>)} placeholder={t(x.placeholder)} placeholderTextColor={c.secondaryLabel}
              accessibilityLabel={t(x.label)} autoFocus={first} autoCapitalize="words" autoCorrect={false} textContentType={x.contentType as any} autoComplete={x.autoComplete as any}
              returnKeyType={first ? "next" : "done"} blurOnSubmit={false} onSubmitEditing={() => (first ? input2Ref.current?.focus() : advance())} testID={first ? "question-input" : "question-input-2"}
              onFocus={() => setFocus(x.key)} onBlur={() => setFocus(null)} style={fieldStyle(c, !!e && !!qe[x.key], isRTL, focus === x.key)} />
          </View>
        );
        return (
          <View style={{ gap: S.md }}>
            {a && field(a, true)}{b && field(b, false)}
            {q.id === "spouseName" && !!f.lastName.trim() && f.spouseLastName !== f.lastName && (
              <View style={{ alignSelf: "flex-start" }}><Button title={t("Use {v}", { v: f.lastName.trim() })} variant="secondary" size="M" icon="person.2.fill" onPress={() => { tap(); patch({ spouseLastName: f.lastName.trim() }); }} /></View>)}
          </View>
        );
      }
      case "contact": return (
        <View style={{ gap: S.md }}>
          {!account && <View style={{ gap: S.xs }}>
            <Text variant="footnote" weight="600" tone="secondary">{t("Email Address")}</Text>
            <TextInput ref={inputRef} value={f.email} onChangeText={(v) => patch({ email: v })} placeholder="your.email@example.com" placeholderTextColor={c.secondaryLabel}
              accessibilityLabel={t("Email Address")} autoFocus keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email"
              returnKeyType="next" blurOnSubmit={false} testID="question-input" onFocus={() => setFocus("email")} onBlur={() => setFocus(null)} style={fieldStyle(c, !!e && !!qe.email, isRTL, focus === "email")} />
          </View>}
          <View style={{ gap: S.xs }}>
            {!account && <Text variant="footnote" weight="600" tone="secondary">{t("Phone Number")}</Text>}
            <PhoneField country={f.phoneCountry} local={f.phoneLocal} error={!!e && !!qe.phone} onChange={(iso2, local, full) => patch({ phoneCountry: iso2, phoneLocal: local, phone: full })} />
          </View>
          <Checkbox label={t("Receive application updates via WhatsApp")} value={f.whatsappOptIn} onChange={(v) => patch({ whatsappOptIn: v })} icon="logo.whatsapp" />
        </View>
      );
      case "date": return (
        <View style={{ gap: S.md }}>
          {q.id === "travelEndDate" && !!f.travelStartDate && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }} accessibilityRole="radiogroup" accessibilityLabel={t("Trip length")} testID="date-quickpicks">
              {([[7, "1 week"], [14, "2 weeks"], [21, "3 weeks"], [30, "1 month"]] as const).map(([n, l]) => {
                const [y, m, d] = f.travelStartDate.split("-").map(Number); const v = isoLocal(new Date(y, m - 1, d + n - 1)); const on = f.travelEndDate === v;
                return <PressScale key={n} onPress={() => { select(); patch({ travelEndDate: v }); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t(l)}
                  style={{ flexGrow: 1, flexBasis: 0, minWidth: 72, minHeight: 44, paddingHorizontal: S.xs, borderRadius: R.round, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.accentFill : c.card, borderWidth: on ? 0 : 1, borderColor: c.border }}><Text variant="subhead" weight="600" numberOfLines={1} color={on ? c.onAccent : c.label}>{t(l)}</Text></PressScale>;
              })}
            </View>
          )}
          <DateAnswer label={t(q.label)} value={f[q.keys[0]] as string} onChange={(v) => patch({ [q.keys[0]]: v } as Partial<WizardForm>)} min={q.min?.(f)} max={q.max?.(f)} style={q.dateStyle ?? "calendar"} placeholder={q.placeholder} defaultDate={q.defaultDate?.(f)} />
        </View>
      );
      case "dates": return <DatesAnswer f={f} patch={patch} />;
      case "countries": return <AdditionalCountries f={f} onChange={(v) => patch({ additionalCountries: v })} />;
      // Saved travellers (lib/travellers.ts): tapping one fills the answers it carries; the screen decides where to go next.
      case "traveller": return <TravellerRows travellers={getTravellers()} onPick={pick} />;
      default: return null;
    }
  })();

  const auto = q.kind === "choice" || q.kind === "yesno" || q.kind === "country" || q.kind === "traveller";
  const showBtn = !auto || answered || !q.required;
  const btnTitle = !q.required && !answered ? t("Skip") : doneLabel ?? t("Continue");
  const bar = showBtn ? (
    <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: barBottom, backgroundColor: c.bg }}>
      {q.kind === "dates" && <DatesSummary f={f} patch={patch} />}
      <Button title={btnTitle} variant={!q.required && !answered ? "secondary" : "primary"} disabled={!!liveErr && (q.required || answered)} onPress={advance} />
    </View>
  ) : <View style={{ height: barBottom }} />;

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: c.bg }, kbPad]}>
      {header}
      <Animated.View key={pageKey} entering={entering} style={{ flex: 1 }}>
        {q.kind === "country" ? (
          <CountryList key={allMode && q.allNames ? "all" : "top"} names={allMode && q.allNames ? q.allNames.filter((n) => !q.names!.includes(n)) : q.names!} searchAll={allMode ? undefined : q.allNames} value={f[q.keys[0]] as string} onPick={pick} searchPlaceholder={q.searchPlaceholder ?? "Search country..."} header={<View style={{ gap: S.md, paddingTop: S.md }}>{title}{errBox}</View>} />
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.xl, gap: S.lg }}>
            {title}
            {body}
            {days > 0 && <Note tone={days > 90 ? "red" : "blue"}><Text variant="subhead" color={c.label}>{t("Total Stay Duration: {n} days.", { n: days })}</Text></Note>}
            {noteBox}
            {errBox}
          </ScrollView>
        )}
      </Animated.View>
      {bar}
      {children}
    </Animated.View>
  );
}
