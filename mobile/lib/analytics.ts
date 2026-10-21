// Wizard drop-off analytics WITHOUT a third-party key: events are kept on this phone (ring buffer).
// Signed-in drafts already record wizardStep / wizardQuestion on the draft row, so staff can see where people stop.
// Wizard events are also sent to public.wizard_events (migrations/0004, insert-only, no select for clients): anonymous
// session id, event, page id, destination, platform, app version, signed-in flag. Nothing else.
// Never put personal data (names, passport, email) in props.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";
const REMOTE = new Set(["wizard_open", "wizard_page", "wizard_submit", "wizard_close"]);
let session = ""; const newSession = () => { session = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; };
function send(e: string, p?: Ev["p"]) {
  if (!supabase || !REMOTE.has(e)) return;
  if (e === "wizard_open" || !session) newSession();
  const s = (v: unknown, n = 64) => (typeof v === "string" ? v.slice(0, n) : null);
  supabase.from("wizard_events" as any).insert({ session_id: session, event: e, page: s(p?.page), destination: s(p?.destination), platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web",
    app_version: s(Constants.expoConfig?.version, 32), signed_in: typeof p?.signedIn === "boolean" ? p.signedIn : null } as any).then(() => {}, () => {});
}
const KEY = "ezvisa.events.v1"; const MAX = 300;
export type Ev = { e: string; at: number; p?: Record<string, string | number | boolean> };
let buf: Ev[] | null = null; let t: ReturnType<typeof setTimeout> | null = null;
async function load() { if (buf) return buf; try { buf = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]"); } catch { buf = []; } return buf!; }
export function track(e: string, p?: Ev["p"]) {
  send(e, p);
  load().then((b) => { b.push({ e, at: Date.now(), ...(p && { p }) }); if (b.length > MAX) b.splice(0, b.length - MAX);
    if (t) clearTimeout(t); t = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(b)).catch(() => {}), 500); });
}
export async function events() { return [...(await load())]; }
/** Last question seen per wizard session that did not end in a submit = the drop-off point. */
export async function dropOff(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}; let last: string | null = null;
  for (const ev of await load()) {
    if (ev.e === "wizard_open") { if (last) out[last] = (out[last] ?? 0) + 1; last = null; }
    if (ev.e === "wizard_page") last = String(ev.p?.page ?? "");
    if (ev.e === "wizard_submit") last = null;
  }
  if (last) out[last] = (out[last] ?? 0) + 1;
  return out;
}
