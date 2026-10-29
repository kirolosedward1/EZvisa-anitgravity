"use client"

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import React, { useState } from "react"
import { LocaleLink } from "@/components/locale-link"
import { Printer, Download, ArrowLeft, CheckCircle2, ShieldAlert, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LangText } from "@/components/lang-text"
import { translations } from "@/lib/translations"

interface DossierViewerClientProps {
  htmlContent: string
  token: string
  applicantName: string
  destinationCountry: string
  whatsAppUrl: string
}

export function DossierViewerClient({
  htmlContent,
  token,
  applicantName,
  destinationCountry,
  whatsAppUrl
}: DossierViewerClientProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 150)
  }

  return (
    <div className="ez-dossier-page min-h-screen">
      {/* Top Floating Control Toolbar (Hidden in print) */}
      <header className="ez-dossier-toolbar sticky top-0 z-50 border-b border-border bg-white print:hidden">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground">
              <LocaleLink href={`/track/${token}`}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Your application
              </LocaleLink>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-medium text-foreground">Your visa file</h1>

              </div>
              <p className="text-xs text-muted-foreground">
                {applicantName} &bull; {destinationCountry} Schengen
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              {isPrinting ? "Preparing Print..." : "Print Dossier (A4)"}
            </Button>

            <Button asChild variant="outline" size="sm" className="text-xs font-medium">
              <a href={`/api/download-document?token=${encodeURIComponent(token)}&format=html`}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Save HTML
              </a>
            </Button>

            <Button asChild variant="outline" size="sm" className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400">
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4" />
                <LangText en={translations.en.support.whatsApp} ar={translations.ar.support.whatsApp} />
              </a>
            </Button>
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border-t border-blue-100 dark:border-blue-900/40 px-4 py-2 text-xs text-blue-800 dark:text-blue-300">
          <div className="container max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                <strong>Appointment Tip:</strong> Print on clean white A4 paper. Present documents in the exact order shown in the 11-step submission checklist.
              </span>
            </div>
            <span className="hidden md:inline-block text-[11px] text-blue-600 dark:text-blue-400">
              Ctrl+P / Cmd+P to print or save as PDF
            </span>
          </div>
        </div>
      </header>

      {/* Main Dossier Content Container */}
      <main className="container max-w-4xl mx-auto py-8 px-4 print:p-0 print:m-0 print:max-w-none">
        <div className="ez-dossier-paper bg-white text-slate-900 border border-border p-4 sm:p-12 print:border-none print:p-0">
          <div 
            className="dossier-rendered-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        </div>
      </main>

      {/* Print-specific style overrides */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>
    </div>
  )
}
