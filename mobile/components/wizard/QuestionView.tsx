// One question per screen: title, answer UI by kind, notes, inline error and the Continue bar. Shared by the wizard
// (app/apply, before payment) and Continue application (app/continue/[id], after payment), so both look and behave the same.
import React, { useRef, useState } from "react";
import { ScrollView, View, Platform, TextInput, I18nManager, type TextInputInstance } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, Shake, PressScale, QuestionHeader, Chip, SheetScaffold, Card, RowGroup, Row, PrimaryButton, SecondaryButton } from "../ui";
import { OptionAnswers, YesNoAnswer, NationalityGrid, CountryAnswer, TravellerTiles } from "./choices";
import { track } from "../../lib/analytics";
import { whatsapp } from "../../lib/api";
import { PhoneField } from "../CountryPicker";
import { Checkbox, Note } from "./fields";
import { DatesAnswer } from "./dates";
import { DateAnswer, AdditionalCountries } from "./answers";
import { useColors, S, R, T, curve } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { select, tap } from "../../lib/haptics";
import { OTHER_NATIONALITY, tripDays, iso as isoLocal, type WizardForm } from "../../lib/wizard";
import { type Question, questionErrors, firstError, isAnswered, getAccountEmail, getTravellers, askOf, partsOf } from "../../lib/questions";

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
  const [explain, setExplain] = useState(false);
  const openExplain = onGlobiPress ?? (() => { track("globi_tap", { question: q.id }); setExplain(true); });
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, rtl } = useT(); const isRTL = rtl || I18nManager.isRTL;
  const inputRef = useRef<TextInputInstance>(null); const input2Ref = useRef<TextInputInstance>(null);
  // Lift the screen (and its Continue bar) above the iOS keyboard; S.md between button and keyboard.
  const kb = useAnimatedKeyboard(); const barBottom = Math.max(insets.bottom, S.md);
  const kbPad = useAnimatedStyle(() => ({ paddingBottom: Platform.OS === "ios" ? Math.max(0, kb.height.value - barBottom + S.md) : 0 }));
  const account = getAccountEmail();

  const [focus, setFocus] = useState<string | null>(null); // the field being typed in (blue border)
  const liveErr = errorOf(q, f);
  const hasInput = q.kind === "contact" ? !!f.phoneLocal.trim() : q.kind === "dates" ? !!f.travelStartDate : q.kind === "pair" ? q.keys.every((k) => !!String(f[k] ?? "").trim()) : isAnswered(q, f);
  const group = q.kind === "group";
  const e = showErr || (settled && hasInput && !group) ? liveErr : undefined;
  const note = q.note?.(f);
  const answered = isAnswered(q, f);
  const days = q.id === "travelEndDate" ? tripDays(f) : 0;

  // The question is the screen title, inside Globi's speech bubble (canvas). No description line under it: the
  // website's field label stays only as the accessible name of the answer controls.
  const other = !!(allMode && q.allNames);
  const until = f.travelEndDate ? (([y, m, d]) => new Date(y, m - 1 + 3, d))(f.travelEndDate.split("-").map(Number)).toLocaleDateString(rtl ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "long" }) : "";
  const question = other ? t(OTHER_NATIONALITY) : t(askOf(q, f), { country: f.destination ? t(f.destination) : "", until });
  const chipRow = (!q.required || chips) ? (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: S.xs }}>
      {!q.required && <Chip label={t("Optional")} tone="neutral" />}
      {chips}
    </View>
  ) : undefined;
  const title = (
    <View style={{ gap: S.sm }}>
      <QuestionHeader question={question} pose={other ? "magnify" : q.pose} chip={chipRow} titleRef={titleRef} onGlobiPress={openExplain} />
      {belowTitle}
    </View>
  );
  const errBox = e ? <Shake on={`${e}|${errTick}`}><View accessibilityRole="alert" testID="question-error"><Note tone="red" icon="exclamationmark.circle.fill"><Text variant="subhead" tone="red">{t(e)}</Text></Note></View></Shake> : null;
  // When the error says the same as the note, show it once, as the error.
  const noteBox = note && note.text !== e ? <Note tone={note.tone}>{t(note.text)}</Note> : null;
  const qe = questionErrors(q, f);

  /** The answer controls for one question (alone, or as one part of a group screen). */
  const answerOf = (x: Question, onPick: (v: string) => void, lead: boolean) => {
    const tp = x.text ?? {}; const xe = !!e && x.keys.some((k) => !!qe[k]);
    switch (x.kind) {
      case "choice": return <OptionAnswers q={x} f={f} options={x.options!} value={f[x.keys[0]] as string} onPick={onPick} />;
      case "yesno": return <YesNoAnswer q={x} f={f} value={f[x.keys[0]] as string} onPick={onPick} />;
      case "text": case "textarea": return (
        <TextInput ref={inputRef} value={String(f[x.keys[0]] ?? "")} onChangeText={(v) => patch({ [x.keys[0]]: tp.upper ? v.toUpperCase() : v } as Partial<WizardForm>)}
          placeholder={t(x.placeholder ?? "")} placeholderTextColor={c.secondaryLabel} accessibilityLabel={t(x.label)} autoFocus={lead}
          keyboardType={tp.keyboard ?? "default"} autoCapitalize={tp.caps ?? "sentences"} autoCorrect={x.kind === "textarea"} spellCheck={x.kind === "textarea"}
          textContentType={tp.contentType as any} autoComplete={tp.autoComplete as any} multiline={x.kind === "textarea"} textAlignVertical={x.kind === "textarea" ? "top" : "center"}
          returnKeyType={x.kind === "textarea" ? "default" : "next"} onSubmitEditing={x.kind === "textarea" ? undefined : advance} blurOnSubmit={false} testID={lead ? "question-input" : `input-${x.id}`}
          onFocus={() => setFocus(x.keys[0])} onBlur={() => setFocus(null)} style={[...fieldStyle(c, xe, isRTL, focus === x.keys[0]), x.kind === "textarea" && [T.body, { minHeight: 150 }]]} />
      );
      case "pair": {
        const [a, b] = x.fields ?? [];
        const field = (x: NonNullable<Question["fields"]>[number], first: boolean) => (
          <View style={{ gap: S.xs }} key={String(x.key)}>
            <Text variant="footnote" weight="600" tone="secondary">{t(x.label)}</Text>
            <TextInput ref={first ? inputRef : input2Ref} value={String(f[x.key] ?? "")} onChangeText={(v) => patch({ [x.key]: v } as Partial<WizardForm>)} placeholder={t(x.placeholder)} placeholderTextColor={c.secondaryLabel}
              accessibilityLabel={t(x.label)} autoFocus={first && lead} autoCapitalize="words" autoCorrect={false} textContentType={x.contentType as any} autoComplete={x.autoComplete as any}
              returnKeyType={first ? "next" : "done"} blurOnSubmit={false} onSubmitEditing={() => (first ? input2Ref.current?.focus() : advance())} testID={first ? "question-input" : "question-input-2"}
              onFocus={() => setFocus(x.key)} onBlur={() => setFocus(null)} style={fieldStyle(c, !!e && !!qe[x.key], isRTL, focus === x.key)} />
          </View>
        );
        return (
          <View style={{ gap: S.md }}>
            {a && field(a, true)}{b && field(b, false)}
            {x.id === "spouseName" && !!f.lastName.trim() && f.spouseLastName !== f.lastName && (
              <View style={{ alignSelf: "flex-start" }}><Button title={t("Use {v}", { v: f.lastName.trim() })} variant="secondary" size="M" icon="person.2.fill" onPress={() => { tap(); patch({ spouseLastName: f.lastName.trim() }); }} /></View>)}
          </View>
        );
      }
      case "contact": return (
        <View style={{ gap: S.md }}>
          <View style={{ gap: S.xs }}>
            <Text variant="note" weight="600" tone="secondary">{t("Phone number")}</Text>
            <PhoneField country={f.phoneCountry} local={f.phoneLocal} error={!!e && !!qe.phone} onChange={(iso2, local, full) => patch({ phoneCountry: iso2, phoneLocal: local, phone: full })} />
          </View>
          <Checkbox label={t("Send me application updates on WhatsApp")} value={f.whatsappOptIn} onChange={(v) => patch({ whatsappOptIn: v })} icon="logo.whatsapp" />
        </View>
      );
      case "date": return (
        <View style={{ gap: S.md }}>
          {x.id === "travelEndDate" && !!f.travelStartDate && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }} accessibilityRole="radiogroup" accessibilityLabel={t("Trip length")} testID="date-quickpicks">
              {([[7, "1 week"], [14, "2 weeks"], [21, "3 weeks"], [30, "1 month"]] as const).map(([n, l]) => {
                const [y, m, d] = f.travelStartDate.split("-").map(Number); const v = isoLocal(new Date(y, m - 1, d + n - 1)); const on = f.travelEndDate === v;
                return <PressScale key={n} onPress={() => { select(); patch({ travelEndDate: v }); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t(l)}
                  style={{ flexGrow: 1, flexBasis: 0, minWidth: 72, minHeight: 44, paddingHorizontal: S.xs, borderRadius: R.round, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.accentFill : c.card, borderWidth: on ? 0 : 1, borderColor: c.border }}><Text variant="subhead" weight="600" numberOfLines={1} color={on ? c.onAccent : c.label}>{t(l)}</Text></PressScale>;
              })}
            </View>
          )}
          <DateAnswer label={t(x.label)} value={f[x.keys[0]] as string} onChange={(v) => patch({ [x.keys[0]]: v } as Partial<WizardForm>)} min={x.min?.(f)} max={x.max?.(f)} style={x.dateStyle ?? "calendar"} placeholder={x.placeholder} defaultDate={x.defaultDate?.(f)} />
        </View>
      );
      case "dates": return <DatesAnswer f={f} patch={patch} />;
      case "countries": return <AdditionalCountries f={f} onChange={(v) => patch({ additionalCountries: v })} />;
      // Saved travellers (lib/travellers.ts): tapping one fills the answers it carries; the screen decides where to go next.
      case "traveller": return <TravellerTiles travellers={getTravellers()} onPick={onPick} />;
      default: return null;
    }
  };
  const partPick = (x: Question) => (v: string) => { select(); patch({ [x.keys[0]]: v, ...(x.onPick?.(v, f) ?? {}) } as Partial<WizardForm>); };
  const body = q.kind === "group" ? (
    <View style={{ gap: S.lg }}>
      {partsOf(q, f).map((x, i) => {
        const head = q.partLabels?.[x.id]; const n = x.note?.(f);
        return (
          <View key={x.id} style={{ gap: S.sm }} testID={`part-${x.id}`}>
            {!!head && <Text variant="optionSm" weight="600" accessibilityRole="header">{t(head)}{x.required ? "" : ` · ${t("optional")}`}</Text>}
            {answerOf(x, partPick(x), i === 0)}
            {n && <Note tone={n.tone}>{t(n.text)}</Note>}
          </View>
        );
      })}
    </View>
  ) : answerOf(q, pick, true);
  // Canvas NOC: what a good NOC says, and the template by WhatsApp.
  const nocCard = q.id === "hasNOC" ? (
    <Card padded testID="noc-guide">
      <View style={{ gap: S.xs }}>
        <Text variant="callout" weight="600">{t("What a good NOC says")}</Text>
        <Text variant="note" tone="secondary">{t("Your name and passport number, job title, start date, monthly salary, approved leave dates, and that you'll return to work. On letterhead, signed and stamped.")}</Text>
        <SecondaryButton compact title={t("Send me the template")} onPress={() => { track("whatsapp_handoff", { screen: "noc-template" }); whatsapp("Hi EZvisa, please send me the NOC template for my employer."); }} />
      </View>
    </Card>
  ) : null;

  const auto = q.kind === "choice" || q.kind === "yesno" || q.kind === "country" || q.kind === "traveller";
  const showBtn = !auto || answered || !q.required;
  const btnTitle = !q.required && !answered ? t("Skip") : doneLabel ?? t("Continue");
  const bar = showBtn ? (
    <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: barBottom, backgroundColor: c.bg }}>
      <Button title={btnTitle} variant={!q.required && !answered ? "secondary" : "primary"} disabled={!group && !!liveErr && (q.required || answered)} onPress={advance} />
    </View>
  ) : <View style={{ height: barBottom }} />;

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: c.bg }, kbPad]}>
      {header}
      <Animated.View key={pageKey} entering={entering} style={{ flex: 1 }}>
        {q.kind === "country" && !(q.id === "nationality" && !other) ? (
          <CountryAnswer key={other ? "all" : "top"} names={other ? q.allNames! : q.names!} searchAll={other ? undefined : q.allNames} value={f[q.keys[0]] as string} onPick={pick}
            searchPlaceholder={other ? "Search nationality" : "Search country"} popular={q.id === "destination" ? ["France", "Italy", "Spain", "Germany", "Greece"] : undefined}
            allTitle={q.id === "destination" ? t("All {n} countries", { n: q.names!.length }) : undefined} header={<View style={{ gap: S.md, paddingTop: S.md }}>{title}{errBox}</View>} />
        ) : q.kind === "country" ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: S.xl, gap: S.lg }}>
            {title}
            <NationalityGrid value={f.nationality} onPick={pick} onOther={() => pick(OTHER_NATIONALITY)} />
            {errBox}
          </ScrollView>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: S.xl, gap: S.lg }}>
            {title}
            {body}
            {nocCard}
            {days > 0 && <Note tone={days > 90 ? "red" : "blue"}><Text variant="subhead" color={c.label}>{t("Total Stay Duration: {n} days.", { n: days })}</Text></Note>}
            {noteBox}
            {errBox}
          </ScrollView>
        )}
      </Animated.View>
      {bar}
      {children}
      <SheetScaffold visible={explain} onClose={() => setExplain(false)} pose={q.pose} globiSize={96} bubble title={t("Why I ask this")} testID="globi-explain"
        actions={<View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><SecondaryButton title={t("Ask the team")} whatsapp onPress={() => { track("whatsapp_handoff", { screen: "globi-explain" }); whatsapp(); }} /></View>
          <View style={{ flex: 1 }}><PrimaryButton title={t("Got it")} onPress={() => setExplain(false)} /></View>
        </View>}>
        <Card padded><Text variant="body">{t(q.explain.why)}</Text></Card>
        <RowGroup><Row label={t("Used for")} value={t(q.explain.usedFor)} /><Row label={t("Shared with")} value={t(q.explain.sharedWith)} /></RowGroup>
      </SheetScaffold>
    </Animated.View>
  );
}
