// Failed / abandoned applications: unpaid drafts or submitted-but-never-paid cases. Customers can't delete rows or set
// a cancelled status under the live RLS + guard trigger (see migrations/0007_customer_discard.sql, applied 2026-10-22; status now becomes 'cancelled'), so a
// discard was (still kept as fallback): (1) hidden locally in AsyncStorage, and (2) a best-effort `discarded_at` flag in additional_notes, which the
// existing "Customers update own applications" policy already allows for draft/submitted rows. Paid cases are never discarded.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import { cancelApplication, isPaid, patchNotes, type Application } from "./data";

const KEY = "ezvisa.discarded.v1";
export const ABANDONED_LIMIT = 10;
let ids = new Set<string>(); let loaded = false; const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
async function hydrate() { if (loaded) return; loaded = true; try { const r = await AsyncStorage.getItem(KEY); if (r) ids = new Set(JSON.parse(r)); } catch {} emit(); }

/** Sign-out: the next user starts with nothing hidden. */
export function resetDiscarded() { ids = new Set(); loaded = false; emit(); }

export const isAbandoned = (a: Application) => !isPaid(a) && ["draft", "submitted"].includes(a.status);
export const isDiscarded = (a: Application) => ids.has(a.id) || !!(a.notes as any)?.discarded_at;

/** Re-renders when the discarded set changes. */
export function useDiscarded() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); hydrate(); return () => { subs.delete(f); }; }, []);
  return ids;
}

/** Hides cases the customer discarded and keeps only the 10 most recent abandoned ones (paid / in-progress cases are untouched). */
export function visibleApps(apps: Application[]): Application[] {
  const at = (a: Application) => Date.parse((a as any).updated_at ?? a.created_at ?? "") || 0;
  // A discard now sets status "cancelled" (migration 0007), so those rows are hidden too; staff-cancelled or paid cases stay.
  const live = apps.filter((a) => !((isAbandoned(a) || (a.status === "cancelled" && !isPaid(a))) && isDiscarded(a)));
  const keep = new Set(live.filter(isAbandoned).sort((x, y) => at(y) - at(x)).slice(0, ABANDONED_LIMIT).map((a) => a.id));
  return live.filter((a) => !isAbandoned(a) || keep.has(a.id));
}

export async function discardApplication(a: Application) {
  if (isPaid(a) || !isAbandoned(a)) throw new Error("Paid applications can't be discarded.");
  ids = new Set(ids).add(a.id); emit();
  await AsyncStorage.setItem(KEY, JSON.stringify([...ids])).catch(() => {});
  // Server: status -> cancelled (migration 0007). Fallbacks: the notes flag, and the local hide above.
  try { await patchNotes(a.id, { discarded_at: new Date().toISOString() } as any); } catch {}
  try { await cancelApplication(a.id); } catch {}
}

/** Red "Discard" menu item, then a destructive confirmation. */
export function askDiscard(onDiscard: () => void, t: (s: string) => string = (s) => s) {
  const confirm = () => {
    if (Platform.OS === "web") { if (typeof window !== "undefined" && window.confirm(t("Discard this application?"))) onDiscard(); return; }
    Alert.alert(t("Discard this application?"), t("It will be removed from your list."), [{ text: t("Cancel"), style: "cancel" }, { text: t("Discard"), style: "destructive", onPress: onDiscard }]);
  };
  if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options: [t("Discard"), t("Cancel")], destructiveButtonIndex: 0, cancelButtonIndex: 1 }, (i) => { if (i === 0) confirm(); });
  else confirm();
}
