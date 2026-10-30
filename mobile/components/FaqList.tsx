// The FAQ accordion (lib/faq.ts, the website's answers): one question open at a time. Used by Help (all questions,
// searchable) and Home (four that fit where the customer is, see faqFor).
import { useState } from "react";
import { View } from "react-native";
import { Card, Icon, PressScale, Text } from "./ui";
import { useColors, S } from "../lib/theme";
import { useT } from "../lib/i18n";
import { FAQ, type Faq } from "../lib/faq";
import { isPaid, type Application } from "../lib/data";
import { select } from "../lib/haptics";

/** Home's four questions: before applying, what we do and what it costs; before paying, the price and paying first;
 *  after paying, documents and timing. */
export function faqFor(a?: Pick<Application, "status" | "payment_status"> | null): Faq[] {
  const ids = !a || a.status === "draft" ? ["service", "cost", "documents", "who"]
    : !isPaid(a) ? ["cost", "later", "service", "chances"]
    : ["documents", "prep-time", "later", "chances"];
  return ids.map((id) => FAQ.find((f) => f.id === id)).filter(Boolean) as Faq[];
}

export function FaqList({ list, empty, testID }: { list: Faq[]; empty?: string; testID?: string }) {
  const c = useColors(); const { lang } = useT(); const L = lang === "ar" ? "ar" : "en";
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card testID={testID}>
      {list.length === 0 && !!empty && <Text variant="callout" tone="secondary" style={{ padding: S.md }}>{empty}</Text>}
      {list.map((f, i) => {
        const on = open === f.id;
        return (
          <View key={f.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: c.separator }}>
            <PressScale onPress={() => { select(); setOpen(on ? null : f.id); }} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={f.q[L]} testID={`faq-${f.id}`}
              style={{ flexDirection: "row", alignItems: "center", gap: S.sm, minHeight: 52, paddingHorizontal: S.md, paddingVertical: S.sm }}>
              <Text variant="callout" weight="600" style={{ flex: 1 }}>{f.q[L]}</Text>
              <Icon name={on ? "chevron.up" : "chevron.down"} size={14} color={c.textSecondary} />
            </PressScale>
            {on && <Text variant="note" tone="secondary" style={{ paddingHorizontal: S.md, paddingBottom: S.md }}>{f.a[L]}</Text>}
          </View>
        );
      })}
    </Card>
  );
}
