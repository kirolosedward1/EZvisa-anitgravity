import { Stack } from "expo-router";
import { useColors } from "../../lib/theme";
export const unstable_settings = { initialRouteName: "index" };
export default function ApplyLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
