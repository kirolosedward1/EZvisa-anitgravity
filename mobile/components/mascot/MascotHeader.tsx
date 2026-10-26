// Globi beside a brand-blue speech bubble, above the formal question label. Used by QuestionView on every wizard and
// Continue-application question. At accessibility text sizes Globi moves above the bubble so the line can wrap freely.
import React from "react";
import { View } from "react-native";
import { Globi } from "./Globi";
import { promptFor, fillPrompt } from "./prompts";
import { Text } from "../ui";
import { useColors, useLargeText, S, R } from "../../lib/theme";
import { useT } from "../../lib/i18n";
import type { WizardForm } from "../../lib/wizard";

export function MascotHeader({ questionId, f }: { questionId: string; f: WizardForm }) {
  const c = useColors(); const { t, rtl } = useT(); const big = useLargeText();
  const p = promptFor(questionId);
  if (!p.say) return null;
  const line = fillPrompt(t(p.say), f);
  const size = big ? 72 : 88;
  return (
    <View style={{ flexDirection: big ? "column" : rtl ? "row-reverse" : "row", alignItems: big ? "flex-start" : "center", gap: S.sm }} testID="mascot-header">
      <Globi pose={p.pose} mood={p.mood} tie={p.tie} size={size} />
      <View style={{ flex: big ? undefined : 1, alignSelf: "stretch", justifyContent: "center" }}>
        <View style={{ position: "absolute", top: "50%", marginTop: -6, [rtl ? "right" : "left"]: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: c.primaryFill }} />
        <View style={{ backgroundColor: c.primaryFill, paddingHorizontal: S.md, paddingVertical: S.sm, borderRadius: R.xl }}>
          <Text variant="headline" color={c.onPrimary} testID="mascot-bubble">{line}</Text>
        </View>
      </View>
    </View>
  );
}
