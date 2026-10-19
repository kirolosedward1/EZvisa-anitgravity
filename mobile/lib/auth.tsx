import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";
import { setupPush } from "./push";

const Ctx = createContext<{ session: Session | null; loading: boolean; pushStatus: string }>({ session: null, loading: true, pushStatus: "" });
export const useAuth = () => useContext(Ctx);

async function handleUrl(url: string | null) {
  if (!url || !supabase) return;
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code as string | undefined;
  if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => {});
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [pushStatus, setPushStatus] = useState("");
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    Linking.getInitialURL().then(handleUrl);
    const l = Linking.addEventListener("url", (e) => handleUrl(e.url));
    return () => { sub.subscription.unsubscribe(); l.remove(); };
  }, []);
  const uid = session?.user.id;
  useEffect(() => { if (uid) setupPush().then(setPushStatus); }, [uid]);
  return <Ctx.Provider value={{ session, loading, pushStatus }}>{children}</Ctx.Provider>;
}
