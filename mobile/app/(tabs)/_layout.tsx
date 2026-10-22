import { Tabs } from "expo-router";
import { View } from "react-native";
import { useColors } from "../../lib/theme";
import { TabBar } from "../../components/nav/TabBar";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";

export default function TabsLayout() {
  const c = useColors(); const { loading } = useAuth(); const { t } = useT();
  // Only signed-in users and guests get here (route protection in app/_layout.tsx); this covers the splash period.
  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="(home)" options={{ title: t("Home") }} />
      <Tabs.Screen name="(countries)" options={{ title: t("Countries") }} />
      <Tabs.Screen name="applications" options={{ title: t("Applications") }} />
      <Tabs.Screen name="account" options={{ title: t("Account") }} />
    </Tabs>
  );
}
