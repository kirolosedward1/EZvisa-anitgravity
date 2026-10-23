// App-wide Appearance preference (System / Light / Dark), persisted in AsyncStorage. Light is the default until the user picks another.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppearancePref = "system" | "light" | "dark";
const KEY = "ezvisa.appearance.v1";
const Ctx = createContext<{ pref: AppearancePref; setPref: (p: AppearancePref) => void; ready: boolean }>({ pref: "light", setPref: () => {}, ready: true });

/** Pushes the override to native so system UI (status bar, pickers, glass, blur, alerts) follows too. */
function applyNative(p: AppearancePref) {
  if (Platform.OS === "web") return;
  try { (Appearance as any).setColorScheme?.(p === "system" ? "unspecified" : p); } catch { /* older RN: ignore */ }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [pref, setState] = useState<AppearancePref>("light"); const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      const p: AppearancePref = v === "dark" || v === "system" ? v : "light";
      setState(p); applyNative(p);
    }).catch(() => applyNative("light")).finally(() => setReady(true));
  }, []);
  const setPref = useCallback((p: AppearancePref) => { setState(p); applyNative("light"); AsyncStorage.setItem(KEY, "light").catch(() => {}); }, []);
  return <Ctx.Provider value={{ pref, setPref, ready }}>{children}</Ctx.Provider>;
}

export const useAppearance = () => useContext(Ctx);

/** Effective scheme: explicit preference wins, otherwise the OS setting. */
// Light only (product rule: no dark mode).
export function useScheme(): "light" | "dark" { return "light"; }
