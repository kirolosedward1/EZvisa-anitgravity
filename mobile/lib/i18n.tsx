// Tiny i18n layer: English is the key (so the wizard keeps the website's exact English labels), Arabic comes from lib/ar.ts.
// Kept instead of i18next: ~750 strings are already keyed by their English text and nothing needs namespaces or plurals yet.
// First launch follows the phone language (expo-localization); after that the choice in Account wins.
// Switching language flips RTL with I18nManager and reloads the JS (expo-updates reloadAsync), which works in Expo Go.
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { I18nManager, Platform, DevSettings } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { getLocales } from "expo-localization";
import { AR } from "./ar";

export type Lang = "en" | "ar";
const KEY = "ezvisa.lang.v1"; const RELOADED_KEY = "ezvisa.lang.dir-reload.v1";
type Vars = Record<string, string | number>;
const fill = (s: string, v?: Vars) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? String(v[k]) : `{${k}}`)) : s);
/** Translate an English string (falls back to English when there is no Arabic entry). */
export const translate = (lang: Lang, s: string, v?: Vars) => fill(lang === "ar" ? AR[s] ?? s : s, v);
/** Keeps a Latin run (reference, passport number, email, phone, amount) left-to-right inside Arabic text (Unicode LRI…PDI). */
export const ltr = (s: string) => (s ? `⁦${s}⁩` : s);
/** Phone language when the user has not picked one: Arabic for any `ar` locale, otherwise English. */
export function deviceLang(): Lang {
  try { return getLocales()[0]?.languageCode === "ar" ? "ar" : "en"; } catch { return "en"; }
}

type Ctx = { lang: Lang; rtl: boolean; ready: boolean; t: (s: string, v?: Vars) => string; setLang: (l: Lang) => Promise<void> };
const C = createContext<Ctx>({ lang: "en", rtl: false, ready: true, t: (s, v) => fill(s, v), setLang: async () => {} });

function applyDir(l: Lang) {
  const rtl = l === "ar";
  if (Platform.OS === "web") { if (typeof document !== "undefined") { document.documentElement.dir = rtl ? "rtl" : "ltr"; document.documentElement.lang = l; } return; }
  I18nManager.allowRTL(rtl); I18nManager.forceRTL(rtl);
}
async function reload() {
  if (Platform.OS === "web") { if (typeof window !== "undefined") window.location.reload(); return; }
  try { await Updates.reloadAsync(); } catch { try { DevSettings.reload(); } catch { /* user restarts the app */ } }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setState] = useState<Lang>("en"); const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem(KEY).catch(() => null);
      const l: Lang = v === "ar" || v === "en" ? v : deviceLang();
      setState(l);
      if (Platform.OS === "web") { applyDir(l); return; }
      if (I18nManager.isRTL === (l === "ar")) { await AsyncStorage.removeItem(RELOADED_KEY).catch(() => {}); return; }
      applyDir(l);
      // Direction only changes after a JS reload. Do it once, while the splash is still up, so the first screen is already
      // mirrored. The flag stops a reload loop if the platform ignores forceRTL; then it applies on the next cold start.
      if ((await AsyncStorage.getItem(RELOADED_KEY).catch(() => null)) !== l) {
        await AsyncStorage.setItem(RELOADED_KEY, l).catch(() => {});
        await reload();
      }
    })().catch(() => {}).finally(() => setReady(true));
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
