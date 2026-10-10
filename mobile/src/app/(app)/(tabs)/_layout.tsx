import { NativeTabs } from "expo-router/unstable-native-tabs"

import { useColors } from "@/lib/theme"

export default function TabsLayout() {
  const c = useColors()
  return (
    <NativeTabs tintColor={c.primary}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Applications</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} md="description" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
