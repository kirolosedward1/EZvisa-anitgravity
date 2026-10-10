import { Image } from "expo-image"
import { router } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Banner, Body, Button, Caption, ScreenScroll, TextField } from "@/components/ui"
import { authErrorMessage, useAuth } from "@/lib/auth"
import { config, isConfigured } from "@/lib/config"
import { space, type, useColors } from "@/lib/theme"

export default function SignIn() {
  const c = useColors()
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenScroll>
          <View style={{ gap: space.md, paddingTop: space.xl }}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={{ width: 150, height: 37 }}
              contentFit="contain"
              accessibilityLabel="EZvisa"
            />
            <Body style={[type.title, { color: c.text }]}>Welcome back</Body>
            <Body muted>Sign in with the same account you use on ezvisa.net to see and continue your applications.</Body>
          </View>

          {!isConfigured ? (
            <Banner tone="warning" message="App not configured: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env" />
          ) : null}
          {error ? <Banner message={error} /> : null}

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          <Button title="Sign in" onPress={onSubmit} loading={busy} />
          <Button
            title="Forgot password?"
            variant="ghost"
            onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/forgot-password`)}
          />

          <View style={{ alignItems: "center", gap: space.sm, paddingTop: space.lg }}>
            <Caption>New to EZvisa?</Caption>
            <Button title="Create an account" variant="secondary" onPress={() => router.push("/sign-up")} />
          </View>
        </ScreenScroll>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
