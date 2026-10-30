// Rate your experience (canvas RateExperience), once per finished application: stars, what went well, and what to fix.
// It is sent to the team by email (no app backend stores feedback), and never asked again for this application.
// The App Store review prompt needs a native module, so it comes with the next store build.
import { useEffect, useState } from "react";
import { Linking, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card, Text, PressScale, Icon, PrimaryButton } from "../ui";
import { useColors, S, R, T } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import { select, success } from "../../lib/haptics";
import { EMAIL } from "../../lib/config";

const GOOD = ["Fast", "Clear steps", "Support", "Globi", "Price", "Appointment help"] as const;

export function RateCard({ appId, reference }: { appId: string; reference: string }) {
  const c = useColors(); const { t } = useT();
  const key = `ezvisa.rated.${appId}`;
  const [done, setDone] = useState<boolean | null>(null);
  const [stars, setStars] = useState(0); const [good, setGood] = useState<string[]>([]); const [fix, setFix] = useState("");
  useEffect(() => { AsyncStorage.getItem(key).then((v) => setDone(v === "1")).catch(() => setDone(false)); }, [key]);
  if (done !== false) return null;
  const close = () => { AsyncStorage.setItem(key, "1").catch(() => {}); setDone(true); };
  const send = () => {
    const body = [`${t("Rating")}: ${stars}/5`, good.length ? `${t("What went well")}: ${good.join(", ")}` : "", fix.trim() ? `${t("What to fix")}: ${fix.trim()}` : "", "", reference].filter((x) => x !== "").join("\n");
    Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent(`EZvisa app feedback · ${reference}`)}&body=${encodeURIComponent(body)}`).catch(() => {});
    success(); close();
  };
  return (
    <Card padded testID="rate-card">
      <View style={{ gap: S.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="question" accessibilityRole="header">{t("How was it?")}</Text>
          <PressScale onPress={close} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }} testID="rate-skip"><Text variant="callout" tone="secondary">{t("Skip")}</Text></PressScale>
        </View>
        <View style={{ flexDirection: "row", gap: S.xs }} accessibilityRole="radiogroup" accessibilityLabel={t("Rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <PressScale key={n} onPress={() => { select(); setStars(n); }} accessibilityRole="radio" accessibilityState={{ checked: stars === n }} aria-checked={stars === n} accessibilityLabel={t("{n} of 5", { n })}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} testID={`rate-${n}`}>
              <Icon name="star.fill" size={30} color={n <= stars ? c.accent : c.fill} />
            </PressScale>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
          {GOOD.map((g) => { const on = good.includes(g); return (
            <PressScale key={g} onPress={() => { select(); setGood((l) => (on ? l.filter((x) => x !== g) : [...l, g])); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={t(g)}
              style={{ minHeight: 40, paddingHorizontal: S.md, borderRadius: R.round, justifyContent: "center", backgroundColor: on ? c.accentFill : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border }}>
              <Text variant="note" weight="600" color={on ? c.onAccent : c.label}>{t(g)}</Text>
            </PressScale>); })}
        </View>
        <TextInput value={fix} onChangeText={setFix} placeholder={t("Anything we should fix?")} placeholderTextColor={c.textSecondary} multiline accessibilityLabel={t("Anything we should fix?")}
          style={[T.callout, { color: c.label, minHeight: 80, borderRadius: R.input, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: S.sm, textAlignVertical: "top" }]} />
        <PrimaryButton title={t("Send")} onPress={send} disabled={!stars} testID="rate-send" />
      </View>
    </Card>
  );
}
