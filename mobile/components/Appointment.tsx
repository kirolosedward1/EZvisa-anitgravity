// Embassy / VFS appointment card. Real data only: read from additional_notes.appointment (set by EZvisa staff).
// Reads the appointment_* columns (migrations/0003, applied), falling back to additional_notes.appointment; hidden when absent.
import { Linking, Platform, View } from "react-native";
import * as CalendarLegacy from "expo-calendar/legacy";
import { ListGroup, ListRow } from "./ui";
import { useColors } from "../lib/theme";
import { useT } from "../lib/i18n";
import type { Application } from "../lib/data";

export type Appt = { at: string; centre?: string; address?: string; lat?: number; lng?: number; reference?: string; durationMin?: number };
export function appointmentOf(a: Application): Appt | null {
  const r: any = a; // live columns first (migrations/0003), then the older notes fallback
  if (r.appointment_at && !isNaN(Date.parse(r.appointment_at)))
    return { at: r.appointment_at, centre: r.appointment_centre ?? undefined, address: r.appointment_address ?? undefined, lat: r.appointment_lat ?? undefined, lng: r.appointment_lng ?? undefined, reference: r.appointment_reference ?? undefined };
  const x: any = (a.notes as any)?.appointment;
  if (!x || typeof x.at !== "string" || isNaN(Date.parse(x.at))) return null;
  return x as Appt;
}
export function AppointmentCard({ a }: { a: Application }) {
  const c = useColors(); const { t, lang } = useT();
  const ap = appointmentOf(a); if (!ap) return null;
  const start = new Date(ap.at); const end = new Date(start.getTime() + (ap.durationMin ?? 60) * 60e3);
  const when = start.toLocaleString(lang === "ar" ? "ar" : undefined, { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const title = `${t("Visa appointment")} · ${a.countries?.name ?? ""}`.trim();
  const addCal = async () => {
    try { await CalendarLegacy.createEventInCalendarAsync({ title, startDate: start, endDate: end, location: [ap.centre, ap.address].filter(Boolean).join(", "), notes: ap.reference ? `Ref ${ap.reference} · ${a.reference}` : a.reference }); }
    catch { const f = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, ""); Linking.openURL(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(start)}/${f(end)}&location=${encodeURIComponent(ap.address ?? ap.centre ?? "")}`); }
  };
  const q = encodeURIComponent(ap.address ?? ap.centre ?? "");
  const maps = () => Linking.openURL(ap.lat != null && ap.lng != null ? `https://maps.apple.com/?daddr=${ap.lat},${ap.lng}&q=${encodeURIComponent(ap.centre ?? "")}` : `https://maps.apple.com/?daddr=${q}`);
  return (
    <View testID="appointment-card">
      <ListGroup header={t("Appointment")} inset={58}>
        <ListRow icon="calendar" iconColor={c.tint} title={when} subtitle={[ap.centre, ap.reference && `${t("Ref")} ${ap.reference}`].filter(Boolean).join(" · ") || undefined} chevron={false} />
        <ListRow icon="calendar" iconColor={c.tint} title={t("Add to calendar")} onPress={addCal} />
        {!!(ap.address || ap.centre || ap.lat != null) && <ListRow icon="map.fill" iconColor={c.green} title={t(Platform.OS === "ios" ? "Directions in Apple Maps" : "Directions")} subtitle={ap.address} onPress={maps} />}
      </ListGroup>
    </View>
  );
}
