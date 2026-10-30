// Application status (canvas Status, StatusNextYou, StatusNextUs, DocRejected, FileReady, VisaApproved, VisaRefused):
// the hero card (country, travellers, dates, countdown), one "Next: you / Next: us" card with Globi and the one action
// that matters, and "To get later". Everything is derived from the row (status, payment, documents, notes): no
// promise the data can't back (no approval odds, no fixed delivery day).
import { useEffect } from "react";
import { View } from "react-native";
import { Card, Chip, PrimaryButton, SecondaryButton, Text, Flag, RowGroup, Row } from "../ui";
import { GlobiPose, GLOBI_SIZE, type GlobiPose as Pose } from "../globi/GlobiPose";
import { useColors, S } from "../../lib/theme";
import { useT, ltr } from "../../lib/i18n";
import { formatDetailRange } from "../../lib/dates";
import { isPaid, needsContinue, UPLOAD_STATUSES, type Application } from "../../lib/data";
import { isOpen, type CheckItem } from "../../lib/checklist";
import { appointmentOf } from "../../lib/appointment";
import { MISSING_LABEL, type MissingDoc } from "../../lib/missing";
import { track } from "../../lib/analytics";

const DAY = 864e5;
/** Days until departure (null when unknown or past). */
export const daysUntil = (iso?: string | null) => { if (!iso) return null; const d = Math.ceil((Date.parse(iso + "T00:00:00") - Date.now()) / DAY); return d >= 0 ? d : null; };
/** "Ahmed and Sara Khan" (same last name) / "Ahmed Khan and Sara Ali" / "Ahmed Khan". */
export function travellersLine(a: Application, and: string) {
  const [p, s] = a.applicants;
  if (!p) return a.full_name;
  if (!s) return [p.first_name, p.last_name].filter(Boolean).join(" ") || a.full_name;
  return p.last_name && p.last_name === s.last_name ? `${p.first_name} ${and} ${s.first_name} ${p.last_name}` : `${p.first_name} ${p.last_name} ${and} ${s.first_name} ${s.last_name}`.trim();
}

export function StatusHero({ a }: { a: Application }) {
  const { t, lang } = useT();
  const name = a.countries?.name ?? "";
  const n = daysUntil(a.entry_date);
  const line = [travellersLine(a, t("and")), a.entry_date && ltr(formatDetailRange(a.entry_date, a.exit_date, lang)), n != null && n > 0 ? t("in {n} days", { n }) : null].filter(Boolean).join(" · ");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }} testID="status-hero">
      <Flag country={name} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="pageTitle" accessibilityRole="header" numberOfLines={1}>{t(name || "Application")}</Text>
        <Text variant="note" tone="secondary" numberOfLines={2}>{line}</Text>
      </View>
    </View>
  );
}

export type NextKind = "pay" | "continue" | "fix" | "upload" | "us" | "ready" | "book" | "appointment" | "decision" | "approved" | "refused" | "done" | "cancelled";
export type Next = { kind: NextKind; who: "you" | "us" | null; pose: Pose; title: string; body: string; vars?: Record<string, string | number>; cta?: string; alt?: string; item?: CheckItem };

