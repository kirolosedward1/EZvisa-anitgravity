// Notification pre-prompt (canvas PushAsk.dc.html), shown once after the first payment, before the next screen. It
// shows exactly which messages the customer gets; "Yes, notify me" opens the system prompt, "Not now" never asks again
// from here (Settings can turn notifications on later). Skipped when the system already has an answer.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, View } from "react-native";
import { SheetScaffold, PrimaryButton, SecondaryButton, Text, Icon } from "../ui";
import { useColors, S, R } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { notifications, setupPush } from "../../lib/push";

const KEY = "ezvisa.pushAsked.v1";
const preview = () => __DEV__ && !!(globalThis as { __EZ_PREVIEW_PUSH__?: boolean }).__EZ_PREVIEW_PUSH__;

/** True once: a signed-in customer on a phone whose notification permission is still undecided. */
export async function shouldAskPush(): Promise<boolean> {
  if (preview()) return true;
  if (Platform.OS === "web") return false;
  try {
    if ((await AsyncStorage.getItem(KEY)) === "1") return false;
    const N = notifications(); if (!N) return false;
    const p = await N.getPermissionsAsync();
    return p.status === "undetermined" && p.canAskAgain !== false;
  } catch { return false; }
}

export function PushAsk({ visible, country, onDone }: { visible: boolean; country: string; onDone: () => void }) {
  const c = useColors(); const { t } = useT();
  const finish = async (yes: boolean) => {
    AsyncStorage.setItem(KEY, "1").catch(() => {});
    if (yes) await setupPush(true).catch(() => "");
    onDone();
  };
  const examples: [string, string, string][] = [
    [country ? t("Your {c} file is ready", { c: t(country) }) : t("Your file is ready"), t("Download it and book your appointment."), "doc.text.fill"],
    [t("One document needs replacing"), t("The bank statement is missing the last page."), "exclamationmark.circle.fill"],
    [t("Appointment tomorrow, 9:30"), t("Bring the printed set."), "calendar"],
  ];
  return (
    <SheetScaffold visible={visible} onClose={() => finish(false)} pose="phone" bubble title={t("Can I message you when your file moves?")} line={t("Only about your application. Exactly these:")} testID="push-ask"
      actions={<>
        <PrimaryButton title={t("Yes, notify me")} onPress={() => finish(true)} testID="push-yes" />
        <SecondaryButton title={t("Not now")} onPress={() => finish(false)} testID="push-later" />
        <Text variant="caption" tone="secondary" center>{t("You can change this any time in Settings.")}</Text>
      </>}>
      <View style={{ gap: S.xs }} accessible accessibilityLabel={examples.map((e) => `${e[0]}. ${e[1]}`).join(" ")}>
        {examples.map(([a, b, icon]) => (
          <View key={a} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: R.button, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Icon name={icon as any} size={18} color={c.accent} />
            <View style={{ flex: 1 }}><Text variant="callout" weight="600">{a}</Text><Text variant="note" tone="secondary">{b}</Text></View>
            <Text variant="caption" tone="secondary">EZvisa</Text>
          </View>
        ))}
      </View>
    </SheetScaffold>
  );
}
