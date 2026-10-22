import { Tabs } from "expo-router";
import { View, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../lib/theme";
import { TabBar } from "../../components/nav/TabBar";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";

export default function TabsLayout() {
  const c = useColors(); const { loading } = useAuth(); const { t } = useT(); const insets = useSafeAreaInsets();
  // Only signed-in users and guests get here (route protection in app/_layout.tsx); this covers the splash period.
  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <View style={{ flex: 1 }}>
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="(home)" options={{ title: t("Home") }} />
      <Tabs.Screen name="(countries)" options={{ title: t("Countries") }} />
      <Tabs.Screen name="applications" options={{ title: t("Applications") }} />
      <Tabs.Screen name="account" options={{ title: t("Account") }} />
    </Tabs>
      {/* Status-bar backdrop: content scrolling under the clock and battery is blurred instead of colliding with them. */}
      {insets.top > 0 && (Platform.OS === "ios"
        ? <BlurView pointerEvents="none" intensity={60} tint="systemChromeMaterialLight" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: "rgba(255,255,255,0.55)" }} />
        : <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: "rgba(255,255,255,0.94)" }} />)}
    </View>
  );
}
