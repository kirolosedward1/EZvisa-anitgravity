import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { listApplications, listNotifications, Application } from "./data";
import { syncReminders } from "./reminders";
import { useDiscarded, visibleApps, discardApplication } from "./discard";

/** Loads the signed-in user's applications (and unread count) on focus.
 *  live: also reload when the app returns to the foreground, and on Supabase Realtime changes to the user's own rows
 *  (filtered by email, the same ownership rule as the query; RLS applies to Realtime too). Realtime only delivers once
 *  visa_applications is in the supabase_realtime publication (migrations/0008, waiting for approval); until then the
 *  focus / foreground / pull-to-refresh reloads keep the screen current. */
export function useApps(withUnread = false, live = false) {
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
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  const email = session?.user.email?.toLowerCase() ?? null;
  useEffect(() => {
    if (!live || !email) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const kick = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { loadRef.current(); }, 400); }; // coalesce bursts
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") kick(); });
    const ch = supabase?.channel(`apps-${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "visa_applications", filter: `email=eq.${email}` }, kick)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); sub.remove(); if (ch) supabase?.removeChannel(ch); };
  }, [live, email]);
  useDiscarded();
  const discard = async (a: Application) => { await discardApplication(a); };
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  return { session, apps: apps ? visibleApps(apps) : null, allApps: apps, discard, unread, err, refreshing, refresh, load };
}
export const ACTIVE = (s: string) => !["completed", "rejected", "cancelled"].includes(s);
