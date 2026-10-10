import { router } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useState } from "react"
import { Text } from "react-native"

import { Banner, Body, Button, Caption, ScreenScroll, TextField } from "@/components/ui"
import { authErrorMessage, useAuth } from "@/lib/auth"
import { config } from "@/lib/config"
import { useColors } from "@/lib/theme"

export default function SignUp() {
  const c = useColors()
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit() {
    if (!fullName.trim() || !email.trim()) return setError("Enter your name and email.")
    if (password.length < 8) return setError("Use a password with at least 8 characters.")
    setBusy(true)
    setError(null)
    try {
      const { needsConfirmation } = await signUp(email, password, fullName)
      if (needsConfirmation) setSent(true)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <ScreenScroll>
        <Banner tone="primary" message={`We sent a confirmation link to ${email.trim()}.`} />
        <Body muted>Open the link on this phone or any device, then come back and sign in.</Body>
        <Button title="Back to sign in" onPress={() => router.back()} />
      </ScreenScroll>
    )
  }

  return (
    <ScreenScroll>
      <Body muted>One account for the EZvisa app and website. Your applications stay in sync on both.</Body>
      {error ? <Banner message={error} /> : null}
      <TextField label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint="At least 8 characters"
      />
      <Button title="Create account" onPress={onSubmit} loading={busy} />
      <Caption>
        By continuing you agree to our{" "}
        <Text style={{ color: c.primary }} onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/terms-of-service`)}>
          Terms
        </Text>{" "}
        and{" "}
        <Text style={{ color: c.primary }} onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/privacy-policy`)}>
          Privacy Policy
        </Text>
        .
      </Caption>
    </ScreenScroll>
  )
}
