import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { router } from "expo-router";
import { registerPushToken } from "./data";
import { needsSession, notificationRoute } from "./notifyRoute";

type N = typeof import("expo-notifications");
// expo-notifications is unsupported on web. In Expo Go on Android (SDK 53+) remote push throws; local notifications still work.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const pushSupported = Platform.OS === "ios" || (Platform.OS === "android" && !inExpoGo);

let mod: N | null | undefined;
/** The one place expo-notifications is loaded and the foreground handler is set (pushes and local reminders share it). */
export function notifications(): N | null {
  if (mod !== undefined) return mod;
  if (Platform.OS === "web") return (mod = null);
  try { mod = require("expo-notifications") as N; } catch { mod = null; }
  mod?.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
  return mod;
}

async function saveToken(N: N) {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data } = await N.getExpoPushTokenAsync({ projectId });
  await registerPushToken(data);
}

let tokenSub: { remove: () => void } | null = null;
/** ask=false: only registers if permission was already granted (used at sign-in). ask=true: asks in context (after payment).
 * Returns a status string; never throws. A denied permission is not asked again. */
export async function setupPush(ask = false): Promise<string> {
  if (!pushSupported) return Platform.OS === "web" ? "unsupported-web" : "unsupported-expo-go-android";
  const N = notifications();
  if (!N) return "unavailable";
  try {
    const Device = require("expo-device") as typeof import("expo-device");
    if (!Device.isDevice) return "simulator";
    let { status, canAskAgain } = await N.getPermissionsAsync();
    if (status !== "granted" && (!ask || !canAskAgain)) return status === "denied" ? "denied" : "not-asked";
    if (status !== "granted") status = (await N.requestPermissionsAsync()).status;
    if (status !== "granted") return "denied";
    await saveToken(N);
    // APNs/FCM can rotate the device token; re-save so the server never keeps sending to a dead one.
    tokenSub ??= N.addPushTokenListener(() => { saveToken(N).catch(() => {}); });
    return "registered";
  } catch (e: any) {
    return `unavailable: ${e?.message ?? e}`;
  }
}

/** ready: the stored session is known. signedIn: a session. inApp: signed in or guest, so the app's screens exist
 *  (app/_layout.tsx Routes); a guest restarted on Welcome gets the screen after "Continue without an account". */
type Gate = { ready: boolean; signedIn: boolean; inApp: boolean };
function openPending(pending: { current: string | null }, g: Gate) {
  const url = pending.current;
  if (!url || !g.ready || !g.inApp || (needsSession(url) && !g.signedIn)) return;
  pending.current = null;
  router.push(url as any, { withAnchor: true });
}

/** Opens the screen a tapped notification points to, warm (listener) or cold start (last response), each tap once.
 * Waits until the root is ready; application screens wait for a session. */
export function useNotificationRouting(ready: boolean, signedIn: boolean, inApp: boolean) {
  const pending = useRef<string | null>(null);
  const gate = useRef<Gate>({ ready, signedIn, inApp });
  useEffect(() => {
    const N = notifications();
    if (!N) return;
    const seen = new Set<string>();
    const take = (r: import("expo-notifications").NotificationResponse | null) => {
      if (!r || r.actionIdentifier !== N.DEFAULT_ACTION_IDENTIFIER) return;
      // One delivery = identifier + date. The cold-start response can also reach the listener (same delivery), while a
      // reminder rescheduled under the same identifier (ezvisa-rem-draft) is a new delivery and must open again.
      const id = `${r.notification.request.identifier}@${r.notification.date}`;
      if (seen.has(id)) return;
      seen.add(id);
      N.clearLastNotificationResponse();
      const url = notificationRoute(r.notification.request.content.data);
      if (url) { pending.current = url; openPending(pending, gate.current); }
    };
    take(N.getLastNotificationResponse());
    const sub = N.addNotificationResponseReceivedListener(take);
    return () => sub.remove();
  }, []);
  useEffect(() => { gate.current = { ready, signedIn, inApp }; openPending(pending, gate.current); }, [ready, signedIn, inApp]);
}
