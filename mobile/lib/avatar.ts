// Profile photo: picked from the photo library, cropped square, stored on this phone as a small JPEG (256 px) for the
// signed-in user, and wiped on sign-out (lib/userData.ts). Shown on Account and as the Account tab icon.
// Not synced to other devices yet: that needs a storage bucket on the server (a schema change, not made here).
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

export const AVATAR_KEY = "ezvisa.avatar.v1";
const SIZE = 256;
type Stored = { uid: string; uri: string };
let cur: Stored | null = null; let loaded = false; const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
async function load() { if (loaded) return; loaded = true; try { const r = await AsyncStorage.getItem(AVATAR_KEY); cur = r ? JSON.parse(r) : null; } catch { cur = null; } emit(); }

/** The photo for this user (null when none, or when it belongs to someone else). */
export function useAvatar(uid?: string | null): string | null {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); load(); return () => { subs.delete(f); }; }, []);
  return uid && cur?.uid === uid ? cur.uri : null;
}

async function save(next: Stored | null) {
  cur = next; emit();
  if (next) await AsyncStorage.setItem(AVATAR_KEY, JSON.stringify(next)).catch(() => {});
  else await AsyncStorage.removeItem(AVATAR_KEY).catch(() => {});
}

/** Pick, crop square and shrink a photo. false when cancelled. */
export async function pickAvatar(uid: string): Promise<boolean> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1, exif: false });
  if (r.canceled || !r.assets?.[0]) return false;
  const a = r.assets[0];
  let uri = a.uri;
  if (Platform.OS !== "web") {
    const { ImageManipulator, SaveFormat } = require("expo-image-manipulator") as typeof import("expo-image-manipulator");
    const side = Math.min(a.width, a.height); // web has no crop UI, native already cropped square: centre-crop to be sure
    const ctx = ImageManipulator.manipulate(a.uri).crop({ originX: Math.round((a.width - side) / 2), originY: Math.round((a.height - side) / 2), width: side, height: side }).resize({ width: SIZE, height: SIZE });
    const out = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    uri = out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri;
  }
  await save({ uid, uri });
  return true;
}
export const removeAvatar = () => save(null);
/** Sign-out (lib/userData.ts): forget the photo in memory too. */
export function resetAvatar() { cur = null; loaded = false; emit(); }
