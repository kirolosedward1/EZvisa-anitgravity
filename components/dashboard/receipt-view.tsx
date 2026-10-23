"use client"

import Image from "next/image"
import { format, parseISO } from "date-fns"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadReceiptPdf } from "@/lib/receipt-pdf"
import { getReference } from "@/lib/application-status"
import type { VisaApplication } from "@/lib/types/visa-application"

export function ReceiptView({ app }: { app: VisaApplication }) {
  const reference = getReference(app.tracking_token) || app.id || "application"
  const amount = typeof app.payment_amount === "number" ? app.payment_amount : null
  const paidOn = app.paid_at || app.updated_at
  const dateLabel = paidOn ? format(parseISO(paidOn), "d MMM yyyy, h:mm a") : ""
  const lines = [
    "EZvisa",
    "Receipt",
    `Receipt number: ${reference}`,
    amount === null ? "" : `Amount: ${amount} AED`,
    "Status: Paid",
    "Paid via Ziina",
    dateLabel ? `Date: ${dateLabel}` : "",
    app.destination_country ? `Destination: ${app.destination_country}` : "",
    app.full_name ? `Customer: ${app.full_name}` : "",
    app.email ? `Email: ${app.email}` : "",
    "Embassy and VFS fees are not included.",
  ].filter(Boolean)

  return (
    <article className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <Image src="/images/logo-main.png" alt="EZvisa" width={140} height={40} className="h-8 w-auto" />
        <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
          Paid
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Receipt</h1>
        <p className="ltr-isolate text-sm text-muted-foreground">{reference}</p>
      </div>
      {amount === null ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          This payment does not have an amount on file, so a receipt cannot be issued.
        </p>
      ) : (
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="ltr-isolate font-semibold text-foreground">{amount} AED</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Paid via</dt>
            <dd className="font-medium text-foreground">Ziina</dd>
          </div>
          {dateLabel && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="ltr-isolate font-medium text-foreground">{dateLabel}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Destination</dt>
            <dd className="font-medium text-foreground">{app.destination_country}</dd>
          </div>
        </dl>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">Embassy and centre fees are not included. No VAT is charged.</p>
      {amount !== null && (
        <Button
          type="button"
          className="rounded-full"
          onClick={() => downloadReceiptPdf(`EZvisa-Receipt-${reference}.pdf`, lines)}
        >
          <Download />
          Download PDF
        </Button>
      )}
    </article>
  )
}
