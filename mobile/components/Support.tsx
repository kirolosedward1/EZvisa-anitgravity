// One tap to support from anywhere: WhatsApp or email, with context about where the user is.
import { useState } from "react";
import { Linking, Pressable } from "react-native";
import { Button, Icon, Sheet, Text } from "./ui";
import { CircleButton } from "./flow";
import { useColors, HIT, ICON } from "../lib/theme";
import { whatsapp } from "../lib/api";
import { EMAIL } from "../lib/config";
import { useT } from "../lib/i18n";

/** `header`: a plain tinted glyph for a native header (no filled circle, so no grey band / double capsule). */
export function SupportButton({ context, header }: { context: string; header?: boolean }) {
  const { t } = useT(); const c = useColors(); const [open, setOpen] = useState(false);
  // Only the reference / screen name; never passport or personal data.
  const msg = `Hi EZvisa, I have a question about ${context}.`;
  return (<>
    {header
      ? <Pressable onPress={() => setOpen(true)} hitSlop={HIT / 4} accessibilityRole="button" accessibilityLabel={t("Help")} testID="header-help" style={({ pressed }) => ({ minWidth: HIT, height: HIT, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><Icon name="questionmark.circle" size={ICON.lg} color={c.accent} /></Pressable>
      : <CircleButton icon="questionmark.circle.fill" label={t("Help")} onPress={() => setOpen(true)} />}
    <Sheet visible={open} onClose={() => setOpen(false)} title={t("Need help?")} closeLabel={t("Close")} testID="support-sheet">
      <Text variant="subhead" tone="secondary">{t("Message us on WhatsApp or by email.")}</Text>
      <Button title="WhatsApp" icon="logo.whatsapp" onPress={() => { setOpen(false); whatsapp(msg); }} />
      <Button title={t("Email")} icon="envelope.fill" variant="secondary" onPress={() => { setOpen(false); Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent("EZvisa question")}&body=${encodeURIComponent(msg)}`); }} />
    </Sheet>
  </>);
}
