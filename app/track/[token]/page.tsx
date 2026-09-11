import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle, FileText, CheckCircle2, Clock, ChevronRight, HelpCircle, Printer } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import Image from "next/image";
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp";
import { isDemoToken, getDemoApplicationByToken, getDemoRelatedApplications } from "@/lib/demo-data";

async function getDashboardData(token: string) {
  if (isDemoToken(token)) {
    const demoApp = getDemoApplicationByToken(token);
    if (demoApp) {
      return { mainApp: demoApp, relatedApps: getDemoRelatedApplications(token) };
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    const demoApp = getDemoApplicationByToken(token);
    if (demoApp) return { mainApp: demoApp, relatedApps: getDemoRelatedApplications(token) };
    return null;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: mainApp } = await supabase
    .from("visa_applications")
    .select("*")
    .eq("tracking_token", token)
    .single();

  if (!mainApp) {
    const demoApp = getDemoApplicationByToken(token);
    if (demoApp) return { mainApp: demoApp, relatedApps: getDemoRelatedApplications(token) };
    return null;
  }

  const { data: relatedApps } = await supabase
    .from("visa_applications")
    .select("id, tracking_token, destination_country, full_name, created_at, application_status, payment_status")
    .eq("email", mainApp.email)
    .order('created_at', { ascending: false });

  return { mainApp, relatedApps: relatedApps || [] };
}


export default async function DashboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getDashboardData(token);

  if (!data || !data.mainApp) {
    notFound();
  }

  const { mainApp, relatedApps } = data;

  // Status mapping
  const isPaid = mainApp.payment_status === "completed" || mainApp.payment_status === "paid";
  const status = mainApp.application_status || "submitted";
  
  let currentStep = 1;
  let actionRequired = false;
  let actionMessage = "";
  
  if (!isPaid) {
    currentStep = 1;
    actionRequired = true;
    actionMessage = "Payment pending. Please complete your payment to start processing.";
  } else if (status === "submitted") {
    currentStep = 1;
    actionRequired = true;
    actionMessage = "Please ensure all required documents are uploaded.";
  } else if (status === "reviewing") {
    currentStep = 2;
  } else if (status === "approved") {
    currentStep = 3;
  } else if (status === "ready") {
    currentStep = 4;
  }

  const steps = [
    { num: 1, title: "Action Required", desc: "Payment & Documents" },
    { num: 2, title: "Under Review", desc: "Expert assessment" },
    { num: 3, title: "File Preparation", desc: "Itinerary & Cover Letter" },
    { num: 4, title: "Ready", desc: "Download your file" }
  ];

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container max-w-4xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your visa applications and documents.</p>
            </div>
            
            {/* Multiple Cases Switcher */}
            {relatedApps.length > 1 && (
              <div className="w-full md:w-auto bg-card border rounded-lg p-2 flex gap-2 overflow-x-auto">
                {relatedApps.map((app: any) => (
                  <Link 
                    key={app.id} 
                    href={`/track/${app.tracking_token}`}
                    className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${app.id === mainApp.id ? 'bg-primary text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground'}`}
                  >
                    {app.destination_country} - {format(new Date(app.created_at), 'MMM d, yyyy')}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Main Content (Left 2 columns) */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Application Card */}
              <div className="bg-card rounded-xl shadow-sm border p-6">
                <div className="flex items-start justify-between border-b pb-4 mb-6">
                  <div className="flex items-center gap-4">
                     <span className="relative w-12 h-12 rounded-full overflow-hidden border shadow-sm">
                      <Image
                        src={`/flags/${mainApp.destination_country.toLowerCase().replace(/\s+/g, "-")}.png`}
                        alt={mainApp.destination_country}
                        fill
                        className="object-cover"
                      />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold">{mainApp.destination_country} Schengen Visa</h2>
                      <p className="text-muted-foreground">Applicant: {mainApp.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Travel Date</p>
                    <p className="font-medium text-foreground">{mainApp.entry_date ? format(new Date(mainApp.entry_date), 'MMM d, yyyy') : 'Not set'}</p>
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Application Progress</h3>
                  <div className="flex flex-col sm:flex-row justify-between relative">
                    <div className="absolute top-4 left-4 right-4 h-[2px] bg-slate-100 dark:bg-slate-800 hidden sm:block z-0" />
                    
                    {steps.map((step) => {
                      const isActive = step.num === currentStep;
                      const isPast = step.num < currentStep;
                      
                      return (
                        <div key={step.num} className="relative z-10 flex sm:flex-col items-center sm:w-1/4 mb-4 sm:mb-0 gap-4 sm:gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                            isActive ? 'bg-primary text-white ring-4 ring-primary/20' :
                            isPast ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-border'
                          }`}>
                            {isPast ? <CheckCircle2 className="w-5 h-5" /> : step.num}
                          </div>
                          <div className="sm:text-center">
                            <p className={`font-semibold text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Action Required / Status Message */}
                {actionRequired ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-amber-800 dark:text-amber-500 font-bold mb-1">Action Required</h3>
                      <p className="text-amber-700/90 dark:text-amber-500/90 text-sm mb-4">{actionMessage}</p>
                      <div className="flex gap-3 flex-wrap">
                        {!isPaid && (
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">Complete Payment</Button>
                        )}
                        <Button asChild size="sm" variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-500 hover:bg-amber-500/10">
                          <Link href={`/track/${token}/upload`}>Upload Documents</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : status === "ready" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-emerald-800 dark:text-emerald-500 font-bold text-base mb-1">Your Complete Consular Dossier is Ready</h3>
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
                        <Link href={`/track/${token}/dossier`}>
                          <Printer className="w-4 h-4 mr-2" />
                          View &amp; Print Dossier (A4)
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50">
                        <a href={`/api/download-document?token=${token}`}>
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
                      <h3 className="text-blue-800 dark:text-blue-500 font-bold mb-1">Processing Application</h3>
                      <p className="text-blue-700/90 dark:text-blue-500/90 text-sm">
                        Our experts are currently working on your application. We will notify you via email when the file is ready.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents Checklist */}
              <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-background flex justify-between items-center">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Documents Checklist
                  </h3>
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">Secure</span>
                </div>
                <div className="divide-y">
                  {/* Real documents fetched from DB */}
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-foreground">Passport Copy</p>
                      <p className="text-xs text-muted-foreground">Scanned copy of the bio page</p>
                    </div>
                    {mainApp.has_passport ? (
                      <span className="text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Received</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Pending</span>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-foreground">Passport Photo</p>
                      <p className="text-xs text-muted-foreground">Recent white background photo</p>
                    </div>
                    {mainApp.has_photos ? (
                      <span className="text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Received</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Pending</span>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-foreground">Bank Statement</p>
                      <p className="text-xs text-muted-foreground">Last 3-6 months with bank stamp</p>
                    </div>
                    {mainApp.has_bank_statements ? (
                      <span className="text-emerald-600 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Received</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-500/10 px-2.5 py-1 text-xs font-bold rounded-full">Pending</span>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-foreground">Employment Proof</p>
                      <p className="text-xs text-muted-foreground">NOC / Salary Certificate</p>
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

            {/* Sidebar Content (Right column) */}
            <div className="space-y-6">
              
              {/* Order Summary Summary */}
              <div className="bg-card rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-foreground mb-4">Payment Summary</h3>
                <div className="space-y-3 text-sm mb-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Payment Status</span>
                    <span className={`font-semibold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Amount</span>
                    <span className="font-medium text-foreground">{mainApp.payment_amount ? `${mainApp.payment_amount} AED` : '249 AED'}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Date Created</span>
                    <span className="font-medium text-foreground">{format(new Date(mainApp.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                {!isPaid && (
                  <Button className="w-full">Pay Now</Button>
                )}
              </div>

              {/* Support */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-900/50 rounded-xl p-6">
                <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center shadow-sm mb-4">
                  <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Need Assistance?</h3>
                <p className="text-sm text-muted-foreground mb-4">Our visa experts are here to help you through the process.</p>
                <div className="space-y-2">
                  <a 
                    href={getCaseTrackingWhatsAppUrl(token, mainApp.destination_country)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center gap-2 w-full text-center py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    WhatsApp Case Concierge
                  </a>
                  <a href="mailto:support@ezvisa.net" className="block w-full text-center py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
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
