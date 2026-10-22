// App-wide Appearance preference (System / Light / Dark), persisted in AsyncStorage.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppearancePref = "system" | "light" | "dark";
const KEY = "ezvisa.appearance.v1";
const Ctx = createContext<{ pref: AppearancePref; setPref: (p: AppearancePref) => void; ready: boolean }>({ pref: "system", setPref: () => {}, ready: true });

/** Pushes the override to native so system UI (status bar, pickers, glass, blur, alerts) follows too. */
function applyNative(p: AppearancePref) {
  if (Platform.OS === "web") return;
  try { (Appearance as any).setColorScheme?.(p === "system" ? "unspecified" : p); } catch { /* older RN: ignore */ }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [pref, setState] = useState<AppearancePref>("system"); const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") { setState(v); applyNative(v); }
    }).catch(() => {}).finally(() => setReady(true));
  }, []);
  const setPref = useCallback((p: AppearancePref) => { setState(p); applyNative(p); AsyncStorage.setItem(KEY, p).catch(() => {}); }, []);
  return <Ctx.Provider value={{ pref, setPref, ready }}>{children}</Ctx.Provider>;
}

export const useAppearance = () => useContext(Ctx);

/** Effective scheme: explicit preference wins, otherwise the OS setting. */
export function useScheme(): "light" | "dark" {
  const { pref } = useContext(Ctx); const sys = useColorScheme();
  if (pref !== "system") return pref;
  return sys === "dark" ? "dark" : "light";
}
