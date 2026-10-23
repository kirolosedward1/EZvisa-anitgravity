// Tiny i18n layer: English is the key (so the wizard keeps the website's exact English labels), Arabic comes from lib/ar.ts.
// Switching language flips RTL with I18nManager and reloads the JS (expo-updates reloadAsync), which works in Expo Go.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { I18nManager, Platform, DevSettings } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { AR } from "./ar";

export type Lang = "en" | "ar";
const KEY = "ezvisa.lang.v1";
type Vars = Record<string, string | number>;
const fill = (s: string, v?: Vars) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? String(v[k]) : `{${k}}`)) : s);
/** Translate an English string (falls back to English when there is no Arabic entry). */
export const translate = (lang: Lang, s: string, v?: Vars) => fill(lang === "ar" ? AR[s] ?? s : s, v);

type Ctx = { lang: Lang; rtl: boolean; ready: boolean; t: (s: string, v?: Vars) => string; setLang: (l: Lang) => Promise<void> };
const C = createContext<Ctx>({ lang: "en", rtl: false, ready: true, t: (s, v) => fill(s, v), setLang: async () => {} });

function applyDir(l: Lang) {
  const rtl = l === "ar";
  if (Platform.OS === "web") { if (typeof document !== "undefined") { document.documentElement.dir = rtl ? "rtl" : "ltr"; document.documentElement.lang = l; } return; }
  I18nManager.allowRTL(true); I18nManager.forceRTL(rtl);
}
async function reload() {
  if (Platform.OS === "web") { if (typeof window !== "undefined") window.location.reload(); return; }
  try { await Updates.reloadAsync(); } catch { try { DevSettings.reload(); } catch { /* user restarts the app */ } }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setState] = useState<Lang>("en"); const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(async (v) => {
      const l: Lang = v === "ar" ? "ar" : "en";
      setState(l);
      if (Platform.OS === "web") applyDir(l);
      else if (I18nManager.isRTL !== (l === "ar")) {
        // Stored language and layout direction disagree (e.g. first start after choosing Arabic): apply and reload now,
        // at most once per 15 s so a platform that ignores forceRTL can never loop.
        applyDir(l);
        const last = Number(await AsyncStorage.getItem(KEY + ".dirfix").catch(() => null)) || 0;
        if (Date.now() - last > 15000) { await AsyncStorage.setItem(KEY + ".dirfix", String(Date.now())).catch(() => {}); await reload(); return; }
      }
      setReady(true);
    }).catch(() => setReady(true));
  }, []);
  const setLang = useCallback(async (l: Lang) => {
    await AsyncStorage.setItem(KEY, l).catch(() => {});
    setState(l); applyDir(l);
    const needsReload = Platform.OS === "web" || I18nManager.isRTL !== (l === "ar");
    if (needsReload) await reload();
  }, []);
  const t = useCallback((s: string, v?: Vars) => translate(lang, s, v), [lang]);
  return <C.Provider value={{ lang, rtl: lang === "ar", ready, t, setLang }}>{children}</C.Provider>;
}
export const useT = () => useContext(C);

/** Wraps IDs and amounts in Unicode first-strong isolates so they keep LTR order inside Arabic text ("إيصال · ⁨EZ-36218265⁩"). */
export const ltr = (s: string | number | null | undefined) => (s == null || s === "" ? "" : `\u2068${s}\u2069`);
