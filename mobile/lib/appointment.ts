// Embassy / VFS appointment, real data only: the appointment_* columns on visa_applications (migrations/0003, set by
// EZvisa staff), falling back to the older additional_notes.appointment. Null when there is no appointment.
import { Alert, Linking, Platform } from "react-native";
import * as CalendarLegacy from "expo-calendar/legacy";
import type { Application } from "./data";

export type Appt = { at: string; centre?: string; address?: string; lat?: number; lng?: number; reference?: string; durationMin?: number };

export function appointmentOf(a: Application): Appt | null {
  const r: any = a;
  if (r.appointment_at && !isNaN(Date.parse(r.appointment_at)))
    return { at: r.appointment_at, centre: r.appointment_centre ?? undefined, address: r.appointment_address ?? undefined, lat: r.appointment_lat ?? undefined, lng: r.appointment_lng ?? undefined, reference: r.appointment_reference ?? undefined };
  const x: any = (a.notes as any)?.appointment;
  if (!x || typeof x.at !== "string" || isNaN(Date.parse(x.at))) return null;
  return x as Appt;
}

type T = (s: string) => string;
const googleUrl = (title: string, start: Date, end: Date, where: string) => {
  const f = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(start)}/${f(end)}&location=${encodeURIComponent(where)}`;
};
const deniedAlert = (t: T) => Alert.alert(t("Calendar access is off"), t("Allow calendar access in Settings to add this appointment."), [
  { text: t("Not now"), style: "cancel" }, { text: t("Open Settings"), onPress: () => { Linking.openSettings().catch(() => {}); } },
]);

/** Opens the system "new event" sheet, prefilled. iOS 17+ needs no calendar permission for this sheet; older iOS needs
 *  full access, so it is requested first and a denial explains how to turn it on. Returns true when the event was saved
 *  (iOS reports saved/canceled; Android always reports "done"). */
export async function addToCalendar(a: Application, ap: Appt, t: T): Promise<boolean> {
  const start = new Date(ap.at); const end = new Date(start.getTime() + (ap.durationMin ?? 60) * 60e3);
  const title = `${t("Visa appointment")} · ${t(a.countries?.name ?? "")}`.replace(/ · $/, "");
  const location = [ap.centre, ap.address].filter(Boolean).join(", ");
  if (Platform.OS === "web") { await Linking.openURL(googleUrl(title, start, end, ap.address ?? ap.centre ?? "")); return false; }
  if (Platform.OS === "ios" && parseInt(String(Platform.Version), 10) < 17) {
    let p = await CalendarLegacy.getCalendarPermissionsAsync();
    if (!p.granted && p.canAskAgain) p = await CalendarLegacy.requestCalendarPermissionsAsync();
    if (!p.granted) { deniedAlert(t); return false; }
  }
  try {
    const r = await CalendarLegacy.createEventInCalendarAsync({ title, startDate: start, endDate: end, location, notes: ap.reference ? `${t("Ref")} ${ap.reference} · ${a.reference}` : a.reference });
    return r.action === "saved" || r.action === "done";
  } catch {
    const p = await CalendarLegacy.getCalendarPermissionsAsync().catch(() => null);
    if (p && !p.granted && !p.canAskAgain) deniedAlert(t);
    else Alert.alert(t("Couldn't open the calendar."), t("Please try again."));
    return false;
  }
}

/** Apple Maps directions (coordinates when staff set them, else the address/centre as a search). */
export function directionsUrl(ap: Appt): string | null {
  if (ap.lat != null && ap.lng != null) return `https://maps.apple.com/?daddr=${ap.lat},${ap.lng}&q=${encodeURIComponent(ap.centre ?? "")}`;
  const q = ap.address ?? ap.centre; return q ? `https://maps.apple.com/?daddr=${encodeURIComponent(q)}` : null;
}
