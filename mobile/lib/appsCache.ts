// One copy of the signed-in customer's applications for every screen (Home, Applications, Account, Settings, country
// pages, the detail screens). Screens render it at once and refresh in the background; requests made at the same time
// share one query; a load less than FRESH_MS old is reused (pull-to-refresh, Realtime and foregrounding always
// refetch). Memory only: nothing about the customer is written to the phone, and sign-out empties it.
import { listApplications, listNotifications, type Application } from "./data";

const FRESH_MS = 3_000;
type Entry = { email: string; apps: Application[]; unread: number; at: number };
let cache: Entry | null = null;
let inflight: { email: string; p: Promise<Entry> } | null = null;
const listeners = new Set<(e: Entry) => void>();

export const cachedApps = (email?: string | null): Entry | null => (cache && email && cache.email === email.toLowerCase() ? cache : null);
/** The application from the shared list, for a detail screen to show while it loads the full row. */
export const cachedApplication = (id?: string | null, email?: string | null): Application | null =>
  !id ? null : ((email === undefined ? cache : cachedApps(email))?.apps.find((a) => a.id === id) ?? null); // the cache only ever holds the signed-in account
export function subscribeApps(f: (e: Entry) => void) { listeners.add(f); return () => { listeners.delete(f); }; }

function publish(e: Entry) { cache = e; listeners.forEach((f) => f(e)); }

export async function fetchApps(email: string, force = false): Promise<Entry> {
  const key = email.toLowerCase();
  if (!force && cache?.email === key && Date.now() - cache.at < FRESH_MS) return cache;
  if (inflight?.email === key) return inflight.p;
  const p = (async () => {
    const apps = await listApplications();
    const unread = (await listNotifications(apps)).filter((x) => !x.read_at).length;
    const e = { email: key, apps, unread, at: Date.now() }; publish(e); return e;
  })();
  inflight = { email: key, p };
  try { return await p; } finally { if (inflight?.p === p) inflight = null; }
}

/** A detail screen loaded one row: keep the shared list in step (status, documents) without a second query. */
export function putApplication(a: Application, email?: string | null) {
  const c = cachedApps(email); if (!c) return;
  const i = c.apps.findIndex((x) => x.id === a.id); if (i < 0) return;
  const apps = c.apps.slice(); apps[i] = a; publish({ ...c, apps });
}

/** Sign-out (lib/userData.ts): the next account starts empty. */
export function resetAppsCache() { cache = null; inflight = null; }
