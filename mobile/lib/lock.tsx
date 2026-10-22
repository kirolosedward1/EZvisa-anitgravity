// Optional app lock (expo-local-authentication, works in Expo Go). When on, the app asks for Face ID / Touch ID / fingerprint,
// falling back to the device passcode, at launch and when it comes back after the chosen time in the background (default 1 min).
// Phones with only a passcode can use it too. While the lock is on, an opaque cover hides the screen in the app switcher.
// Off by default; the Supabase session is untouched. If the phone no longer has any biometrics or passcode, the only way
// past the lock is to sign out (and sign in again with the account password).
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { Button, Icon, Text } from "../components/ui";
import { Logo } from "../components/Logo";
import { useColors, S } from "./theme";
import { useT } from "./i18n";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { unregisterPushToken } from "./data";

const KEY = "ezvisa.lock.v1"; const AFTER_KEY = "ezvisa.lock.after.v1";
/** Lock after this long in the background (ms). 0 = immediately. */
export const LOCK_AFTER = [0, 60_000, 300_000, 900_000] as const;
export async function lockAfter(): Promise<number> { const v = Number(await AsyncStorage.getItem(AFTER_KEY)); return (LOCK_AFTER as readonly number[]).includes(v) ? v : 60_000; }
export async function setLockAfter(ms: number) { await AsyncStorage.setItem(AFTER_KEY, String(ms)); }
export const lockSupported = Platform.OS !== "web";
export async function lockEnabled() { return lockSupported && (await AsyncStorage.getItem(KEY)) === "on"; }
/** "Face ID", "Touch ID", "Face unlock", "Fingerprint", "Passcode" (no biometrics, but a passcode/PIN is set) or null (nothing set). */
export async function biometricLabel(): Promise<string | null> {
  if (!lockSupported) return null;
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) return null;
    if (level === LocalAuthentication.SecurityLevel.SECRET) return "Passcode";
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return Platform.OS === "ios" ? "Face ID" : "Face unlock";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    return "Passcode";
  } catch { return null; }
}
export type AuthResult = "ok" | "cancelled" | "unavailable";
/** Biometrics with the device passcode as fallback (iOS shows "Use passcode" after a failed Face ID; Android offers the PIN). */
export async function authenticate(prompt: string, labels?: { fallback: string; cancel: string }): Promise<AuthResult> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, fallbackLabel: labels?.fallback, cancelLabel: labels?.cancel, disableDeviceFallback: false });
    if (r.success) return "ok";
    return r.error === "not_enrolled" || r.error === "passcode_not_set" || r.error === "not_available" ? "unavailable" : "cancelled";
  } catch { return "unavailable"; }
}
export async function setLockEnabled(on: boolean, prompt: string, labels?: { fallback: string; cancel: string }): Promise<boolean> {
  if (on) { if (!(await biometricLabel())) return false; if ((await authenticate(prompt, labels)) !== "ok") return false; }
  await AsyncStorage.setItem(KEY, on ? "on" : "off"); return on;
}

type State = "checking" | "open" | "locked" | "unavailable";
export function LockGate() {
  const c = useColors(); const { t } = useT(); const { session } = useAuth();
  // The lock state belongs to one signed-in user; until it has been read for this user, nothing personal is drawn.
  const uid = session?.user.id ?? null;
  const [st, setSt] = useState<{ uid: string | null; s: State }>({ uid: null, s: "open" });
  const state: State = !uid ? "open" : st.uid === uid ? st.s : "checking";
  const setState = useCallback((s: State | ((p: State) => State)) => setSt((p) => ({ uid, s: typeof s === "function" ? s(p.uid === uid ? p.s : "checking") : s })), [uid]);
  const [label, setLabel] = useState("Face ID");
  const away = useRef<number | null>(null); const asking = useRef(false);
  const [shield, setShield] = useState(false); // opaque cover so the app-switcher snapshot shows no personal data
  const labels = { fallback: t("Use passcode"), cancel: t("Cancel") };
  const unlock = useCallback(async () => {
    if (asking.current) return; asking.current = true;
    try {
      const l = await biometricLabel();
      if (!l) { setState("unavailable"); return; } // biometrics and passcode were removed from the phone
      setLabel(l);
      const r = await authenticate(t("Unlock EZvisa"), labels);
      if (r === "ok") setState("open"); else if (r === "unavailable") setState("unavailable");
    } finally { asking.current = false; }
  }, [t, setState]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!uid) return;
    lockEnabled().then((v) => setState(v ? "locked" : "open"));
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "inactive" || s === "background") { lockEnabled().then((v) => { if (v) setShield(true); }); if (s === "background") away.current = Date.now(); }
      if (s === "active") {
        setShield(false);
        const gone = away.current ? Date.now() - away.current : -1; away.current = null;
        if (gone >= 0) Promise.all([lockEnabled(), lockAfter()]).then(([v, ms]) => { if (v && gone >= ms) setState((p) => (p === "unavailable" ? p : "locked")); });
      }
    });
    return () => { sub.remove(); setShield(false); };
  }, [uid, setState]);
  useEffect(() => { if (state === "locked") unlock(); }, [state, unlock]);
  const signOut = () => { unregisterPushToken().finally(() => supabase?.auth.signOut()); };
  const cover = (children?: React.ReactNode, z = 900) => (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: S.lg, zIndex: z, padding: S.xl }]} accessibilityViewIsModal={!!children} pointerEvents={children ? "auto" : "none"}>
      <Logo height={30} />
      {children}
    </View>
  );
  if (state === "checking") return cover();
  if (state === "open") return shield ? cover(undefined, 950) : null;
  if (state === "unavailable") return cover(<>
    <Icon name="lock.fill" size={44} color={c.tint} />
    <Text variant="title3" center accessibilityRole="header">{t("EZvisa is locked")}</Text>
    <Text variant="subhead" tone="secondary" center>{t("Face ID, Touch ID and the passcode are off on this phone, so EZvisa can't confirm it's you. Sign out, then sign in again with your password.")}</Text>
    <View style={{ alignSelf: "stretch", gap: S.xs }}>
      <Button title={t("Sign out")} onPress={signOut} />
      <Button title={t("Try again")} variant="plain" onPress={() => setState("locked")} />
    </View>
  </>);
  return cover(<>
    <Icon name={label === "Passcode" ? "lock.fill" : "faceid"} size={44} color={c.tint} />
    <Text variant="title3" center accessibilityRole="header">{t("EZvisa is locked")}</Text>
    <View style={{ alignSelf: "stretch", gap: S.xs }}>
      <Button title={t("Unlock with {m}", { m: t(label) })} onPress={unlock} />
      <Button title={t("Sign out")} variant="plain" color={c.label} onPress={signOut} />
    </View>
  </>);
}
