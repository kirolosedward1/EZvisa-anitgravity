import { PressScale } from "./ui";
// One tap to support from anywhere: WhatsApp or email, with context about where the user is.
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icon, Text } from "./ui";
import { CircleButton } from "./flow";
import { useColors, S, R } from "../lib/theme";
import { whatsapp } from "../lib/api";
import { EMAIL } from "../lib/config";
import { Linking } from "react-native";
import { useT } from "../lib/i18n";

/** `header`: a plain tinted glyph for a native header (no filled circle, so no grey band / double capsule). */
export function SupportButton({ context, header }: { context: string; header?: boolean }) {
  const { t } = useT(); const c = useColors(); const insets = useSafeAreaInsets(); const [open, setOpen] = useState(false);
  // Only the reference / screen name; never passport or personal data.
  const msg = `Hi EZvisa, I have a question about ${context}.`;
  return (<>
    {header
      ? <Pressable onPress={() => setOpen(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("Help")} testID="header-help" style={{ minWidth: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Icon name="questionmark.circle" size={22} color={c.tint} /></Pressable>
      : <CircleButton icon="questionmark.circle.fill" label={t("Help")} onPress={() => setOpen(true)} />}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <PressScale style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setOpen(false)} accessibilityLabel={t("Close")} accessibilityRole="button" />
        <View accessibilityViewIsModal style={{ backgroundColor: c.bg, borderTopLeftRadius: R.sheet, borderTopRightRadius: R.sheet, padding: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), gap: S.sm }}>
          <Text variant="title3" accessibilityRole="header">{t("Need help?")}</Text>
          <Text variant="subhead" tone="secondary">{t("Message us on WhatsApp or by email.")}</Text>
          <View style={{ height: S.xs }} />
          <Button title="WhatsApp" icon="logo.whatsapp" onPress={() => { setOpen(false); whatsapp(msg); }} />
          <Button title={t("Email")} icon="envelope.fill" variant="secondary" onPress={() => { setOpen(false); Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent("EZvisa question")}&body=${encodeURIComponent(msg)}`); }} />
          <Button title={t("Cancel")} variant="plain" color={c.label} onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </>);
}
