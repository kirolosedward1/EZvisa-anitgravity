// Everything this phone keeps about the signed-in person, wiped on sign-out (and when a session ends on its own) so the
// next person to sign in sees none of it. Kept: device preferences (appearance, language, Face ID lock, usage-data choice)
// and anonymous diagnostics (lib/analytics.ts events/outbox, lib/perf.ts start-up timing), which hold no personal data.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearQueue } from "./uploads";
import { resetDiscarded } from "./discard";
import { resetAvatar } from "./avatar";
import { setRemindersEnabled } from "./reminders";

export const USER_KEYS = [
  "ezvisa.wizard.v1", "ezvisa.drafts.v2",           // wizard answers (lib/form.tsx)
  "ezvisa.discarded.v1",                             // hidden applications (lib/discard.ts)
  "ezvisa.notifications.read.v1",                    // inbox read state (lib/data.ts)
  "ezvisa.push.token",                               // this device's push token (lib/data.ts)
  "ezvisa.passportExpiry.v1", "ezvisa.reminders.v1", // reminders (lib/reminders.ts)
  "ezvisa.crash.v1",                                 // last crash report (lib/crash.ts)
  "ezvisa.prefill.v1",                               // per-draft "profile question answered" flags (lib/profile.ts)
  "ezvisa.avatar.v1",                                // profile photo (lib/avatar.ts)
];
const USER_PREFIXES = ["ezvisa.itinerary.v1."];      // trip plans per application (lib/itinerary.ts)

export async function clearUserData() {
  clearQueue(); // upload queue + the local copies of passports/statements (lib/uploads.ts)
  resetDiscarded(); resetAvatar();
  if (Platform.OS !== "web") await setRemindersEnabled(false, null).catch(() => {}); // cancels scheduled reminders
  try {
    const all = await AsyncStorage.getAllKeys();
    const drop = all.filter((k) => USER_KEYS.includes(k) || USER_PREFIXES.some((p) => k.startsWith(p)));
    await AsyncStorage.multiRemove([...new Set([...drop, ...USER_KEYS])]);
  } catch { await AsyncStorage.multiRemove(USER_KEYS).catch(() => {}); }
}
