"use client"

import { Image } from "@/components/image"
import { format, parseISO } from "date-fns"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadReceiptPdf } from "@/lib/receipt-pdf"
import { getReference } from "@/lib/application-status"
import { PRICE_AED, referenceOf } from "@/lib/shared/wizard-contract"
import type { VisaApplication } from "@/lib/types/visa-application"

export function ReceiptView({ app }: { app: VisaApplication }) {
  // The same EZ- reference as the dashboard, the app and the emails.
  const reference = app.id ? referenceOf(app.id) : getReference(app.tracking_token) || "application"
  const amount = typeof app.payment_amount === "number" ? app.payment_amount : null
  const applicants = amount !== null && amount >= PRICE_AED * 2 ? 2 : 1
  const paidOn = app.paid_at || app.updated_at
  const dateLabel = paidOn ? format(parseISO(paidOn), "d MMM yyyy, h:mm a") : ""
  const item = `${app.destination_country || "Schengen"} visa application service, ${applicants} applicant${applicants === 1 ? "" : "s"}`
  const lines = [
    "EZvisa",
    "Receipt",
    `Receipt number: ${reference}`,
    dateLabel ? `Date: ${dateLabel}` : "",
    app.full_name ? `Customer: ${app.full_name}` : "",
    app.email ? `Email: ${app.email}` : "",
    amount === null ? "" : `${item}: ${amount} AED`,
    amount === null ? "" : `Total paid: ${amount} AED`,
    "Paid via Ziina",
    "Embassy and visa centre fees are not included. No VAT is charged.",
  ].filter(Boolean)

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="flex items-start justify-between gap-4 p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <Image src="/images/logo-main.png" alt="EZvisa" width={140} height={40} className="h-7 w-auto" />
          <div className="flex flex-col gap-0.5">
            <h1 className="panel-title panel-title-lg text-foreground">Receipt</h1>
            <p className="ltr-isolate text-sm tabular-nums text-muted-foreground">{reference}</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">Paid</span>
      </div>

      <dl className="grid grid-cols-1 gap-4 border-y border-border/70 px-6 py-5 text-sm sm:grid-cols-3 sm:px-8">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Billed to</dt>
          <dd className="font-medium text-foreground">{app.full_name}</dd>
          {app.email ? <dd className="ltr-isolate truncate text-muted-foreground">{app.email}</dd> : null}
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Date</dt>
          <dd className="ltr-isolate font-medium text-foreground">{dateLabel || "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Paid via</dt>
          <dd className="font-medium text-foreground">Ziina</dd>
        </div>
      </dl>

      {amount === null ? (
        <p className="px-6 py-6 text-sm leading-relaxed text-muted-foreground sm:px-8">
          This payment has no amount on file, so we can&apos;t issue a receipt here. Message us on WhatsApp and we&apos;ll send one.
        </p>
      ) : (
        <div className="flex flex-col gap-3 px-6 py-6 text-sm sm:px-8">
          <div className="flex items-start justify-between gap-6">
            <span className="text-foreground">{item}</span>
            <span className="ltr-isolate shrink-0 tabular-nums text-foreground">{amount} AED</span>
          </div>
          <div className="flex items-center justify-between gap-6 border-t border-border/70 pt-3 text-base font-semibold">
            <span className="text-foreground">Total paid</span>
            <span className="ltr-isolate tabular-nums text-foreground">{amount} AED</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 bg-secondary/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-xs leading-relaxed text-muted-foreground">Embassy and visa centre fees are not included. No VAT is charged.</p>
        {amount !== null && (
          <Button type="button" className="shrink-0 rounded-full" onClick={() => downloadReceiptPdf(`EZvisa-Receipt-${reference}.pdf`, lines)}>
            <Download />
            Download PDF
          </Button>
        )}
      </div>
    </article>
  )
}
