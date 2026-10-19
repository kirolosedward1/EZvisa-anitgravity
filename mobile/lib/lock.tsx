// Optional Face ID / Touch ID lock (expo-local-authentication, works in Expo Go). When on, the app asks for biometrics at
// launch and when it comes back after more than 60 seconds in the background. Off by default; the session is untouched.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { Button, Icon, Text } from "../components/ui";
import { Logo } from "../components/Logo";
import { useColors, S } from "./theme";
import { useT } from "./i18n";
import { useAuth } from "./auth";

const KEY = "ezvisa.lock.v1"; const AWAY_MS = 60_000;
export const lockSupported = Platform.OS !== "web";
export async function lockEnabled() { return lockSupported && (await AsyncStorage.getItem(KEY)) === "on"; }
/** "Face ID", "Touch ID", "Fingerprint" or null when the device has no enrolled biometrics. */
export async function biometricLabel(): Promise<string | null> {
  if (!lockSupported) return null;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return Platform.OS === "ios" ? "Face ID" : "Face unlock";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    return "Passcode";
  } catch { return null; }
}
export async function authenticate(prompt: string) {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, fallbackLabel: "Use passcode", disableDeviceFallback: false });
  return r.success;
}
export async function setLockEnabled(on: boolean, prompt: string): Promise<boolean> {
  if (on) { if (!(await biometricLabel())) return false; if (!(await authenticate(prompt))) return false; }
  await AsyncStorage.setItem(KEY, on ? "on" : "off"); return on;
}

export function LockGate() {
  const c = useColors(); const { t } = useT(); const { session } = useAuth();
  const [locked, setLocked] = useState(false); const [label, setLabel] = useState("Face ID");
  const away = useRef<number | null>(null); const asking = useRef(false);
  const unlock = useCallback(async () => {
    if (asking.current) return; asking.current = true;
    try { if (await authenticate(t("Unlock EZvisa"))) setLocked(false); } finally { asking.current = false; }
  }, [t]);
  useEffect(() => {
    if (!session) { setLocked(false); return; }
    lockEnabled().then((on) => { if (on) { setLocked(true); biometricLabel().then((l) => l && setLabel(l)); } });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") away.current = Date.now();
      if (s === "active" && away.current && Date.now() - away.current > AWAY_MS) lockEnabled().then((on) => on && setLocked(true));
    });
    return () => sub.remove();
  }, [!!session]);
  useEffect(() => { if (locked) unlock(); }, [locked]);
  if (!locked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: S.lg, zIndex: 900, padding: S.xl }]} accessibilityViewIsModal>
      <Logo height={30} />
      <Icon name="faceid" size={44} color={c.tint} />
      <Text variant="title3" center accessibilityRole="header">{t("EZvisa is locked")}</Text>
      <View style={{ alignSelf: "stretch" }}><Button title={t("Unlock with {m}", { m: t(label) })} onPress={unlock} /></View>
    </View>
  );
}
