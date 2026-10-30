// "What happens on the day" (canvas AppointmentSheet) and the packing list (canvas Appointment "Bring on the day").
// Fees come from config/pricing.ts (placeholders until the owner confirms them).
import { useEffect, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SheetScaffold, PrimaryButton, Text, Card, PressScale, Icon } from "../ui";
import { useColors, S } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { select } from "../../lib/haptics";
import { VISA_FEE_EUR } from "../../config/pricing";

export function AppointmentDaySheet({ visible, onClose, travellers }: { visible: boolean; onClose: () => void; travellers: number }) {
  const c = useColors(); const { t } = useT();
  const steps: [string, string][] = [
    [t("Arrive 15 minutes early"), t("Security check at the entrance, phones allowed")],
    [t("Hand over the EZvisa file"), t("The officer checks every page against the list")],
    [t("Biometrics"), t("Fingerprints and a photo, about 5 minutes each")],
    [t("Pay the visa fee"), t("€{e} each plus the centre fee, card or cash", { e: VISA_FEE_EUR })],
    [t("Keep the receipt"), t("You need it to collect the passports")],
  ];
  return (
    <SheetScaffold visible={visible} onClose={onClose} pose="calendar" bubble title={t("What happens on the day")} line={travellers > 1 ? t("About 40 minutes for two people") : t("About 30 minutes")} testID="day-sheet"
      actions={<PrimaryButton title={t("Got it")} onPress={onClose} />}>
      <Card padded>
        <View style={{ gap: S.md }}>
          {steps.map(([a, b], i) => (
            <View key={a} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.accentSoft }}><Text variant="note" weight="600" tone="accent">{i + 1}</Text></View>
              <View style={{ flex: 1, gap: 2 }}><Text variant="optionSm" weight="600">{a}</Text><Text variant="note" tone="secondary">{b}</Text></View>
            </View>
          ))}
        </View>
      </Card>
    </SheetScaffold>
  );
}

export const PACKING = ["Printed EZvisa file, every set", "Original passports", "Emirates IDs", "2 passport photos each, white background", "Original bank statements, stamped", "Fees: card or cash"] as const;

/** A checklist kept on this phone only (a personal aid, not application data): Bring on the day, Before you fly. */
export function Checklist({ storeKey, items, header }: { storeKey: string; items: readonly string[]; header: (done: number, total: number) => string }) {
  const c = useColors(); const { t } = useT();
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => { AsyncStorage.getItem(storeKey).then((v) => { try { setDone(v ? JSON.parse(v) : []); } catch { setDone([]); } }).catch(() => {}); }, [storeKey]);
  const toggle = (x: string) => { select(); setDone((d) => { const n = d.includes(x) ? d.filter((y) => y !== x) : [...d, x]; AsyncStorage.setItem(storeKey, JSON.stringify(n)).catch(() => {}); return n; }); };
  const count = items.filter((x) => done.includes(x)).length;
  return (
    <View style={{ gap: S.xs }}>
      <Text variant="note" weight="600" tone="secondary" accessibilityRole="header">{header(count, items.length)}</Text>
      <Card>
        {items.map((x, i) => {
          const on = done.includes(x);
          return (
            <PressScale key={x} onPress={() => toggle(x)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={t(x)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: S.md, paddingVertical: S.xs, borderTopWidth: i ? 1 : 0, borderColor: c.separator }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 0 : 1.5, borderColor: c.border, backgroundColor: on ? c.success : "transparent", alignItems: "center", justifyContent: "center" }}>
                {on && <Icon name="checkmark" size={12} color={c.onSuccess} weight="bold" />}
              </View>
              <Text variant="callout" style={{ flex: 1, textDecorationLine: on ? "line-through" : "none" }} tone={on ? "secondary" : undefined}>{t(x)}</Text>
            </PressScale>
          );
        })}
      </Card>
    </View>
  );
}

/** Bring on the day (canvas Appointment). */
export function PackingList({ appId }: { appId: string }) {
  const { t } = useT();
  return <Checklist storeKey={`ezvisa.packing.${appId}`} items={PACKING} header={(i, n) => t("Bring on the day · {i} of {n} packed", { i, n })} />;
}
