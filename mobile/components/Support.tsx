import { PressScale } from "./ui";
// One tap to support from anywhere: WhatsApp or email, with context about where the user is.
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text } from "./ui";
import { CircleButton } from "./flow";
import { useColors, S, R } from "../lib/theme";
import { whatsapp } from "../lib/api";
import { EMAIL } from "../lib/config";
import { Linking } from "react-native";

export function SupportButton({ context }: { context: string }) {
  const c = useColors(); const insets = useSafeAreaInsets(); const [open, setOpen] = useState(false);
  const msg = `Hi EZvisa, I have a question (${context}).`;
  return (<>
    <CircleButton icon="questionmark.circle.fill" label="Help" onPress={() => setOpen(true)} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <PressScale style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setOpen(false)} accessibilityLabel="Close help" accessibilityRole="button" />
        <View accessibilityViewIsModal style={{ backgroundColor: c.bg, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet, padding: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), gap: S.sm }}>
          <Text variant="title3" accessibilityRole="header">Need help?</Text>
          <Text variant="subhead" tone="secondary">Message us on WhatsApp or by email.</Text>
          <View style={{ height: S.xs }} />
          <Button title="WhatsApp" icon="logo.whatsapp" onPress={() => { setOpen(false); whatsapp(msg); }} />
          <Button title="Email" icon="envelope.fill" variant="secondary" onPress={() => { setOpen(false); Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent("EZvisa question")}&body=${encodeURIComponent(msg)}`); }} />
          <Button title="Cancel" variant="plain" color={c.label} onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </>);
}
