import * as H from "expo-haptics";
import { Platform } from "react-native";
const ok = Platform.OS !== "web";
export const tap = () => ok && H.impactAsync(H.ImpactFeedbackStyle.Light).catch(() => {});
export const select = () => ok && H.selectionAsync().catch(() => {});
export const success = () => ok && H.notificationAsync(H.NotificationFeedbackType.Success).catch(() => {});
export const error = () => ok && H.notificationAsync(H.NotificationFeedbackType.Error).catch(() => {});
export const medium = () => ok && H.impactAsync(H.ImpactFeedbackStyle.Medium).catch(() => {});