/** The one next thing, from the real status, payment and documents. */
export function nextOf(a: Application, list: CheckItem[] | null): Next {
  const uploadsOpen = UPLOAD_STATUSES.includes(a.status);
  const open = uploadsOpen && list ? list.filter(isOpen) : [];
  const rejected = open.filter((i) => i.state === "rejected");
  const country = a.countries?.name ?? "";
  if (a.status === "cancelled") return { kind: "cancelled", who: null, pose: "waiting", title: "Cancelled", body: "This application was cancelled. Nothing more to do." };
  if (a.status === "rejected") return { kind: "refused", who: null, pose: "puzzled", title: "Not approved this time", body: "A specialist will read the letter with you and explain your options.", cta: "Talk to a specialist", alt: "Apply again" };
  if (a.status === "completed") return { kind: "approved", who: null, pose: "celebrate", title: "Visa approved", body: "Have a great trip. Your file stays here for next time.", cta: "Share the news", alt: "Apply again" };
  if (!isPaid(a)) return { kind: "pay", who: "you", pose: "wallet", title: "Pay to start", body: a.payment_status === "failed" ? "The last payment didn't go through." : "Documents unlock after payment.", cta: "Pay securely" };
  if (needsContinue(a)) return { kind: "continue", who: "you", pose: "writing", title: "A few more questions", body: "Trip dates, passport and job. About 3 minutes.", cta: "Continue application" };
  if (rejected.length) return { kind: "fix", who: "you", pose: "magnify", item: rejected[0], title: rejected.length === 1 ? "One document needs replacing" : "{n} documents need replacing", vars: { n: rejected.length },
    body: rejected[0].reason || "Please upload a new copy.", cta: "Upload new {doc}", alt: "Ask why" };
  if (open.length) return { kind: "upload", who: "you", pose: "documents", item: open[0], title: open.length === 1 ? "1 document" : "{n} documents", vars: { n: open.length },
    body: open.slice(0, 3).map((i) => i.req.title).join(", "), cta: open.length === 1 ? "Upload 1 document" : "Upload {n} documents" };
  const ap = appointmentOf(a);
  if (ap && Date.parse(ap.at) > Date.now() - 6 * 3600e3) return { kind: "appointment", who: "you", pose: "calendar", title: "Your appointment", body: ap.centre ?? "", cta: "View appointment" };
  if (ap) return { kind: "decision", who: "us", pose: "waiting", title: "Waiting for the decision", body: "The consulate usually decides within about 15 days. I'll message you when it changes." };
  if (["ready", "approved"].includes(a.status)) return { kind: "ready", who: "you", pose: "celebrate", title: "Your {c} file is ready", vars: { c: country }, body: "Print the full set for the appointment, then book your slot.", cta: "Book the appointment", alt: "Open documents" };
  if (a.status === "appointment_booked") return { kind: "book", who: "you", pose: "calendar", title: "Appointment booked", body: "Add the date so I can remind you the day before.", cta: "Add the date" };
  return { kind: "us", who: "us", pose: "writing", title: "Nothing to do", body: "The team is writing your file. It's usually ready 1 to 2 days after review starts; I'll message you.", };
}

export function NextCard({ n, onPrimary, onAlt, busy }: { n: Next; onPrimary?: () => void; onAlt?: () => void; busy?: boolean }) {
  const c = useColors(); const { t } = useT();
  const big = n.kind === "approved" || n.kind === "refused" || n.kind === "ready";
  const docName = n.item ? t(n.item.req.title).toLowerCase() : "";
  useEffect(() => { if (n.who) track("status_view", { next: n.who }); }, [n.kind]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card padded testID={`next-${n.kind}`} style={n.kind === "fix" ? { borderColor: c.warning } : undefined}>
      <View style={{ gap: S.md }}>
        <View style={{ flexDirection: "row", alignItems: big ? "center" : "flex-start", gap: S.sm }}>
          <GlobiPose pose={n.pose} size={big ? 96 : GLOBI_SIZE.info + 8} style={{ margin: -6 }} />
          <View style={{ flex: 1, gap: 4 }} accessible accessibilityLabel={[n.who ? t(n.who === "you" ? "Next: you" : "Next: us") : "", t(n.title, n.vars), t(n.body)].filter(Boolean).join(". ")}>
            {!!n.who && <View style={{ alignSelf: "flex-start" }}><Chip label={t(n.who === "you" ? "Next: you" : "Next: us")} tone={n.who === "you" ? "accent" : "neutral"} /></View>}
            <Text variant={big ? "resultTitle" : "question"}>{t(n.title, n.vars)}</Text>
            {!!n.body && <Text variant="note" tone="secondary">{n.kind === "fix" ? n.body : t(n.body)}</Text>}
          </View>
        </View>
        {!!n.cta && !!onPrimary && <PrimaryButton title={t(n.cta, { ...n.vars, doc: docName })} onPress={onPrimary} loading={busy} testID="next-primary" />}
        {!!n.alt && !!onAlt && <SecondaryButton title={t(n.alt)} onPress={onAlt} whatsapp={n.kind === "fix"} testID="next-alt" />}
      </View>
    </Card>
  );
}

/** "To get later" (canvas): documents the customer said they don't have yet; "Add" opens the documents list. */
export function ToGetLater({ items, onAdd }: { items: MissingDoc[]; onAdd: () => void }) {
  const { t } = useT();
  if (!items.length) return null;
  return (
    <RowGroup header={t("To get later")}>
      {items.map((m) => <Row key={m} label={t(MISSING_LABEL[m])} value={t("Add")} tint onPress={onAdd} testID={`later-${m}`} />)}
    </RowGroup>
  );
}
