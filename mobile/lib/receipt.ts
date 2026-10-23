// Payment receipt (EZvisa is not VAT-registered: no VAT or TRN rows). One data source, receiptData(), so it can later
// switch to the website's GET /api/invoice/[id] without touching the screens.
import { Alert, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Application } from "./data";
import { LOGO_PNG } from "./logoData";

export type Receipt = { title: string; rows: [string, string][]; footer: string; reference: string };
const esc = (x: string) => x.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));

/** Built only from the stored payment record (no invented fields). Later: fetch siteUrl(`/api/invoice/${a.id}`). */
export async function receiptData(a: Application, name: string, mail: string): Promise<Receipt> {
  const amt = a.payment_amount ?? a.total_amount;
  // No paid_at column, card brand/last-4 or invoice number exist: date = the payment's last update, number = the application ref.
  const pay = a.payments?.find((p) => ["paid", "completed"].includes(p.status));
  const at = (pay as any)?.updated_at ?? pay?.created_at ?? a.updated_at ?? a.created_at;
  const rows: [string, string][] = [
    ["Receipt number", a.reference], ["Destination", a.countries?.name ?? a.destination_country ?? ""],
    ["Customer", name], ["Email", mail], ["Amount paid", amt != null ? `${Number(amt).toFixed(2)} ${a.currency || "AED"}` : ""],
    ["Payment method", "Paid via Ziina"], ["Ziina payment ID", a.payment_id ?? ""], ["Date", at ? new Date(at).toLocaleDateString() : ""],
  ];
  return { title: "Payment receipt", rows: rows.filter(([, v]) => !!v), footer: "Embassy and VFS fees are not included and are paid at the appointment.", reference: a.reference };
}

export async function shareReceipt(a: Application, name: string, mail: string) {
  try {
    const r = await receiptData(a, name, mail);
    const html = `<html><body style="font-family:-apple-system,Helvetica;padding:32px">
      <div style="padding-bottom:16px;border-bottom:1px solid #E5E5EA"><img src="${LOGO_PNG}" alt="EZvisa" style="height:32px"/><p style="color:#666;margin:12px 0 0">${esc(r.title)} · EZvisa visa application service</p></div>
      <table style="width:100%;border-collapse:collapse;margin-top:24px">${r.rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">${esc(k)}</td><td style="padding:8px 0;text-align:right;border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join("")}</table>
      <p style="color:#666;margin-top:24px;font-size:12px">${esc(r.footer)}</p>
      <p style="color:#8E8E93;margin-top:32px;padding-top:12px;border-top:1px solid #E5E5EA;font-size:12px">EZvisa · ezvisa.net</p></body></html>`;
    if (Platform.OS === "web") {
      // Web: open the receipt in a new tab (the user can print/save it as PDF there); if pop-ups are blocked, download the HTML.
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const w = window.open(url, "_blank");
      if (!w) { const el = document.createElement("a"); el.href = url; el.download = `EZvisa-receipt-${r.reference}.html`; document.body.appendChild(el); el.click(); el.remove(); }
      setTimeout(() => URL.revokeObjectURL(url), 60000); return;
    }
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `${r.title} ${r.reference}` });
  } catch (e: any) { Alert.alert("Couldn't create the receipt", e?.message ?? String(e)); }
}
