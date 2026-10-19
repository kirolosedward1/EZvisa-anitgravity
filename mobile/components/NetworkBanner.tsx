import { View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { Text, Icon } from "./ui";
import { useColors, S } from "../lib/theme";

/** Small pill at the top while the device is offline. Uploads queued meanwhile retry on reconnect. */
export function NetworkBanner() {
  const net = useNetInfo(); const insets = useSafeAreaInsets(); const c = useColors();
  if (net.isConnected !== false) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} pointerEvents="none" style={{ position: "absolute", top: insets.top + 4, left: 0, right: 0, alignItems: "center", zIndex: 1000 }}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" testID="offline-banner" style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.label, paddingHorizontal: S.md, paddingVertical: 8, borderRadius: 999, maxWidth: "92%" }}>
        <Icon name="wifi.slash" size={14} color={c.bg} />
        <Text variant="footnote" weight="600" color={c.bg}>Offline · uploads will retry when you're back</Text>
      </View>
    </Animated.View>
  );
}
