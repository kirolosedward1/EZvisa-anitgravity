// Clears what EZvisa keeps on this phone after the account is deleted (drafts with passport details, upload queue,
// reminders, lock and read state). Language, appearance and the welcome flag are device preferences and stay.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, DevSettings } from "react-native";
import * as Updates from "expo-updates";
import { setRemindersEnabled, cancelDraftReminder } from "./reminders";

const KEEP = new Set(["ezvisa.lang.v1", "ezvisa.lang.dir-reload.v1", "ezvisa.appearance.v1", "ezvisa.welcomed.v1"]);
export async function wipeLocalData() {
  await setRemindersEnabled(false, null).catch(() => {});
  await cancelDraftReminder().catch(() => {});
  const keys = (await AsyncStorage.getAllKeys().catch(() => [] as readonly string[])).filter((k) => k.startsWith("ezvisa.") && !KEEP.has(k));
  if (keys.length) await AsyncStorage.multiRemove(keys).catch(() => {});
}
/** Restarts the JS so no deleted data stays in memory (form state, caches). */
export async function restartApp() {
  if (Platform.OS === "web") { if (typeof window !== "undefined") window.location.reload(); return; }
  try { await Updates.reloadAsync(); } catch { try { DevSettings.reload(); } catch { /* next launch starts clean */ } }
}
