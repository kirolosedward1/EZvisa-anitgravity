// Wizard drop-off analytics WITHOUT a third-party key: events are kept on this phone (ring buffer).
// Signed-in drafts already record wizardStep / wizardQuestion on the draft row, so staff can see where people stop.
// Sending anonymous events to the server needs [DB] migrations/0004_wizard_events.sql; until then nothing leaves the phone.
// Never put personal data (names, passport, email) in props.
import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "ezvisa.events.v1"; const MAX = 300;
export type Ev = { e: string; at: number; p?: Record<string, string | number | boolean> };
let buf: Ev[] | null = null; let t: ReturnType<typeof setTimeout> | null = null;
async function load() { if (buf) return buf; try { buf = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]"); } catch { buf = []; } return buf!; }
export function track(e: string, p?: Ev["p"]) {
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
