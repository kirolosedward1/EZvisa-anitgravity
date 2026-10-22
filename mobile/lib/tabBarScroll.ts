// The tab bar shrinks while a tab's list scrolls down and comes back on scroll up or near the top (as on iOS 26).
// Tab screens pass onTabScroll to their ScrollView; components/nav/TabBar animates from tabBarCompact.
import { makeMutable } from "react-native-reanimated";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Target size: 0 = full, 1 = compact. */
export const tabBarCompact = makeMutable(0);
let lastY = 0;
const set = (v: 0 | 1) => { if (tabBarCompact.value !== v) tabBarCompact.value = v; };

export function onTabScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
  const y = e.nativeEvent.contentOffset.y; const dy = y - lastY; lastY = y;
  if (y < 24) set(0); else if (dy > 6) set(1); else if (dy < -6) set(0);
}
/** Full size again (tab change, pushed screen closed). */
export function resetTabScroll() { lastY = 0; set(0); }
