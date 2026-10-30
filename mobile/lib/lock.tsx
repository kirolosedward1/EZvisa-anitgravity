// Optional Face ID / Touch ID lock (expo-local-authentication, works in Expo Go). When on, the app asks for biometrics at
// launch and when it comes back after the chosen time in the background (default 1 min). The app-switcher snapshot is blurred. Off by default; the session is untouched.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { BlurView } from "expo-blur";
import { Button, Icon, Text } from "../components/ui";
import { GlobiPose } from "../components/globi/GlobiPose";
import { Logo } from "../components/Logo";
import { useColors, S } from "./theme";
import { useT } from "./i18n";
import { useAuth } from "./auth";

const KEY = "ezvisa.lock.v1"; const AFTER_KEY = "ezvisa.lock.after.v1";
/** Lock after this long in the background (ms). 0 = immediately. */
export const LOCK_AFTER = [0, 60_000, 300_000, 900_000] as const;
export async function lockAfter(): Promise<number> { const v = Number(await AsyncStorage.getItem(AFTER_KEY)); return (LOCK_AFTER as readonly number[]).includes(v) ? v : 60_000; }
export async function setLockAfter(ms: number) { await AsyncStorage.setItem(AFTER_KEY, String(ms)); }
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
  const [shield, setShield] = useState(false); // privacy cover for the app switcher
  const on = useRef(false);
  const unlock = useCallback(async () => {
    if (asking.current) return; asking.current = true;
    try { if (await authenticate(t("Unlock EZvisa"))) setLocked(false); } finally { asking.current = false; }
  }, [t]);
  useEffect(() => {
    if (!session) { setLocked(false); return; }
    lockEnabled().then((v) => { on.current = v; if (v) { setLocked(true); biometricLabel().then((l) => l && setLabel(l)); } });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "inactive" || s === "background") { lockEnabled().then((v) => { on.current = v; if (v) setShield(true); }); if (s === "background") away.current = Date.now(); }
      if (s === "active") {
        setShield(false);
        const gone = away.current ? Date.now() - away.current : -1; away.current = null;
        if (gone >= 0) Promise.all([lockEnabled(), lockAfter()]).then(([v, ms]) => v && gone >= ms && setLocked(true));
      }
    });
    return () => sub.remove();
  }, [!!session]);
  useEffect(() => { if (locked) unlock(); }, [locked]);
  if (!locked && shield) return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 950 }]} pointerEvents="none">
      <BlurView intensity={60} tint="systemThickMaterial" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}><Logo height={30} /></BlurView>
    </View>
  );
  if (!locked) return null;
  return <LockScreen label={label} onUnlock={unlock} />;
}

/** The lock overlay itself (exported for the development gallery). */
export function LockScreen({ label, onUnlock }: { label: string; onUnlock: () => void }) {
  const c = useColors(); const { t } = useT(); const unlock = onUnlock;
  // Canvas FaceIDLock.dc.html: the app is blurred behind a canvas-tinted veil (nothing readable), Globi with a Face ID
  // badge, the title, and "Unlock" / "Use passcode". iOS offers the device passcode in the same system prompt.
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 900 }]} accessibilityViewIsModal testID="lock-gate">
      <BlurView intensity={80} tint="systemThickMaterialLight" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: 0.6 }]} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: S.xl, paddingHorizontal: S.xxl }}>
        <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
          <GlobiPose pose="lock" size={153} animated={false} />
          <View style={{ position: "absolute", end: 6, bottom: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}>
            <Icon name="faceid" size={24} color={c.accent} />
          </View>
        </View>
        <View style={{ gap: S.xs, alignItems: "center" }}>
          <Text variant="resultTitle" center accessibilityRole="header" style={{ fontSize: 22 }}>{t("EZvisa is locked")}</Text>
          <Text variant="body" tone="secondary" center>{t("Unlock to see your applications.")}</Text>
        </View>
        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Button title={t("Unlock with {m}", { m: t(label) })} onPress={unlock} />
          <Button title={t("Use passcode")} variant="plain" size="M" color={c.label} onPress={unlock} />
        </View>
      </View>
    </View>
  );
}
