// Appointment (canvas BookAppointment, Appointment, AppointmentSheet). Not booked yet: how to book on the visa
// centre's site (centre from lib/visaCentres.ts, reference and passport numbers to type in, the last sensible date),
// then "I have booked, add the date". Booked: date and place, Directions, Add to calendar, Change, the packing list,
// what happens on the day and the day-before reminder. A date added here goes to additional_notes.appointment (the
// staff-set appointment_* columns win when present, lib/appointment.ts).
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, EmptyState, HeaderIconButton, InlineError, InfoNote, PrimaryButton, QuestionHeader, Row, RowGroup, SecondaryButton, Skeleton, StickyCTA, Text, Button, PressScale, showSaved } from "../../components/ui";
import { DateAnswer } from "../../components/wizard/answers";
import { AppointmentDaySheet, PackingList } from "../../components/status/AppointmentDay";
import { useColors, S, R } from "../../lib/theme";
import { useT, ltr } from "../../lib/i18n";
import { getApplication, patchNotes, type Application } from "../../lib/data";
import { appointmentOf, addToCalendar, directionsUrl } from "../../lib/appointment";
import { centreFor, mapsUrl } from "../../lib/visaCentres";
import { remindersEnabled, setRemindersEnabled, remindersSupported } from "../../lib/reminders";
import { formatAppointment, formatDetailDate } from "../../lib/dates";
import { iso } from "../../lib/wizard";
import { track } from "../../lib/analytics";
import { success, tap, error as hError, select } from "../../lib/haptics";
import { cachedApplication } from "../../lib/appsCache";

const TIMES = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

