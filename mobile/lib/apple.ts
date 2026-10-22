// Sign in with Apple (expo-apple-authentication -> Supabase signInWithIdToken). iOS only.
// In Expo Go the identity token is issued for Expo Go's bundle id (host.exp.Exponent), so Supabase must list that id
// (and net.ezvisa.app for the real build) under Auth -> Providers -> Apple -> Client IDs. The button stays hidden while the
// Apple provider is disabled on the live project (it is today).
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export async function appleEnabled(): Promise<boolean> {
  if (Platform.OS !== "ios" || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    if (!(await AppleAuthentication.isAvailableAsync())) return false;
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } }); const j = await r.json();
    return j?.external?.apple === true;
  } catch { return false; }
}
export async function signInWithApple(): Promise<"ok" | "cancel"> {
  if (!supabase) throw new Error("Sign-in isn't configured.");
  const raw = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  try {
    const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed });
    if (!cred.identityToken) throw new Error("Apple didn't return a sign-in token.");
    const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken, nonce: raw });
    if (error) throw error;
    const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ");
    if (name) await supabase.auth.updateUser({ data: { full_name: name } }).catch(() => {});
    return "ok";
  } catch (e: any) { if (e?.code === "ERR_REQUEST_CANCELED") return "cancel"; throw e; }
}
