// Payment receipt (not a tax invoice until VAT/TRN is confirmed). One data source, receiptData(), so it can later
// switch to the website's GET /api/invoice/[id] without touching the screens.
import { Alert, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Application } from "./data";

export type Receipt = { title: string; rows: [string, string][]; footer: string; reference: string };
const esc = (x: string) => x.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));

/** Built only from the stored payment record (no invented fields). Later: fetch siteUrl(`/api/invoice/${a.id}`). */
export async function receiptData(a: Application, name: string, mail: string): Promise<Receipt> {
  const amt = a.payment_amount ?? a.total_amount;
  const paidAt = (a as any).paid_at ?? a.payments?.find((p) => ["paid", "completed"].includes(p.status))?.created_at ?? a.updated_at ?? a.created_at;
  const rows: [string, string][] = [
    ["Payment reference", a.payment_id ?? a.reference], ["Application", a.reference], ["Destination", a.countries?.name ?? a.destination_country ?? ""],
    ["Customer", name], ["Email", mail], ["Amount paid", amt != null ? `${Number(amt).toFixed(2)} ${a.currency || "AED"}` : ""],
    ["Status", a.payment_status ?? ""], ["Date", paidAt ? new Date(paidAt).toLocaleDateString() : ""],
  ];
  return { title: "Payment receipt", rows: rows.filter(([, v]) => !!v), footer: "Embassy and VFS fees are not included and are paid at the appointment.", reference: a.payment_id ?? a.reference };
}

export async function shareReceipt(a: Application, name: string, mail: string) {
  try {
    const r = await receiptData(a, name, mail);
    const html = `<html><body style="font-family:-apple-system,Helvetica;padding:32px"><h1 style="margin:0">EZvisa</h1><p style="color:#666">${esc(r.title)} · EZvisa visa application service</p>
      <table style="width:100%;border-collapse:collapse;margin-top:24px">${r.rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">${esc(k)}</td><td style="padding:8px 0;text-align:right;border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join("")}</table>
      <p style="color:#666;margin-top:24px;font-size:12px">${esc(r.footer)}</p></body></html>`;
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
