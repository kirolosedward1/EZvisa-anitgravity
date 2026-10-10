import * as Linking from "expo-linking"
import * as WebBrowser from "expo-web-browser"
import { useEffect, useState } from "react"
import { Alert, Pressable, StyleSheet, Text, View } from "react-native"

import { Banner, Button, Caption, Card, Heading, Icon, Loading, ScreenScroll, TextField } from "@/components/ui"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { config } from "@/lib/config"
import { useResource } from "@/lib/hooks"
import { space, useColors } from "@/lib/theme"

function Row({ icon, label, onPress }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; onPress: () => void }) {
  const c = useColors()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingVertical: 14,
        opacity: pressed ? 0.6 : 1,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      })}>
      <Icon name={icon} size={18} color={c.primary} />
      <Text style={{ flex: 1, fontSize: 16, color: c.text }}>{label}</Text>
      <Icon name="chevron.right" size={13} color={c.textMuted} />
    </Pressable>
  )
}

export default function Account() {
  const { signOut, session } = useAuth()
  const { data, error, loading, setData } = useResource(() => api.me())
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: "primary" | "danger"; text: string } | null>(null)

  useEffect(() => {
    if (data) {
      setFullName(data.profile.fullName)
      setPhone(data.profile.phone)
    }
  }, [data])

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await api.updateMe({ fullName, phone })
      setData(res)
      setMessage({ tone: "primary", text: "Profile saved." })
    } catch (err) {
      setMessage({ tone: "danger", text: err instanceof ApiError ? err.message : "Couldn't save." })
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your login and any drafts. Submitted applications are kept by EZvisa for legal and accounting reasons but will no longer be linked to you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteAccount()
              await signOut()
            } catch (err) {
              Alert.alert("Couldn't delete account", err instanceof ApiError ? err.message : "Please try again.")
            }
          },
        },
      ],
    )
  }

  if (loading && !data) return <Loading />

  return (
    <ScreenScroll>
      {error && !data ? <Banner message={error.message} /> : null}
      <Card>
        <Heading>Profile</Heading>
        <Caption>{data?.profile.email ?? session?.user.email}</Caption>
        {message ? <Banner tone={message.tone} message={message.text} /> : null}
        <TextField label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
        <TextField label="Phone / WhatsApp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        <Button title="Save changes" onPress={save} loading={saving} variant="secondary" />
      </Card>

      <Card style={{ gap: 0 }}>
        <Heading style={{ marginBottom: space.sm }}>Help</Heading>
        <Row
          icon="message"
          label="Chat on WhatsApp"
          onPress={() => Linking.openURL(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent("Hi EZvisa! I have a question about my visa application.")}`)}
        />
        <Row icon="envelope" label={`Email ${config.supportEmail}`} onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)} />
        <Row icon="doc.plaintext" label="Required documents by country" onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/documents`)} />
        <Row icon="hand.raised" label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/privacy-policy`)} />
        <Row icon="doc.text" label="Terms of service" onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/terms-of-service`)} />
        <Row icon="arrow.uturn.backward" label="Refund policy" onPress={() => WebBrowser.openBrowserAsync(`${config.siteUrl}/refund-policy`)} />
      </Card>

      <View style={{ gap: space.md }}>
        <Button title="Sign out" variant="secondary" icon="rectangle.portrait.and.arrow.right" onPress={signOut} />
        <Button title="Delete account" variant="danger" onPress={confirmDelete} />
      </View>
    </ScreenScroll>
  )
}
