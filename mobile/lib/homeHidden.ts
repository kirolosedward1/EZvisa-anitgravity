// Applications the customer hid from Home with the × (Home only: they stay in the Applications tab, nothing changes on
// the server). Kept on this phone per Home item key (s:<id> for an application, l:<key> for a phone draft); emptied on
// sign-out (lib/userData.ts USER_KEYS).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export const HOME_HIDDEN_KEY = "ezvisa.homeHidden.v1";
let keys = new Set<string>(); let loaded = false; const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const save = () => { AsyncStorage.setItem(HOME_HIDDEN_KEY, JSON.stringify([...keys].slice(-200))).catch(() => {}); };
async function hydrate() { if (loaded) return; loaded = true; try { const r = await AsyncStorage.getItem(HOME_HIDDEN_KEY); if (r) keys = new Set(JSON.parse(r)); } catch {} emit(); }

export function hideFromHome(key: string) { keys = new Set(keys).add(key); save(); emit(); }
export function showOnHome(key: string) { if (!keys.has(key)) return; keys = new Set(keys); keys.delete(key); save(); emit(); }
export function resetHomeHidden() { keys = new Set(); loaded = false; emit(); }

/** The hidden keys; re-renders when they change. */
export function useHomeHidden(): Set<string> {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); hydrate(); return () => { subs.delete(f); }; }, []);
  return keys;
}
