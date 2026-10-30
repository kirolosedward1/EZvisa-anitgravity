// "Globi animations" (Settings › Appearance, canvas Appearance.dc.html). On by default; iOS Reduce Motion always wins
// and shows the still frame (GlobiPose reads both). Persisted on the phone only.
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ezvisa.globi-animations.v1";
let value = true;
let loaded = false;
const subs = new Set<(v: boolean) => void>();

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY).then((v) => { if (v === "off") set(false, false); }).catch(() => {});
}
function set(v: boolean, persist = true) {
  value = v;
  subs.forEach((f) => f(v));
  if (persist) AsyncStorage.setItem(KEY, v ? "on" : "off").catch(() => {});
}

export const setGlobiAnimations = (on: boolean) => set(on);

/** The user's in-app choice (not Reduce Motion). */
export function useGlobiAnimations() {
  const [v, setV] = useState(value);
  useEffect(() => { load(); subs.add(setV); setV(value); return () => { subs.delete(setV); }; }, []);
  return v;
}
