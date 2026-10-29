import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { usePathname } from "expo-router";
import { Text, Icon } from "./ui";
import { S, R } from "../lib/theme";
import { useT } from "../lib/i18n";

/** Offline banner (canvas HomeOffline, PaymentOffline): a black bar under the status bar, "You're offline. Showing
 *  what I last saw." and the time the connection dropped. Uploads and answers queued meanwhile send on reconnect.
 *  Not on the wizard: its own header shows "Not saved · Offline". */
export function NetworkBanner() {
  const net = useNetInfo(); const insets = useSafeAreaInsets(); const path = usePathname(); const { t } = useT();
  const offline = net.isConnected === false;
  const since = useRef<number | null>(null); const [, tick] = useState(0);
  useEffect(() => { if (offline && !since.current) { since.current = Date.now(); tick((n) => n + 1); } if (!offline) since.current = null; }, [offline]);
  if (!offline || path.startsWith("/apply")) return null;
  const at = since.current ? new Date(since.current).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <Animated.View entering={FadeInUp.duration(200)} exiting={FadeOutUp.duration(160)} pointerEvents="none" style={{ position: "absolute", top: insets.top + 4, left: S.sm, right: S.sm, zIndex: 1000 }}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" testID="offline-banner"
        style={{ flexDirection: "row", alignItems: "center", gap: S.xs, backgroundColor: "#111114", paddingHorizontal: S.md, paddingVertical: 10, borderRadius: R.md }}>
        <Icon name="wifi.slash" size={14} color="#FFFFFF" />
        <Text variant="callout" weight="600" color="#FFFFFF" style={{ flex: 1 }} numberOfLines={2}>{t("You're offline. Showing what I last saw.")}</Text>
        {!!at && <Text variant="footnote" weight="500" color="rgba(255,255,255,0.7)" tabular>{at}</Text>}
      </View>
    </Animated.View>
  );
}
