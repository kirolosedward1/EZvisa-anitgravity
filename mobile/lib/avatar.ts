// Profile photo: picked from the photo library, cropped square, stored on this phone as a small JPEG (256 px) for the
// signed-in user, and wiped on sign-out (lib/userData.ts). Shown on Account and as the Account tab icon.
// Also uploaded to the private `avatars` bucket at <user_id>/avatar.jpg; the path is kept in user_metadata.avatar_path
// and loaded with a 1-hour signed URL, so the photo survives sign-out and shows on other devices.
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

export const AVATAR_KEY = "ezvisa.avatar.v1";
const SIZE = 256;
type Stored = { uid: string; uri: string };
let cur: Stored | null = null; let loaded = false; const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
async function load() { if (loaded) return; loaded = true; try { const r = await AsyncStorage.getItem(AVATAR_KEY); cur = r ? JSON.parse(r) : null; } catch { cur = null; } emit(); }

/** The photo for this user (null when none, or when it belongs to someone else). */
export function useAvatar(uid?: string | null): string | null {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); load().then(() => { if (uid) syncRemote(uid); }); return () => { subs.delete(f); }; }, [uid]);
  return uid && cur?.uid === uid ? cur.uri : null;
}

const PATH = (uid: string) => `${uid}/avatar.jpg`;
let syncing: string | null = null;
/** No photo on this phone (e.g. after sign-out): fetch the saved one from storage. */
async function syncRemote(uid: string) {
  if (!supabase || syncing === uid || (cur?.uid === uid && cur.uri)) return; syncing = uid;
  try {
    const { data } = await supabase.auth.getSession(); const u = data.session?.user;
    const path = u?.id === uid ? (u.user_metadata?.avatar_path as string | undefined) : undefined; if (!path) return;
    const r = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    if (r.data?.signedUrl && !(cur?.uid === uid)) { cur = { uid, uri: r.data.signedUrl }; emit(); }
  } catch {} finally { syncing = null; }
}
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/[^A-Za-z0-9+/]/g, ""); const bytes: number[] = []; let buf = 0, bits = 0;
  for (const ch of s) { buf = (buf << 6) | B64.indexOf(ch); bits += 6; if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 255); } }
  return new Uint8Array(bytes);
}
/** Upload to avatars/<uid>/avatar.jpg (upsert) and remember the path in user_metadata. Best effort: the local copy still shows. */
async function upload(uid: string, dataUri: string) {
  if (!supabase) return;
  // Native gives a base64 data URI (above); web's picker gives a blob: URL, so read its bytes.
  const m = /^data:image\/\w+;base64,(.*)$/.exec(dataUri);
  const bytes = m ? b64ToBytes(m[1]) : new Uint8Array(await (await fetch(dataUri)).arrayBuffer());
  if (!bytes.length) return;
  const { error } = await supabase.storage.from("avatars").upload(PATH(uid), bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  await supabase.auth.updateUser({ data: { avatar_path: PATH(uid) } });
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
  await upload(uid, uri).catch(() => {});
  return true;
}
export async function removeAvatar() {
  const uid = cur?.uid; await save(null);
  if (uid && supabase) { await supabase.storage.from("avatars").remove([PATH(uid)]).catch(() => {}); await supabase.auth.updateUser({ data: { avatar_path: null } }).catch(() => {}); }
}
/** Sign-out (lib/userData.ts): forget the photo in memory too. */
export function resetAvatar() { cur = null; loaded = false; emit(); }
