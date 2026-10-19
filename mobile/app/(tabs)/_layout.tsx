import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { useColors } from "../../lib/theme";
import { TabBar } from "../../components/nav/TabBar";
import { useWelcomed } from "../../lib/onboarding";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";

export default function TabsLayout() {
  const c = useColors(); const welcomed = useWelcomed(); const { session, loading } = useAuth(); const { t } = useT();
  if (welcomed === null || loading) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!welcomed && !session) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="(home)" options={{ title: t("Home") }} />
      <Tabs.Screen name="(countries)" options={{ title: t("Countries") }} />
      <Tabs.Screen name="applications" options={{ title: t("Applications") }} />
      <Tabs.Screen name="account" options={{ title: t("Account") }} />
    </Tabs>
  );
}
