import { redirect } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { FileText, CheckCircle2, Clock, MapPin, Search, Calendar, Upload, ExternalLink, Download, HelpCircle, Mail, Printer, AlertCircle, Sparkles, Briefcase, XCircle, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"
import { DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data"
import { DemoModeBar } from "@/components/dashboard/demo-mode-bar"
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons"
import { PayNowButton } from "@/components/dashboard/pay-now-button"
import { getSessionUser, listApplicationsFor, uploadPath, continuePath, trackPath } from "@/lib/applications"
import { isPaid, needsContinue, parseNotes, referenceOf, requiredFlags, STATUS_LABEL, FINISHED_STATUSES, FILE_READY_STATUSES, DOC_FLAG, REQUIREMENTS, PRICE_AED } from "@/lib/shared/wizard-contract"
import type { VisaApplication } from "@/lib/types/visa-application"

/**
 * The customer dashboard. Reads the same rows the EZvisa app reads (email = the signed-in user's email) and derives
 * the next step with the same rules (lib/shared/wizard-contract.ts): pay → continue application (passport number,
 * employment) → upload documents → wait for the file.
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ id?: string; demo?: string }> }) {
  const resolvedSearchParams = await searchParams
  const user = await getSessionUser(resolvedSearchParams.demo)

  if (!user) {
    redirect("/login?next=/dashboard")
  }

  const allApps = await listApplicationsFor(user)
  // Cases the customer discarded (unpaid, cancelled from the app) stay hidden, like in the app.
  const relatedApps = allApps.filter((a) => !(a.application_status === "cancelled" && !isPaid(a) && parseNotes(a.additional_notes).discarded_at))

  if (relatedApps.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className="min-h-[75vh] bg-background flex flex-col items-center justify-center p-4 py-12">
          <div className="w-full max-w-lg bg-card border rounded-2xl p-6 sm:p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">No Applications Found</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              We couldn&apos;t find any visa files registered to <strong className="text-foreground">{user.email}</strong>. Applications started in the EZvisa app with this email appear here too.
            </p>
            <div className="flex justify-center gap-3 mb-8">
              <Button asChild>
                <Link href="/apply">Start New Application</Link>
              </Button>
              <form action="/api/auth/signout" method="POST">
                <Button type="submit" variant="outline">Sign Out</Button>
              </form>
            </div>

            {/* Quick Demo Access */}
            <div className="text-left pt-6 border-t border-border">
              <DemoLoginButtons next="/dashboard" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // 2. Identify the active application
  const activeAppId = resolvedSearchParams.id || relatedApps[0].id
  const mainApp: VisaApplication = relatedApps.find((app) => app.id === activeAppId) || relatedApps[0]
  const mainId = mainApp.id ?? ""
  const notes = parseNotes(mainApp.additional_notes)
  const status = mainApp.application_status || "submitted"
  const paid = isPaid(mainApp)
  const isDraft = status === "draft"
  const finished = FINISHED_STATUSES.includes(status)
  const isReady = FILE_READY_STATUSES.includes(status)
  const continueNeeded = needsContinue(mainApp)
  // Documents the case needs: NOC only for employees (same rule as the app's checklist).
  const employmentStatus = notes.wizard?.employmentStatus ?? notes.employmentStatus
  const neededFlags = requiredFlags(employmentStatus)
  const missingFlags = neededFlags.filter((flag) => !mainApp[flag])
  const hasAllDocs = missingFlags.length === 0
  const reference = mainId ? referenceOf(mainId) : "EZ-"
  const amount = mainApp.payment_amount ? `${mainApp.payment_amount} AED` : paid ? `${PRICE_AED} AED` : `${PRICE_AED} AED (${notes.spouseAccompanying === "yes" ? "x2 with spouse" : "per traveller"})`
  const currentScenario: DemoScenario = (user.scenario ||
    (user.email.includes("pending") ? "pending" : user.email.includes("family") ? "multi" : "ready")) as DemoScenario

  const checklist = REQUIREMENTS.filter((r) => !r.provided_by_ezvisa && neededFlags.includes(DOC_FLAG[r.document_type]))
  const whatsappUrl = getCaseTrackingWhatsAppUrl(mainId, mainApp.destination_country)

  return (
    <>
      <SiteHeader />
      {user.demo && (
        <DemoModeBar
          currentScenario={currentScenario}
          applicantName={mainApp.full_name || "Demo Applicant"}
          applicantEmail={user.email}
        />
      )}
      <main className="min-h-[100dvh] bg-background pb-20 pt-28">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Applicant Dashboard</h1>
                {user.demo && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    <Sparkles className="w-3 h-3" /> Demo Sandbox Active
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" /> {user.email}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/apply">New Application</Link>
              </Button>
              <form action="/api/auth/signout" method="POST">
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  {user.demo ? "Exit Demo" : "Sign Out"}
                </Button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              {/* Application Selector */}
              {relatedApps.length > 1 && (
                <div className="bg-card rounded-xl shadow-sm border p-4">
                  <h2 className="font-semibold text-foreground mb-3 text-sm">Your Applications</h2>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {relatedApps.map((app) => (
                      <Link key={app.id} href={`/dashboard?id=${app.id}`}>
                        <div className={`px-4 py-2.5 rounded-lg border flex-shrink-0 cursor-pointer transition-colors ${app.id === mainApp.id ? "bg-primary/5 border-primary text-primary font-semibold" : "bg-transparent border-border hover:bg-muted"}`}>
                          <div className="text-sm font-medium">{app.destination_country} Visa</div>
                          <div className="text-xs opacity-75">{app.id ? referenceOf(app.id) : ""} &bull; {STATUS_LABEL[app.application_status || "submitted"] ?? app.application_status}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Banner */}
              <div className="bg-card rounded-xl shadow-sm border p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{mainApp.destination_country} Visa File</h2>
                        <p className="text-muted-foreground">Applicant: <strong className="text-foreground">{mainApp.full_name}</strong></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary">
                      {STATUS_LABEL[status] ?? status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Updated {format(new Date(mainApp.updated_at || mainApp.created_at || Date.now()), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>

                {/* Next step, derived with the same rules as the app */}
                {isDraft ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 flex items-start gap-4">
                    <PenLine className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-blue-800 dark:text-blue-500 font-semibold mb-1">Draft: not submitted yet</h3>
                      <p className="text-blue-700/90 dark:text-blue-500/90 text-sm mb-4">
                        Your answers are saved to your account. Continue where you left off, on the website or in the EZvisa app.
                      </p>
                      <Button asChild size="sm" className="font-semibold">
                        <Link href={`/apply?draft=${mainId}`}>Continue draft</Link>
                      </Button>
                    </div>
                  </div>
                ) : finished ? (
                  <div className={`${status === "completed" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/40 border-border"} border rounded-xl p-5 flex items-start gap-4`}>
                    {status === "completed" ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-6 h-6 text-muted-foreground shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 text-foreground">{STATUS_LABEL[status] ?? status}</h3>
                      <p className="text-sm text-muted-foreground">
                        {status === "completed" ? "Visa granted. We wish you a wonderful trip." : status === "rejected" ? "The embassy refused this application. Message us on WhatsApp about the next steps and the money-back guarantee." : "This application was cancelled."}
                      </p>
                    </div>
                  </div>
                ) : !paid ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-amber-800 dark:text-amber-500 font-semibold mb-1">Payment pending</h3>
                      <p className="text-amber-700/90 dark:text-amber-500/90 text-sm mb-4">
                        {mainApp.payment_status === "failed" ? "The last payment didn't go through. " : ""}Documents and the rest of the application unlock after payment.
                      </p>
                      <PayNowButton applicationId={mainId} destination={mainApp.destination_country} trackingToken={mainApp.tracking_token} className="bg-amber-600 hover:bg-amber-700 text-white" />
                    </div>
                  </div>
                ) : continueNeeded ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 flex items-start gap-4">
                    <Briefcase className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-blue-800 dark:text-blue-500 font-semibold mb-1">Next step: continue your application</h3>
                      <p className="text-blue-700/90 dark:text-blue-500/90 text-sm mb-4">
                        Payment received. Add your passport number and employment details, then upload your documents.
                      </p>
                      <Button asChild size="sm" className="font-semibold">
                        <Link href={continuePath(mainApp)}>Continue application</Link>
                      </Button>
                    </div>
                  </div>
                ) : !hasAllDocs && !isReady ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-amber-800 dark:text-amber-500 font-semibold mb-1">Action Required: Upload Supporting Documents</h3>
                      <p className="text-amber-700/90 dark:text-amber-500/90 text-sm mb-4">
                        Please upload your {checklist.filter((r) => missingFlags.includes(DOC_FLAG[r.document_type])).map((r) => r.title.toLowerCase()).join(", ")} so our visa team can assemble your consular file.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-semibold">
                          <Link href={uploadPath(mainApp)}>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Supporting Documents
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            Send via WhatsApp
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : isReady ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-emerald-800 dark:text-emerald-500 font-semibold text-base mb-1">Your Consular Dossier is Ready</h3>
                        <p className="text-emerald-700/90 dark:text-emerald-500/90 text-sm">
                          Your customized application package, embassy cover letter, verified travel itinerary, and 11-step appointment submission guide are ready for review and printing.
                        </p>
                      </div>
                    </div>

                    {mainApp.tracking_token && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold">
                          <Link href={`/track/${mainApp.tracking_token}/dossier`}>
                            <Printer className="w-4 h-4 mr-2" />
                            View &amp; Print Dossier (A4)
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50">
                          <a href={`/api/download-document?token=${mainApp.tracking_token}`}>
                            <Download className="w-4 h-4 mr-2" />
                            Download Package
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 flex items-start gap-4">
                    <Clock className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-blue-800 dark:text-blue-500 font-semibold mb-1">{status === "reviewing" ? "Under review" : "Application Under Processing"}</h3>
                      <p className="text-blue-700/90 dark:text-blue-500/90 text-sm">
                        Our visa specialists are preparing your travel reservations, cover letter, and consular filing documents. Turnaround time is typically 24-48 hours. No action needed.
                      </p>
                    </div>
                  </div>
                )}

                {mainApp.appointment_at && (
                  <div className="mt-4 bg-muted/40 border border-border rounded-xl p-4 flex items-start gap-3 text-sm">
                    <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Appointment: {format(new Date(mainApp.appointment_at), "EEE, MMM d yyyy 'at' h:mm a")}</p>
                      <p className="text-muted-foreground">{[mainApp.appointment_centre, mainApp.appointment_address].filter(Boolean).join(", ")}{mainApp.appointment_reference ? ` · Ref ${mainApp.appointment_reference}` : ""}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents Checklist Card */}
              {paid && !isDraft && (
                <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 border-b bg-background flex justify-between items-center">
                    <h2 className="font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Supporting Documents Checklist
                    </h2>
                    <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-primary hover:text-primary">
                      <Link href={uploadPath(mainApp)}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> Upload Desk
                      </Link>
                    </Button>
                  </div>
                  <div className="divide-y text-sm">
                    {checklist.map((req) => {
                      const received = !!mainApp[DOC_FLAG[req.document_type]]
                      return (
                        <div key={req.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-medium text-foreground">{req.title}</p>
                            {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
                          </div>
                          {received ? (
                            <span className="text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Received</span>
                          ) : (
                            <span className="text-amber-600 bg-amber-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Pending</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              {/* Quick Case Info */}
              <div className="bg-card rounded-xl shadow-sm border p-6">
                <h2 className="font-semibold text-foreground mb-4">Case Reference</h2>
                <div className="space-y-3 text-sm mb-5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Reference ID</span>
                    <span className="font-mono font-semibold text-foreground">{reference}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Payment Status</span>
                    <span className={`font-semibold ${paid ? "text-emerald-600" : "text-amber-600"}`}>
                      {STATUS_LABEL[mainApp.payment_status || "pending"] ?? mainApp.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount</span>
                    <span className="font-medium text-foreground">{amount}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Target Date</span>
                    <span className="font-medium text-foreground">
                      {mainApp.entry_date ? format(new Date(mainApp.entry_date), "MMM d, yyyy") : "Flexible"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  {mainApp.tracking_token && (
                    <Button asChild variant="outline" size="sm" className="w-full justify-start text-xs">
                      <Link href={trackPath(mainApp)}>
                        <ExternalLink className="w-3.5 h-3.5 mr-2" />
                        Open Full Tracking Page
                      </Link>
                    </Button>
                  )}
                  {paid && !isDraft && continueNeeded && (
                    <Button asChild variant="outline" size="sm" className="w-full justify-start text-xs">
                      <Link href={continuePath(mainApp)}>
                        <Briefcase className="w-3.5 h-3.5 mr-2" />
                        Continue application
                      </Link>
                    </Button>
                  )}
                  {paid && !isDraft && (
                    <Button asChild variant="outline" size="sm" className="w-full justify-start text-xs">
                      <Link href={uploadPath(mainApp)}>
                        <Upload className="w-3.5 h-3.5 mr-2" />
                        Upload Supporting Documents
                      </Link>
                    </Button>
                  )}
                  {isReady && mainApp.tracking_token && (
                    <Button asChild variant="outline" size="sm" className="w-full justify-start text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-50">
                      <Link href={`/track/${mainApp.tracking_token}/dossier`}>
                        <Printer className="w-3.5 h-3.5 mr-2" />
                        Print Consular Dossier (A4)
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* WhatsApp Concierge Support */}
              <div className="bg-secondary/60 border border-border rounded-xl p-6">
                <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center shadow-sm mb-4">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground mb-1">WhatsApp Concierge</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Need help submitting documents or have questions about your appointment? Our Dubai-based visa specialists are on standby.
                </p>
                <div className="space-y-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full text-center py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Chat with Case Specialist
                  </a>
                  <a href="mailto:support@ezvisa.net" className="block w-full text-center py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    support@ezvisa.net
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
