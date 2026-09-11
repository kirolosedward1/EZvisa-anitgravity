"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Printer, Download, ArrowLeft, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  const handleDownloadHtml = () => {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `EZvisa_Consular_Dossier_${destinationCountry.replace(/\s+/g, "_")}_${token.substring(0, 8).toUpperCase()}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Top Floating Control Toolbar (Hidden in print) */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground">
              <Link href={`/track/${token}`}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Case Dashboard
              </Link>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-foreground">Consular Dossier Pack</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                  Ready to Submit
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {applicantName} &bull; {destinationCountry} Schengen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              {isPrinting ? "Preparing Print..." : "Print Dossier (A4)"}
            </Button>

            <Button
              onClick={handleDownloadHtml}
              variant="outline"
              size="sm"
              className="text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Save HTML
            </Button>

            <Button asChild variant="outline" size="sm" className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp Support
              </a>
            </Button>
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border-t border-blue-100 dark:border-blue-900/40 px-4 py-2 text-xs text-blue-800 dark:text-blue-300">
          <div className="container max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
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
        <div className="bg-white text-slate-900 shadow-xl rounded-xl border border-slate-200/80 p-8 sm:p-12 print:shadow-none print:border-none print:p-0 print:rounded-none">
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
