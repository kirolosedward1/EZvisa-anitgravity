import { Stack } from "expo-router"

import { useColors } from "@/lib/theme"

export default function HomeStack() {
  const c = useColors()
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerTintColor: c.primary, headerTitleStyle: { color: c.text } }}>
      <Stack.Screen name="index" options={{ title: "Applications" }} />
    </Stack>
  )
}
