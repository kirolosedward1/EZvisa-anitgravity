import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "./auth";
import { listApplications, listNotifications, Application } from "./data";
import { syncReminders } from "./reminders";
import { useDiscarded, visibleApps, discardApplication } from "./discard";

/** Loads the signed-in user's applications (and unread count) on focus. */
export function useApps(withUnread = false) {
  const { session } = useAuth();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!session) { setApps(null); setUnread(0); return; }
    setErr(null);
    try {
      const a = await listApplications(); // one query; the unread count is derived from the same rows
      const n = withUnread ? await listNotifications(a) : [];
      setApps(a); setUnread(n.filter((x) => !x.read_at).length); syncReminders(a);
    } catch (e: any) { setErr(e?.message ?? String(e)); }
  }, [session, withUnread]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useDiscarded();
  const discard = async (a: Application) => { await discardApplication(a); };
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  return { session, apps: apps ? visibleApps(apps) : null, allApps: apps, discard, unread, err, refreshing, refresh, load };
}
export const ACTIVE = (s: string) => !["completed", "rejected", "cancelled"].includes(s);
