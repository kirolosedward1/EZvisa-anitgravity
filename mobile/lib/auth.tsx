// Session state for the whole app.
// - The session lives in SecureStore (lib/supabase.ts) and refreshes itself while the app is in the foreground.
// - On launch and whenever the app comes back to the foreground, the session is checked with the server. If the server
//   rejects it (user deleted, password changed on the website, session revoked), the app refreshes once; if that fails too
//   it signs out locally with a short message. Offline never signs anyone out.
// - Sign-out ends this device's session only (the website stays signed in) and wipes the person's data from the phone.
// - "guest" is the in-memory choice to continue without an account (guest checkout). It is not saved: every cold start
//   without a session shows the sign-in screens first.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { isAuthApiError } from "@supabase/supabase-js";
import { supabase, AUTH_STORAGE_KEY } from "./supabase";
import { secureStorage } from "./secureStorage";
import { setupPush } from "./push";
import { unregisterPushToken } from "./data";
import { clearUserData } from "./userData";
import { AUTH_MESSAGE } from "./authErrors";

type Ctx = {
  session: Session | null; loading: boolean; pushStatus: string;
  guest: boolean; continueAsGuest: () => void;
  /** Short message for the sign-in screen (e.g. the session ended), cleared once shown. */
  notice: string | null; clearNotice: () => void;
  /** Set while a password-reset link has signed the user in and a new password is still to be chosen. */
  recovery: boolean; setRecovery: (v: boolean) => void;
  /** `everywhere`: also ends the account's sessions on every other phone and browser (needs a connection; throws offline). */
  signOut: (o?: { everywhere?: boolean }) => Promise<void>;
  /** Bumps on every sign-out so providers holding user data in memory can reset. */
  epoch: number;
};
const C = createContext<Ctx>({ session: null, loading: true, pushStatus: "", guest: false, continueAsGuest: () => {}, notice: null, clearNotice: () => {}, recovery: false, setRecovery: () => {}, signOut: async () => {}, epoch: 0 });
export const useAuth = () => useContext(C);

const CHECK_EVERY_MS = 60_000;
const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);

/** Removes the session from this phone even when the server can't be reached. */
async function signOutLocally() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (!error) return;
  // Offline (or a server error): drop the stored tokens ourselves, then let supabase-js clear its state and emit SIGNED_OUT.
  await Promise.all([AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-code-verifier`, `${AUTH_STORAGE_KEY}-user`].map((k) => secureStorage.removeItem(k).catch(() => {})));
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [pushStatus, setPushStatus] = useState("");
  const [guest, setGuest] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const had = useRef(false); // a session existed in this run
  const lastUid = useRef<string | null>(null); // account whose data this phone holds
  const starting = useRef(true); // a SIGNED_OUT before getSession() resolves means the stored session could not be restored
  const leaving = useRef(false); // the user pressed Sign out (no "session ended" message)
  const lastCheck = useRef(0); const checking = useRef(false);

  /** Wipes the person's data after any sign-out, intended or not. */
  const afterSignOut = useCallback(async (ended: boolean) => {
    await clearUserData();
    setGuest(false); setRecovery(false); setEpoch((n) => n + 1);
    if (ended) setNotice(AUTH_MESSAGE["session-ended"]);
  }, []);

  /** Server check: does this session still exist? Refresh once, otherwise sign out locally. Offline keeps the session. */
  const check = useCallback(async (force = false) => {
    if (!supabase || checking.current) return;
    if (!force && Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    checking.current = true; lastCheck.current = Date.now();
    try {
      const first = await supabase.auth.getUser();
      if (!first.error) return;
      if (!isAuthApiError(first.error) || first.error.status >= 500) return; // offline or server trouble: keep the session
      const r = await supabase.auth.refreshSession();
      if (r.error && (!isAuthApiError(r.error) || r.error.status >= 500)) return;
      if (!r.error && r.data.session) { const again = await supabase.auth.getUser(); if (!again.error || !isAuthApiError(again.error)) return; }
      await signOutLocally(); // emits SIGNED_OUT -> afterSignOut(true)
    } finally { checking.current = false; }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let on = true;
    supabase.auth.getSession().then(({ data }) => {
      starting.current = false;
      if (!on) return;
      setSession(data.session); had.current = !!data.session; setLoading(false);
      if (data.session) lastUid.current = data.session.user.id;
      if (data.session) check(true);
    }).catch(() => { starting.current = false; if (on) setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Another account signed in without a sign-out first (e.g. an email link for account B opened while A was
      // signed in): Supabase emits SIGNED_IN, never SIGNED_OUT, so wipe A's data on this phone here.
      if (s && lastUid.current && s.user.id !== lastUid.current) {
        setTimeout(() => { void clearUserData().then(() => setEpoch((n) => n + 1)); }, 0);
      }
      if (s) lastUid.current = s.user.id;
      else if (event === "SIGNED_OUT") lastUid.current = null;
      setSession(s);
      if (s) { had.current = true; setGuest(false); }
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") {
        const ended = (had.current || starting.current) && !leaving.current; had.current = false;
        setTimeout(() => { afterSignOut(ended); }, 0); // never call Supabase inside this callback
      }
    });
    const app = AppState.addEventListener("change", (st) => { if (st === "active") check(); });
    return () => { on = false; sub.subscription.unsubscribe(); app.remove(); };
  }, [check, afterSignOut]);

  const uid = session?.user.id;
  useEffect(() => { if (uid) setupPush().then(setPushStatus); }, [uid]);

  const continueAsGuest = useCallback(() => setGuest(true), []);
  const clearNotice = useCallback(() => setNotice(null), []);
  const signOut = useCallback(async (o?: { everywhere?: boolean }) => {
    if (!supabase) return;
    leaving.current = true;
    try {
      await withTimeout(unregisterPushToken().catch(() => {}), 3000); // needs the session, so before signing out
      if (o?.everywhere) {
        // Revokes every refresh token of the account; other devices lose access when their current token runs out (≤ 1 hour).
        const { error } = await supabase.auth.signOut({ scope: "global" });
        if (error) throw error;
      }
      await signOutLocally();
    } finally { leaving.current = false; }
  }, []);

  return (
    <C.Provider value={{ session, loading, pushStatus, guest, continueAsGuest, notice, clearNotice, recovery, setRecovery, signOut, epoch }}>
      {children}
    </C.Provider>
  );
}
