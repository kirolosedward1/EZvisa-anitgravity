// Supabase auth storage backed by the iOS Keychain / Android Keystore (expo-secure-store). Tokens never go to AsyncStorage.
// SecureStore warns above 2048 bytes per value and a Supabase session (two JWTs + the user) is usually 3-5 KB, so values
// are split into chunks of at most CHUNK_BYTES (UTF-8). Each write uses a fresh generation suffix and swaps the header
// last, so an app killed mid-write still has the previous complete value.
// Older builds kept the session in AsyncStorage: the first read moves it here and deletes the old copy, so nobody is signed out.
// Web (testing only) has no SecureStore and uses the browser's localStorage.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const CHUNK_BYTES = 1800;
const HEAD = "ezc1:"; // header value: ezc1:<generation>:<count>
// Readable after the first unlock (so a background refresh works) and never restored onto another device from a backup.
const OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

const safeKey = (k: string) => k.replace(/[^\w.-]/g, "_");
const chunkKey = (k: string, gen: string, i: number) => `${k}.${gen}.${i}`;
const utf8Len = (code: number) => (code < 0x80 ? 1 : code < 0x800 ? 2 : code >= 0xd800 && code <= 0xdbff ? 4 : code >= 0xdc00 && code <= 0xdfff ? 0 : 3);

/** Splits on character boundaries so no chunk exceeds `max` UTF-8 bytes (surrogate pairs stay together). */
export function splitUtf8(value: string, max = CHUNK_BYTES): string[] {
  const out: string[] = []; let start = 0; let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const n = utf8Len(value.charCodeAt(i));
    if (bytes + n > max && i > start && n > 0) { out.push(value.slice(start, i)); start = i; bytes = 0; }
    bytes += n;
  }
  out.push(value.slice(start));
  return out;
}

const parseHead = (v: string | null) => {
  if (!v?.startsWith(HEAD)) return null;
  const [gen, n] = v.slice(HEAD.length).split(":");
  const count = Number(n);
  return gen && Number.isInteger(count) && count > 0 ? { gen, count } : null;
};

async function readSecure(key: string): Promise<string | null> {
  const head = await SecureStore.getItemAsync(key, OPTS);
  const h = parseHead(head);
  if (!h) return head; // small value stored whole (or nothing)
  const parts = await Promise.all(Array.from({ length: h.count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, h.gen, i), OPTS)));
  return parts.some((p) => p === null) ? null : parts.join("");
}
async function dropChunks(key: string, head: string | null) {
  const h = parseHead(head);
  if (h) await Promise.all(Array.from({ length: h.count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, h.gen, i), OPTS).catch(() => {})));
}
async function writeSecure(key: string, value: string) {
  const old = await SecureStore.getItemAsync(key, OPTS).catch(() => null);
  const parts = splitUtf8(value);
  if (parts.length === 1 && !value.startsWith(HEAD)) await SecureStore.setItemAsync(key, value, OPTS);
  else {
    const gen = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(chunkKey(key, gen, i), parts[i], OPTS);
    await SecureStore.setItemAsync(key, `${HEAD}${gen}:${parts.length}`, OPTS);
  }
  await dropChunks(key, old);
}
async function removeSecure(key: string) {
  const old = await SecureStore.getItemAsync(key, OPTS).catch(() => null);
  await SecureStore.deleteItemAsync(key, OPTS).catch(() => {});
  await dropChunks(key, old);
}

const webStore = () => (typeof window !== "undefined" && window.localStorage ? window.localStorage : null);

/** Storage adapter for supabase-js (`auth.storage`). */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return webStore()?.getItem(key) ?? null;
    const k = safeKey(key);
    const v = await readSecure(k);
    if (v !== null) return v;
    // One-time move from the old AsyncStorage location.
    const legacy = await AsyncStorage.getItem(key).catch(() => null);
    if (legacy === null) return null;
    await writeSecure(k, legacy);
    await AsyncStorage.removeItem(key).catch(() => {});
    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") { webStore()?.setItem(key, value); return; }
    await writeSecure(safeKey(key), value);
    await AsyncStorage.removeItem(key).catch(() => {});
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") { webStore()?.removeItem(key); return; }
    await removeSecure(safeKey(key));
    await AsyncStorage.removeItem(key).catch(() => {});
  },
};

const INSTALL_KEY = "ezvisa.install.v1";
/** The iOS Keychain survives deleting the app. On the first launch after a fresh install (no AsyncStorage marker and no
 *  old AsyncStorage session to migrate), forget any session left in the Keychain by a previous install. */
export async function forgetSessionAfterReinstall(keys: string[]) {
  if (Platform.OS === "web") return;
  try {
    if (await AsyncStorage.getItem(INSTALL_KEY)) return;
    const legacy = await AsyncStorage.multiGet(keys);
    if (!legacy.some(([, v]) => v !== null)) await Promise.all(keys.map((k) => removeSecure(safeKey(k))));
    await AsyncStorage.setItem(INSTALL_KEY, "1");
  } catch { /* never block start-up */ }
}
