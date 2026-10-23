// "What you'll need", built from the real checklist (lib/data.ts requirementsFor), so it always matches the upload
// page: what the customer provides, and what EZvisa prepares (provided_by_ezvisa). A row opens a short tip only when
// the repo has one (TIPS); otherwise it has no chevron and does nothing.
import { useState } from "react";
import { View } from "react-native";
import { requirementsFor, type Requirement } from "../../lib/data";
import { useT } from "../../lib/i18n";
import { S } from "../../lib/theme";
import { Sheet, Text, type IconName } from "../ui";
import { Group, GroupHeader, InfoRow } from "./Row";

const ICONS: Record<string, IconName> = {
  passportCopy: "person.text.rectangle", residencyCopy: "creditcard.fill", photo: "camera.fill",
  bankStatement: "building.columns.fill", nocCertificate: "doc.text.fill", final_package: "checkmark.seal.fill",
};
/** One-paragraph tips, from the website's document list (components/document-requirements-page.tsx). The website has
 *  none for the UAE residence visa, and its bank statement line ("last 6 months") disagrees with the checklist's
 *  "Last 3-6 months", so those two rows have no tip. */
export const TIPS: Record<string, string> = {
  passportCopy: "Your passport must be valid for at least 3 months after your planned stay, with at least 2 blank pages.",
  photo: "Two recent colour photos, 35 × 45 mm, with a white background.",
  nocCertificate: "A letter from your employer confirming your job and your approved leave.",
  final_package: "A cover letter written for you that explains the purpose of your visit, and a day-by-day plan of your trip with the bookings.",
};
/** Subtitle per row: the checklist's own description; the NOC says who it is for. */
const subtitleOf = (r: Requirement) => (r.document_type === "nocCertificate" ? "If you are employed" : r.description ?? undefined);

export function Requirements() {
  const { t } = useT(); const [open, setOpen] = useState<Requirement | null>(null); const [visible, setVisible] = useState(false); // keep the content while the sheet slides away
  const reqs = requirementsFor(null); // employment is not known before applying, so the NOC row shows with its condition
  const row = (r: Requirement) => {
    const tip = TIPS[r.document_type]; const sub = subtitleOf(r);
    return <InfoRow key={r.id} icon={ICONS[r.document_type] ?? "doc.fill"} title={t(r.title)} subtitle={sub && t(sub)} onPress={tip ? () => { setOpen(r); setVisible(true); } : undefined}
      a11yHint={tip ? t("Shows a tip") : undefined} testID={`req-${r.document_type}`} />;
  };
  return (
    <View style={{ gap: S.md }} testID="country-requirements">
      <View>
        <GroupHeader title={t("What you'll need")} />
        <Text variant="footnote" tone="secondary" weight="600" style={{ marginHorizontal: S.gutter + S.md, marginBottom: S.xs }} accessibilityRole="header">{t("You provide")}</Text>
        <Group>{reqs.filter((r) => !r.provided_by_ezvisa).map(row)}</Group>
      </View>
      <View>
        <Text variant="footnote" tone="secondary" weight="600" style={{ marginHorizontal: S.gutter + S.md, marginBottom: S.xs }} accessibilityRole="header">{t("We prepare")}</Text>
        <Group footer={t("You can start without all of these. Missing documents can be added after payment.")}>{reqs.filter((r) => r.provided_by_ezvisa).map(row)}</Group>
      </View>
      <Sheet visible={visible} onClose={() => setVisible(false)} title={open ? t(open.title) : undefined} closeLabel={t("Close")} testID="req-sheet">
        <Text variant="body">{open ? t(TIPS[open.document_type] ?? "") : ""}</Text>
      </Sheet>
    </View>
  );
}