export default function Appointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(); const insets = useSafeAreaInsets(); const { t, lang } = useT();
  const [a, setA] = useState<Application | null>(() => cachedApplication(id)); /* shown at once, then the full row */ const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false); const [date, setDate] = useState(""); const [time, setTime] = useState("09:00");
  const [busy, setBusy] = useState(false); const [saveErr, setSaveErr] = useState<string | null>(null);
  const [day, setDay] = useState(false); const [remind, setRemind] = useState(false);
  const load = useCallback(async () => { try { setErr(null); setA(await getApplication(id!)); } catch (e: any) { setErr(e?.message ?? String(e)); } }, [id]);
  useEffect(() => { load(); remindersEnabled().then(setRemind).catch(() => {}); }, [load]);
  const close = () => { tap(); if (router.canGoBack()) router.back(); else router.replace(`/applications/${id}`, { withAnchor: true }); };

  const top = Platform.OS === "ios" ? S.sm : insets.top + S.xs;
  const header = (
    <View style={{ paddingTop: top, paddingHorizontal: S.gutter - S.xxs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52 }}>
      <HeaderIconButton icon="xmark" label={t("Close")} onPress={close} testID="appointment-close" />
      <Text variant="headline">{t("Appointment")}</Text>
      <View style={{ width: 44 }} />
    </View>
  );
  if (err) return <View style={{ flex: 1, backgroundColor: c.bg }}>{header}<EmptyState icon="exclamationmark.triangle.fill" title={t("Couldn't load")} message={t(err)} action={<Button title={t("Retry")} variant="secondary" onPress={load} />} /></View>;
  if (!a) return <View style={{ flex: 1, backgroundColor: c.bg }}>{header}<View style={{ padding: S.gutter, gap: S.md }}><Skeleton h={120} r={R.card} /><Skeleton h={220} r={R.card} /></View></View>;

  const country = a.countries?.name ?? "";
  const centre = centreFor(country);
  // Emirate from the wizard answers: Abu Dhabi and Al Ain book in Abu Dhabi, everyone else in Dubai.
  const emirate = (a.notes?.wizard?.cityOfResidence ?? "") as string;
  const city = emirate === "Abu Dhabi" || emirate === "Al Ain" ? "Abu Dhabi" : "Dubai";
  const address = centre ? (city === "Abu Dhabi" ? centre.abuDhabiAddress : centre.dubaiAddress) : "";
  const centreName = centre ? `${centre.provider} ${t(city)}` : t("the visa centre");
  // Book at least 15 days before the trip (consulate processing); the canvas "before 26 Nov" for a 10 Dec trip.
  const deadline = a.entry_date ? iso(new Date(Date.parse(a.entry_date + "T12:00:00") - 14 * 864e5)) : "";
  const ap = appointmentOf(a);

  const save = async () => {
    if (!date) { hError(); setSaveErr(t("Choose the date of your appointment.")); return; }
    setBusy(true); setSaveErr(null);
    try {
      const at = new Date(`${date}T${time}:00`).toISOString();
      await patchNotes(a.id, { appointment: { at, centre: centre ? `${centre.provider} ${city}` : undefined, address: address || undefined, durationMin: 60 } } as any);
      track("appointment_booked", {}); success(); showSaved(); setAdding(false); await load();
    } catch (e: any) { hError(); setSaveErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  if (adding) return (
    <View style={{ flex: 1, backgroundColor: c.bg }} testID="appointment-add">
      {header}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: S.xl, gap: S.lg }}>
        <QuestionHeader question={t("When is your appointment?")} pose="calendar" />
        <DateAnswer label={t("Appointment date")} value={date} onChange={setDate} min={iso(new Date())} max={a.entry_date ?? undefined} style="calendar" placeholder={t("Select date")} />
        <View style={{ gap: S.xs }}>
          <Text variant="note" weight="600" tone="secondary">{t("Time")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.xs }} accessibilityRole="radiogroup">
            {TIMES.map((x) => { const on = x === time; return (
              <PressScale key={x} onPress={() => { select(); setTime(x); }} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={x}
                style={{ minWidth: 64, minHeight: 44, borderRadius: R.round, alignItems: "center", justifyContent: "center", paddingHorizontal: S.sm, backgroundColor: on ? c.accentFill : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border }}>
                <Text variant="callout" weight="600" color={on ? c.onAccent : c.label}>{x}</Text>
              </PressScale>); })}
          </ScrollView>
        </View>
        {!!address && <InfoNote icon="mappin.and.ellipse" text={`${centreName} · ${address}`} />}
        <InlineError text={saveErr} />
      </ScrollView>
      <StickyCTA><PrimaryButton title={t("Save appointment")} onPress={save} loading={busy} disabled={busy} testID="appointment-save" /></StickyCTA>
    </View>
  );

  if (!ap) return (
    <View style={{ flex: 1, backgroundColor: c.bg }} testID="appointment-book">
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: S.xl, gap: S.lg }}>
        <QuestionHeader question={t("Book your appointment")} pose="calendar" />
        <Text variant="callout" tone="secondary">{deadline ? t("Book on the visa centre site before {d}. You will need these.", { d: formatDetailDate(deadline, lang) }) : t("Book on the visa centre site. You will need these.")}</Text>
        <Card padded>
          <View style={{ gap: S.lg }}>
            <Step n={1} title={t("Open {c}", { c: centreName })} sub={t("Sign in or create an account with the same email.")} />
            <Step n={2} title={t("Enter your details")} sub={a.applicants.length > 1 ? t("Both travellers in one booking, one after the other.") : t("Use the details exactly as in your passport.")}>
              <RowGroup>
                <Row label={t("Reference")} value={ltr(a.reference)} />
                {a.applicants.map((p) => <Row key={p.id} label={p.first_name || t("Traveller")} value={p.passport_number ? `${t("passport")} ${ltr(p.passport_number)}` : t("Passport number to add")} />)}
              </RowGroup>
            </Step>
            <Step n={3} title={t("Pick a slot")} sub={deadline ? t("Any date before {d} works for a {trip} trip.", { d: formatDetailDate(deadline, lang), trip: formatDetailDate(a.entry_date!, lang) }) : t("Pick the earliest slot that suits you.")} />
          </View>
        </Card>
        {!!address && <Row label={t("Address")} value={address} onPress={() => Linking.openURL(mapsUrl(address)).catch(() => {})} />}
        <SecondaryButton title={t("What happens on the day")} onPress={() => setDay(true)} />
      </ScrollView>
      <StickyCTA caption={t("Adds it to the app and your calendar.")}><PrimaryButton title={t("I have booked, add the date")} onPress={() => { tap(); setAdding(true); }} testID="appointment-add-date" /></StickyCTA>
      <AppointmentDaySheet visible={day} onClose={() => setDay(false)} travellers={a.applicants.length} />
    </View>
  );

  const maps = directionsUrl(ap);
  const travellers = a.applicants.map((p) => p.first_name).filter(Boolean).join(` ${t("and")} `);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} testID="appointment-booked">
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: Math.max(insets.bottom, S.lg) + S.lg, gap: S.lg }}>
        <QuestionHeader question={t("Your appointment")} pose="calendar" chip={<Text variant="caption" weight="600" color={c.success}>{t("Booked")}</Text>} />
        <Card padded>
          <View style={{ gap: S.xs }}>
            <Text variant="resultTitle">{formatAppointment(ap.at, lang)}</Text>
            {!!(ap.centre || ap.address) && <Text variant="callout" tone="secondary">{[ap.centre, ap.address].filter(Boolean).join(" · ")}</Text>}
            {a.applicants.length > 1 && <Text variant="note" tone="secondary">{t("{who}, back to back", { who: travellers })}</Text>}
            <View style={{ flexDirection: "row", gap: S.xs, marginTop: S.sm }}>
              {!!maps && <View style={{ flex: 1 }}><SecondaryButton compact title={t("Directions")} onPress={() => { tap(); Linking.openURL(maps).catch(() => {}); }} /></View>}
              <View style={{ flex: 1 }}><SecondaryButton compact title={t("Add to calendar")} onPress={() => { tap(); addToCalendar(a, ap, t).then((ok) => { if (ok) success(); }).catch(() => {}); }} /></View>
              <View style={{ flex: 1 }}><SecondaryButton compact title={t("Change")} onPress={() => { tap(); setDate(ap.at.slice(0, 10)); setAdding(true); }} /></View>
            </View>
          </View>
        </Card>
        <PackingList appId={a.id} />
        <RowGroup>
          <Row label={t("Biometrics")} value={a.applicants.length > 1 ? t("Fingerprints and photo, both of you") : t("Fingerprints and photo")} />
          <Row label={t("What happens on the day")} onPress={() => setDay(true)} />
          {remindersSupported && <Row label={t("Remind me the day before")} switchValue={remind} onSwitch={(v) => { setRemind(v); setRemindersEnabled(v, [a]).then((r) => setRemind(r.on)).catch(() => {}); }} />}
        </RowGroup>
      </ScrollView>
      <AppointmentDaySheet visible={day} onClose={() => setDay(false)} travellers={a.applicants.length} />
    </View>
  );
}

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: n === 1 ? c.accent : c.fill }}><Text variant="note" weight="600" color={n === 1 ? c.onAccent : c.label}>{n}</Text></View>
      <View style={{ flex: 1, gap: S.xs }}>
        <Text variant="optionSm" weight="600">{title}</Text>
        {!!sub && <Text variant="note" tone="secondary">{sub}</Text>}
        {children}
      </View>
    </View>
  );
}
