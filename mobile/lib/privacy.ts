// "Share anonymous usage data" (Account › Privacy). On by default; off means no analytics events and no crash
// reports leave the phone, and anything already queued is deleted. The crash note for a support email is only ever
// sent by the user themselves, so it is kept (scrubbed) either way.
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ezvisa.usage.v1";
let allowed = true; let loaded: Promise<boolean> | null = null;
const listeners = new Set<(on: boolean) => void>();

export function loadUsageSharing() {
  loaded ??= AsyncStorage.getItem(KEY).then((v) => { allowed = v !== "0"; return allowed; }, () => allowed);
  return loaded;
}
/** Synchronous read; true until the saved choice has loaded (callers that send data await loadUsageSharing()). */
export const usageSharingAllowed = () => allowed;
export async function setUsageSharing(on: boolean) {
  allowed = on; loaded = Promise.resolve(on);
  listeners.forEach((l) => l(on));
  await AsyncStorage.setItem(KEY, on ? "1" : "0").catch(() => {});
}
export function onUsageSharingChange(l: (on: boolean) => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function useUsageSharing(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(allowed);
  useEffect(() => { loadUsageSharing().then(setOn); return onUsageSharingChange(setOn); }, []);
  return [on, (v) => { setOn(v); setUsageSharing(v); }];
}
