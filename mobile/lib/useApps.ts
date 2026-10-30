import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import type { Application } from "./data";
import { cachedApps, fetchApps, subscribeApps } from "./appsCache";
import { syncReminders } from "./reminders";
import { useDiscarded, visibleApps, discardApplication } from "./discard";

/** Loads the signed-in user's applications (and unread count) on focus.
 *  live: also reload when the app returns to the foreground, and on Supabase Realtime changes to the user's own rows
 *  (filtered by email, the same ownership rule as the query; RLS applies to Realtime too). Realtime only delivers once
 *  visa_applications is in the supabase_realtime publication (migrations/0009 block 2, applied 2026-10-30); focus,
 *  foreground and pull-to-refresh reloads cover the rest. `withUnread` is kept for callers; the count is always ready. */
export function useApps(withUnread = false, live = false) {
  const { session } = useAuth();
  const email = session?.user.email?.toLowerCase() ?? null;
  // The shared list (lib/appsCache.ts) renders at once; a background load refreshes it.
  const first = cachedApps(email);
  const [apps, setApps] = useState<Application[] | null>(first?.apps ?? null);
  const [unread, setUnread] = useState(first?.unread ?? 0);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => subscribeApps((e) => { if (e.email === email) { setApps(e.apps); setUnread(e.unread); } }), [email]);
  const load = useCallback(async (force = false) => {
    if (!email) { setApps(null); setUnread(0); return; }
    setErr(null);
    try {
      const e = await fetchApps(email, force); // one query for every screen; the unread count comes from the same rows
      setApps(e.apps); setUnread(e.unread); syncReminders(e.apps);
    } catch (e: any) { setErr(e?.message ?? String(e)); }
  }, [email]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    if (!live || !email) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const kick = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { loadRef.current(true); }, 400); }; // coalesce bursts
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") kick(); });
    const ch = supabase?.channel(`apps-${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "visa_applications", filter: `email=eq.${email}` }, kick)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); sub.remove(); if (ch) supabase?.removeChannel(ch); };
  }, [live, email]);
  useDiscarded();
  const discard = async (a: Application) => { await discardApplication(a); };
  const refresh = async () => { setRefreshing(true); await load(true); setRefreshing(false); };
  return { session, apps: apps ? visibleApps(apps) : null, allApps: apps, discard, unread, err, refreshing, refresh, load };
}
export const ACTIVE = (s: string) => !["completed", "rejected", "cancelled"].includes(s);
