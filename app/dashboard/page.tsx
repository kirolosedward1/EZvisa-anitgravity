import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { FileText, CheckCircle2, Clock, MapPin, Search, Calendar, ChevronRight, Upload, ExternalLink, Download, HelpCircle, Mail, Printer, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp";
import { isDemoEmail, getDemoApplicationsByEmail, DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data";
import { DemoModeBar } from "@/components/dashboard/demo-mode-bar";
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ id?: string; demo?: string }> }) {
  const cookieStore = await cookies();
  const resolvedSearchParams = await searchParams;
  const demoCookie = cookieStore.get("ez_demo_session");
  const demoParam = resolvedSearchParams.demo;

  let demoSession: { email: string; name: string; scenario: DemoScenario } | null = null;
  if (demoCookie?.value) {
    try {
      const parsed = JSON.parse(demoCookie.value);
      // The cookie is client-editable: only honour it for demo accounts
      const config = DEMO_CONFIGS[parsed?.scenario as DemoScenario];
      if (config && parsed.email === config.email) {
        demoSession = parsed;
      }
    } catch {
      // ignore JSON parse error
    }
  } else if (demoParam && demoParam in DEMO_CONFIGS) {
    const config = DEMO_CONFIGS[demoParam as DemoScenario];
    demoSession = {
      email: config.email,
      name: config.name,
      scenario: config.id,
    };
  }

  let user: { email?: string; user_metadata?: any } | null = null;

  if (demoSession) {
    user = {
      email: demoSession.email,
      user_metadata: { full_name: demoSession.name },
    };
  } else {
    try {
      const supabase = await createServerClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Fallback if supabase client fails
    }
  }

  if (!user || !user.email) {
    redirect("/login?next=/dashboard");
  }

  const isDemo = isDemoEmail(user.email);
  let relatedApps: any[] = [];

  if (isDemo) {
    relatedApps = getDemoApplicationsByEmail(user.email);
  } else {
    try {
      const supabase = await createServerClient();
      const { data, error: relatedError } = await supabase
        .from("visa_applications")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false });

      if (!relatedError && data && data.length > 0) {
        relatedApps = data;
      }
    } catch {
      // Fallback
    }
  }

  if (!relatedApps || relatedApps.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className="min-h-[75vh] bg-background flex flex-col items-center justify-center p-4 py-12">
          <div className="w-full max-w-lg bg-card border rounded-2xl p-6 sm:p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Applications Found</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              We couldn&apos;t find any visa files registered to <strong className="text-foreground">{user.email}</strong>.
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
    );
  }


  // 2. Identify the active application
  const activeAppId = resolvedSearchParams.id || relatedApps[0].id;
  const mainApp = relatedApps.find(app => app.id === activeAppId) || relatedApps[0];

  const isPaid = mainApp.payment_status === "paid" || mainApp.payment_status === "completed";
  const isReady = mainApp.application_status === "ready";
  const isSubmitted = mainApp.application_status === "submitted" || mainApp.application_status === "reviewing";
  const hasAllDocs = Boolean(mainApp.has_passport && mainApp.has_photos && mainApp.has_bank_statements && mainApp.has_employment_proof);
  const currentScenario: DemoScenario = (demoSession?.scenario ||
    (user.email.includes("pending") ? "pending" : user.email.includes("family") ? "multi" : "ready")) as DemoScenario;

  return (
    <>
      <SiteHeader />
      {isDemo && (
        <DemoModeBar
          currentScenario={currentScenario}
          applicantName={mainApp.full_name || "Demo Applicant"}
          applicantEmail={user.email}
        />
      )}
      <main className="min-h-[100dvh] bg-background pb-20 pt-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Applicant Dashboard</h1>
                {isDemo && (
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
                  {isDemo ? "Exit Demo" : "Sign Out"}
                </Button>
              </form>
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Application Selector */}
              {relatedApps.length > 1 && (
                <div className="bg-card rounded-xl shadow-sm border p-4">
                  <h3 className="font-semibold text-foreground mb-3 text-sm">Your Applications:</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {relatedApps.map(app => (
                      <Link key={app.id} href={`/dashboard?id=${app.id}`}>
                        <div className={`px-4 py-2.5 rounded-lg border flex-shrink-0 cursor-pointer transition-colors ${app.id === mainApp.id ? 'bg-primary/5 border-primary text-primary font-semibold' : 'bg-transparent border-border hover:bg-muted'}`}>
                          <div className="text-sm font-medium">{app.destination_country} Visa</div>
                          <div className="text-xs opacity-75">{app.full_name} &bull; {app.application_status}</div>
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
                        <h2 className="text-2xl font-bold text-foreground">{mainApp.destination_country} Visa File</h2>
                        <p className="text-muted-foreground">Applicant: <strong className="text-foreground">{mainApp.full_name}</strong></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary capitalize">
                      {mainApp.application_status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Updated {format(new Date(mainApp.updated_at || mainApp.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>

                {/* Pending Documents Action Required Banner */}
                {isPaid && !hasAllDocs && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6 flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-amber-800 dark:text-amber-500 font-bold mb-1">Action Required: Upload Supporting Documents</h3>
                      <p className="text-amber-700/90 dark:text-amber-500/90 text-sm mb-4">
                        Your payment was received successfully! Please upload your passport copy, personal photo, bank statement, and NOC so our visa team can assemble your consular file.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-semibold">
                          <Link href={`/track/${mainApp.tracking_token}/upload`}>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Supporting Documents
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
                          <a
                            href={getCaseTrackingWhatsAppUrl(mainApp.tracking_token, mainApp.destination_country)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Send via WhatsApp
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Completed Ready Dossier Banner */}
                {isReady ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-emerald-800 dark:text-emerald-500 font-bold text-base mb-1">Your Consular Dossier is Ready</h3>
                        <p className="text-emerald-700/90 dark:text-emerald-500/90 text-sm">
                          Your customized application package, embassy cover letter, verified travel itinerary, and 11-step appointment submission guide are ready for review and printing.
                        </p>
                      </div>
                    </div>

                    <div className="bg-background/90 rounded-lg p-3.5 border border-emerald-500/20 text-xs space-y-2">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Included in your Dossier Pack:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>11-Step Submission Stacking Order</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Consulate-Tailored Cover Letter</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Day-by-Day Travel Itinerary</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Appointment Day Survival Protocol</span>
                        </div>
                      </div>
                    </div>

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
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 flex items-start gap-4">
                    <Clock className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-blue-800 dark:text-blue-500 font-bold mb-1">Application Under Processing</h3>
                      <p className="text-blue-700/90 dark:text-blue-500/90 text-sm">
                        Our visa specialists are preparing your travel reservations, cover letter, and consular filing documents. Turnaround time is typically 24-48 hours.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents Checklist Card */}
              <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-background flex justify-between items-center">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Supporting Documents Checklist
                  </h3>
                  <Button asChild size="sm" variant="ghost" className="text-xs h-7 text-primary hover:text-primary">
                    <Link href={`/track/${mainApp.tracking_token}/upload`}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> Upload Desk
                    </Link>
                  </Button>
                </div>
                <div className="divide-y text-sm">
                  <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">Passport Copy</p>
                      <p className="text-xs text-muted-foreground">Scanned color copy of the bio page</p>
                    </div>
                    {mainApp.has_passport ? (
                      <span className="text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Received</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Pending</span>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">Personal Photo</p>
                      <p className="text-xs text-muted-foreground">Recent 35x45mm Schengen specification</p>
                    </div>
                    {mainApp.has_photos ? (
                      <span className="text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Received</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Pending</span>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">Bank Statement</p>
                      <p className="text-xs text-muted-foreground">Last 3-6 months stamped statement</p>
                    </div>
                    {mainApp.has_bank_statements ? (
                      <span className="text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Received</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Pending</span>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">Employment Proof</p>
                      <p className="text-xs text-muted-foreground">NOC letter or company salary certificate</p>
                    </div>
                    {mainApp.has_employment_proof ? (
                      <span className="text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Received</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              {/* Quick Case Info */}
              <div className="bg-card rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-foreground mb-4">Case Reference</h3>
                <div className="space-y-3 text-sm mb-5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Reference ID</span>
                    <span className="font-mono font-semibold text-foreground">
                      #EZ-{mainApp.tracking_token ? mainApp.tracking_token.slice(0, 8).toUpperCase() : ""}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Payment Status</span>
                    <span className={`font-semibold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount</span>
                    <span className="font-medium text-foreground">{mainApp.payment_amount ? `${mainApp.payment_amount} AED` : '249 AED'}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Target Date</span>
                    <span className="font-medium text-foreground">
                      {mainApp.entry_date ? format(new Date(mainApp.entry_date), 'MMM d, yyyy') : 'Flexible'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <Button asChild variant="outline" size="sm" className="w-full justify-start text-xs">
                    <Link href={`/track/${mainApp.tracking_token}`}>
                      <ExternalLink className="w-3.5 h-3.5 mr-2" />
                      Open Full Tracking Page
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full justify-start text-xs">
                    <Link href={`/track/${mainApp.tracking_token}/upload`}>
                      <Upload className="w-3.5 h-3.5 mr-2" />
                      Upload Supporting Documents
                    </Link>
                  </Button>
                  {isReady && (
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-900/50 rounded-xl p-6">
                <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center shadow-sm mb-4">
                  <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-foreground mb-1">WhatsApp Concierge</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Need help submitting documents or have questions about your appointment? Our Dubai-based visa specialists are on standby.
                </p>
                <div className="space-y-2">
                  <a 
                    href={getCaseTrackingWhatsAppUrl(mainApp.tracking_token, mainApp.destination_country)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center gap-2 w-full text-center py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
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
  );
}

