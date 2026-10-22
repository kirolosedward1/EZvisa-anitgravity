import { Stack } from "expo-router";
import { useColors } from "../../lib/theme";

/** Sign in, sign up, magic link, forgot password, the email-link callback and "set a new password". */
export default function AuthLayout() {
  const c = useColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="magic-link" />
      <Stack.Screen name="forgot" />
      <Stack.Screen name="callback" options={{ gestureEnabled: false, animation: "fade" }} />
      <Stack.Screen name="reset" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
