import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { useColorScheme } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AuthProvider, useAuth } from "@/lib/auth"
import { useColors } from "@/lib/theme"

SplashScreen.preventAutoHideAsync()

function RootStack() {
  const { session, loading } = useAuth()
  const c = useColors()

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync()
  }, [loading])

  if (loading) return null

  return (
    <Stack
      screenOptions={{
        headerTintColor: c.primary,
        headerTitleStyle: { color: c.text },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: c.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="payment-return" options={{ headerShown: false }} />
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)/(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)/application/[id]" options={{ title: "Application" }} />
        <Stack.Screen name="(app)/wizard/[id]" options={{ title: "Visa application", gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/sign-up" options={{ title: "Create account" }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  const scheme = useColorScheme()
  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
