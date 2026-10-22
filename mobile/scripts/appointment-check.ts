// Node-only checks for the appointment card logic (lib/appointment.ts): which rows have an appointment, the Apple Maps
// link, and add-to-calendar on each platform, including calendar access denied. expo-calendar, Alert and Linking are
// stubs that record calls (scripts/stubs). Run: bun scripts/run-check.ts scripts/appointment-check.ts
import { Platform } from "react-native";
import { toApplication, type VisaRow } from "../lib/data";
import { appointmentOf, addToCalendar, directionsUrl } from "../lib/appointment";
declare const process: any;

let fail = 0;
const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const g = globalThis as any;
const row = (p: Record<string, unknown>, notes?: Record<string, unknown>) => toApplication({ id: "11111111-2222-4333-8444-555555555555", application_status: "ready", payment_status: "paid", created_at: "2026-10-01T08:00:00Z", updated_at: "2026-10-02T08:00:00Z",
  destination_country: "Spain", email: "t@example.com", full_name: "T P", nationality: "India", phone: "+971500000000", travel_purpose: "tourism", additional_notes: notes ? JSON.stringify(notes) : null, ...p } as unknown as VisaRow);
const t = (s: string) => s;
const AT = "2026-11-03T06:30:00Z";

// appointmentOf: real data only.
ok(appointmentOf(row({})) === null, "no appointment columns and no notes: no card");
ok(appointmentOf(row({ appointment_at: "not a date" })) === null, "invalid appointment_at: no card");
ok(appointmentOf(row({ appointment_at: AT, appointment_centre: "BLS Dubai" }))?.centre === "BLS Dubai", "appointment_at + centre: card with the centre");
ok(appointmentOf(row({}, { appointment: { at: AT, centre: "VFS" } }))?.at === AT, "older notes.appointment fallback still read");
ok(appointmentOf(row({}, { appointment: { centre: "VFS" } })) === null, "notes.appointment without a time: no card");

// Apple Maps directions.
ok(directionsUrl({ at: AT, lat: 25.23, lng: 55.32, centre: "BLS" }) === "https://maps.apple.com/?daddr=25.23,55.32&q=BLS", "coordinates: Apple Maps to the exact point");
ok(directionsUrl({ at: AT, address: "Wafi Mall, Dubai" }) === "https://maps.apple.com/?daddr=Wafi%20Mall%2C%20Dubai", "address: Apple Maps search, URL-encoded");
ok(directionsUrl({ at: AT, centre: "مركز التأشيرات" })?.startsWith("https://maps.apple.com/?daddr=%D9%85") === true, "Arabic centre name is URL-encoded");
ok(directionsUrl({ at: AT }) === null, "no place at all: no directions row");

const a = row({ appointment_at: AT, appointment_centre: "BLS Dubai", appointment_address: "Wafi Mall", appointment_reference: "BLS-1" });
const ap = appointmentOf(a)!;
const run = async (os: string, version: number | string, cal: Record<string, unknown>) => { (Platform as any).OS = os; (Platform as any).Version = version; g.__cal = cal; g.__calls = []; const saved = await addToCalendar(a, ap, t); return { saved, calls: g.__calls as [string, any][] }; };
const names = (c: [string, any][]) => c.map((x) => x[0]).join(",");

(async () => {
  let r = await run("ios", "17.4", { create: { action: "saved", id: "e1" } });
  ok(r.saved && names(r.calls) === "create", "iOS 17+: system sheet without asking for calendar access; Save reported");
  const ev = r.calls[0][1];
  ok(ev.title.includes("Spain") && +new Date(ev.startDate) === Date.parse(AT) && +new Date(ev.endDate) - +new Date(ev.startDate) === 3600e3 && ev.location === "BLS Dubai, Wafi Mall" && ev.notes.includes("BLS-1"),
    "event prefilled: title with destination, real start, 1 h, centre + address, reference");
  r = await run("ios", "17.4", { create: { action: "canceled", id: null } });
  ok(!r.saved, "iOS: Cancel in the sheet is not reported as saved");
  r = await run("ios", "16.7", { perm: { granted: false, canAskAgain: true }, requested: { granted: true, canAskAgain: true }, create: { action: "saved", id: "e2" } });
  ok(r.saved && names(r.calls) === "getPerm,requestPerm,create", "iOS 16: asks for access first, then opens the sheet");
  r = await run("ios", "16.7", { perm: { granted: false, canAskAgain: true }, requested: { granted: false, canAskAgain: false } });
  ok(!r.saved && names(r.calls) === "getPerm,requestPerm,alert" && r.calls[2][1] === "Calendar access is off", "iOS 16, access denied: no sheet, explains with Open Settings");
  r = await run("ios", "16.7", { perm: { granted: false, canAskAgain: false } });
  ok(!r.saved && names(r.calls) === "getPerm,alert", "iOS 16, denied before: not asked again, explains");
  r = await run("android", 34, { create: { action: "done", id: null } });
  ok(r.saved && names(r.calls) === "create", "Android: system intent, reported as done");
  r = await run("ios", "17.4", { createThrows: true, perm: { granted: true, canAskAgain: true } });
  ok(!r.saved && r.calls.some((c) => c[0] === "alert" && c[1] === "Couldn't open the calendar."), "sheet error: clear message, no crash");
  r = await run("web", 0, {});
  ok(!r.saved && names(r.calls) === "openURL" && String(r.calls[0][1]).startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE"), "web: Google Calendar link (no native sheet)");
  console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
})();
