import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { registerPushToken } from "./data";

// expo-notifications is loaded lazily: it is unsupported on web and remote push was removed from Expo Go on Android,
// where merely importing it logs an error.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const supported = Platform.OS === "ios" || (Platform.OS === "android" && !inExpoGo);
let configured = false;

/** Requests permission and stores the Expo push token in push_tokens. Returns a status string; never throws. */
export async function setupPush(): Promise<string> {
  if (!supported) return Platform.OS === "web" ? "unsupported-web" : "unsupported-expo-go-android";
  try {
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");
    const Device = require("expo-device") as typeof import("expo-device");
    if (!configured) {
      Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }) });
      configured = true;
    }
    if (!Device.isDevice) return "simulator";
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return "denied";
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(data);
    return "registered";
  } catch (e: any) {
    return `unavailable: ${e?.message ?? e}`;
  }
}
