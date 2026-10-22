import { View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { usePathname } from "expo-router";
import { Text, Icon } from "./ui";
import { useColors, S, R } from "../lib/theme";

/** Small pill at the top while the device is offline. Uploads and answers queued meanwhile save on reconnect.
 *  Not on the wizard: it would cover the wizard's own save status ("Not saved · Offline") in the header. */
export function NetworkBanner() {
  const net = useNetInfo(); const insets = useSafeAreaInsets(); const c = useColors(); const path = usePathname();
  if (net.isConnected !== false || path.startsWith("/apply")) return null;
  return (
    <Animated.View entering={FadeInUp.springify().damping(22).stiffness(240)} exiting={FadeOutUp.duration(160)} pointerEvents="none" style={{ position: "absolute", top: insets.top + 4, left: 0, right: 0, alignItems: "center", zIndex: 1000 }}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" testID="offline-banner" style={{ flexDirection: "row", alignItems: "center", gap: S.xs, backgroundColor: c.label, paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: R.round, maxWidth: "92%" }}>
        <Icon name="wifi.slash" size={14} color={c.bg} />
        <Text variant="footnote" weight="600" color={c.bg}>{"Offline · changes save when you're back"}</Text>
      </View>
    </Animated.View>
  );
}
