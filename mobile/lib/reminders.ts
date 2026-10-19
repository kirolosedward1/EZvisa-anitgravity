import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import type { Application } from "./data";

/** Opt-in local reminders (no server): travel date and passport expiry, scheduled on the device from real application data. */
const KEY = "ezvisa.reminders.v1";
const PREFIX = "ezvisa-rem-";
export const remindersSupported = Platform.OS !== "web";
type N = typeof import("expo-notifications");
const notif = (): N | null => { if (!remindersSupported) return null; try { return require("expo-notifications") as N; } catch { return null; } };

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

async function cancelOurs(N: N) {
  const all = await N.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((x) => x.identifier.startsWith(PREFIX)).map((x) => N.cancelScheduledNotificationAsync(x.identifier)));
}

const at9 = (iso: string, addDays = 0, addMonths = 0) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1 + addMonths, d + addDays, 9, 0, 0);
};
const ACTIVE = (s: string) => !["completed", "rejected", "cancelled"].includes(s);

/** Plans the reminders for the given applications; pure, so it can be checked without a device. */
export function planReminders(apps: Application[], now = new Date()) {
  const out: { id: string; date: Date; title: string; body: string; url: string }[] = [];
  const seenPassports = new Set<string>();
  for (const a of apps) {
    if (!ACTIVE(a.status)) continue;
    const where = a.countries?.name ?? "your trip";
    const url = `/applications/${a.id}`;
    if (a.entry_date) {
      out.push({ id: `${PREFIX}${a.id}-trip7`, date: at9(a.entry_date, -7), title: `${where} in one week`, body: "Check your documents and travel insurance.", url });
      out.push({ id: `${PREFIX}${a.id}-trip1`, date: at9(a.entry_date, -1), title: `${where} tomorrow`, body: "Have your passport and visa ready.", url });
    }
    for (const p of a.applicants ?? []) {
      if (!p.passport_expiry_date) continue;
      const k = `${p.passport_number ?? p.id}-${p.passport_expiry_date}`;
      if (seenPassports.has(k)) continue;
      seenPassports.add(k);
      const who = p.is_primary ? "Your passport" : `${p.first_name}'s passport`;
      out.push({ id: `${PREFIX}${p.id}-pp6`, date: at9(p.passport_expiry_date, 0, -6), title: `${who} expires in 6 months`, body: "Many embassies need 3+ months validity after your trip.", url });
      out.push({ id: `${PREFIX}${p.id}-pp3`, date: at9(p.passport_expiry_date, 0, -3), title: `${who} expires in 3 months`, body: "Renew it before your next visa application.", url });
    }
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
    await cancelOurs(N);
    const plan = planReminders(apps);
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

/** Opens the application when a reminder is tapped. Returns a cleanup. Only loads the module once reminders were enabled. */
export function startReminderRouting(): () => void {
  let sub: { remove: () => void } | null = null; let dead = false;
  remindersEnabled().then((on) => {
    const N = on ? notif() : null;
    if (!N || dead) return;
    N.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
    sub = N.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/applications/")) router.push(url as any);
    });
  }).catch(() => {});
  return () => { dead = true; sub?.remove(); };
}
