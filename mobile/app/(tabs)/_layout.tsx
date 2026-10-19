import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { useColors } from "../../lib/theme";
import { TabBar } from "../../components/nav/TabBar";
import { useWelcomed } from "../../lib/onboarding";
import { useAuth } from "../../lib/auth";

export default function TabsLayout() {
  const c = useColors(); const welcomed = useWelcomed(); const { session, loading } = useAuth();
  if (welcomed === null || loading) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!welcomed && !session) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="(home)" options={{ title: "Home" }} />
      <Tabs.Screen name="(countries)" options={{ title: "Countries" }} />
      <Tabs.Screen name="applications" options={{ title: "Applications" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
