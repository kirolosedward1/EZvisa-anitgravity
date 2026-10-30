import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Application } from "./data";
import { notifications } from "./push";

/** Opt-in local reminders (no server): travel date and passport expiry, scheduled on the device from real application data.
 * Taps are routed by useNotificationRouting (lib/push.ts), the same as pushes. */
const KEY = "ezvisa.reminders.v1";
const PREFIX = "ezvisa-rem-";
export const remindersSupported = Platform.OS !== "web";
type N = typeof import("expo-notifications");
const notif = (): N | null => (remindersSupported ? notifications() : null);

const PP_KEY = "ezvisa.passportExpiry.v1";
/** Passport expiry is not a website field, so it is kept on this phone only (Account -> Reminders). */
export async function getPassportExpiry() { return (await AsyncStorage.getItem(PP_KEY).catch(() => null)) || ""; }
export async function setPassportExpiry(v: string) { if (v) await AsyncStorage.setItem(PP_KEY, v); else await AsyncStorage.removeItem(PP_KEY); }
export async function remindersEnabled() { return (await AsyncStorage.getItem(KEY)) === "on"; }

/** Turns reminders on (asks permission) or off (cancels ours). Returns the resulting state. */
export async function setRemindersEnabled(on: boolean, apps: Application[] | null): Promise<{ on: boolean; denied?: boolean }> {
  const N = notif();
  if (!N) return { on: false };
  if (!on) { await AsyncStorage.setItem(KEY, "off"); await cancelOurs(N); return { on: false }; }
  let { status } = await N.getPermissionsAsync();
  if (status !== "granted") status = (await N.requestPermissionsAsync()).status;
  if (status !== "granted") { await AsyncStorage.setItem(KEY, "off"); return { on: false, denied: true }; }
  await AsyncStorage.setItem(KEY, "on");
  if (apps) await syncReminders(apps);
  return { on: true };
}

async function cancelOurs(N: N, keepDraft = false) {
  const all = await N.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((x) => x.identifier.startsWith(PREFIX) && !(keepDraft && x.identifier === PREFIX + "draft")).map((x) => N.cancelScheduledNotificationAsync(x.identifier)));
}

const at9 = (iso: string, addDays = 0, addMonths = 0) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1 + addMonths, d + addDays, 9, 0, 0);
};
const ACTIVE = (s: string) => !["completed", "rejected", "cancelled"].includes(s);

/** Plans the reminders for the given applications; pure, so it can be checked without a device. */
export function planReminders(apps: Application[], now = new Date(), passportExpiry = "") {
  const out: { id: string; date: Date; title: string; body: string; url: string }[] = [];
  const seenPassports = new Set<string>();
  for (const a of apps) {
    if (!ACTIVE(a.status)) continue;
    const url = `/applications/${a.id}`;
    if (a.entry_date) {
      out.push({ id: `${PREFIX}${a.id}-trip7`, date: at9(a.entry_date, -7), title: "Your trip is in one week", body: "Check your documents and travel insurance.", url });
      out.push({ id: `${PREFIX}${a.id}-trip1`, date: at9(a.entry_date, -1), title: "Your trip is tomorrow", body: "Have your passport and visa ready.", url });
    }
    // The appointment (staff-set column, or the date the customer added): a reminder the day before, opening the
    // appointment screen with the packing list.
    const apAt = ((a as any).appointment_at as string | undefined) ?? ((a.notes as any)?.appointment?.at as string | undefined);
    if (apAt && !isNaN(Date.parse(apAt))) {
      const d = new Date(apAt); const eve = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 18, 0, 0);
      out.push({ id: `${PREFIX}${a.id}-appt1`, date: eve, title: "Appointment tomorrow", body: "Bring the printed set. Open the packing list.", url: `/appointment/${a.id}` });
    }
    for (const p of a.applicants ?? []) {
      if (!p.passport_expiry_date) continue;
      const k = `${p.passport_number ?? p.id}-${p.passport_expiry_date}`;
      if (seenPassports.has(k)) continue;
      seenPassports.add(k);
      const who = p.is_primary ? "Your passport" : "A passport on your application"; // no names on the lock screen
      out.push({ id: `${PREFIX}${p.id}-pp6`, date: at9(p.passport_expiry_date, 0, -6), title: `${who} expires in 6 months`, body: "Many embassies need 3+ months validity after your trip.", url });
      out.push({ id: `${PREFIX}${p.id}-pp3`, date: at9(p.passport_expiry_date, 0, -3), title: `${who} expires in 3 months`, body: "Renew it before your next visa application.", url });
    }
  }
  if (passportExpiry && /^\d{4}-\d{2}-\d{2}$/.test(passportExpiry) && !seenPassports.size) {
    out.push({ id: `${PREFIX}local-pp6`, date: at9(passportExpiry, 0, -6), title: "Your passport expires in 6 months", body: "Many embassies need 3+ months validity after your trip.", url: "/account" });
    out.push({ id: `${PREFIX}local-pp3`, date: at9(passportExpiry, 0, -3), title: "Your passport expires in 3 months", body: "Renew it before your next visa application.", url: "/account" });
  }
  return out.filter((r) => r.date.getTime() > now.getTime());
}

/** Re-schedules our reminders when enabled. Safe to call often; never throws. */
export async function syncReminders(apps: Application[]): Promise<number> {
  try {
    const N = notif();
    if (!N || !(await remindersEnabled())) return 0;
    if ((await N.getPermissionsAsync()).status !== "granted") return 0;
    if (Platform.OS === "android") await N.setNotificationChannelAsync("reminders", { name: "Reminders", importance: N.AndroidImportance.DEFAULT });
    await cancelOurs(N, true);
    const plan = planReminders(apps, new Date(), await getPassportExpiry());
    for (const r of plan) {
      await N.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { url: r.url } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: "reminders" },
      });
    }
    return plan.length;
  } catch { return 0; }
}

const DRAFT_ID = PREFIX + "draft";
/** One "continue your application" nudge 24h after leaving an unfinished draft. Only when reminders are already on; never asks permission. */
export async function scheduleDraftReminder(title: string, body: string) {
  const N = notif(); if (!N || !(await remindersEnabled())) return;
  if ((await N.getPermissionsAsync()).status !== "granted") return;
  await N.cancelScheduledNotificationAsync(DRAFT_ID).catch(() => {});
  await N.scheduleNotificationAsync({ identifier: DRAFT_ID, content: { title, body, data: { url: "/apply" } },
    trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 24 * 3600, repeats: false } as any }).catch(() => {});
}
export async function cancelDraftReminder() { const N = notif(); if (N) await N.cancelScheduledNotificationAsync(DRAFT_ID).catch(() => {}); }
