import { Globi } from "@/components/globi/globi"
import { redirectLocalized, requestLocale } from "@/lib/request-locale";
import { signOutAction } from "@/lib/route-path";
import { LocaleLink } from "@/components/locale-link";
import { cookies } from "next/headers";
import { LogOut, Plus } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { LangText } from "@/components/lang-text";
import { SiteHeader } from "@/components/site-header";
import { translations } from "@/lib/translations";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { isDemoEmail, getDemoApplicationsByEmail, DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data";
import { DemoModeBar } from "@/components/dashboard/demo-mode-bar";
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ApplicationView } from "@/components/dashboard/application-view";
import { visibleApplications } from "@/lib/active-applications";
import { metadataFullName } from "@/lib/auth/apple-profile";
import type { VisaApplication } from "@/lib/types/visa-application";
import { SupportApplication } from "@/components/support-application";
import { getStatusLabel } from "@/lib/application-status";

// Demo shortcuts are for previews and local testing, not real customers
const SHOW_DEMO_ACCESS = process.env.VERCEL_ENV !== "production";

function SignOutButton({ label, action }: { label: string; action: string }) {
  return (
    <form action={action} method="POST">
      <Button type="submit" variant="ghost" className="rounded-full text-muted-foreground hover:text-foreground">
        <LogOut />
        {label}
      </Button>
    </form>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ id?: string; demo?: string; pay?: string }> }) {
  const arabic = (await requestLocale()) === "ar";
  const signOut = signOutAction(arabic);
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
    redirectLocalized("/login?next=/dashboard", arabic);
  }

  const isDemo = isDemoEmail(user.email);
  let relatedApps: VisaApplication[] = [];

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

  relatedApps = visibleApplications(relatedApps);

  const appName = typeof relatedApps[0]?.full_name === "string" ? relatedApps[0].full_name : "";
  const firstName = (metadataFullName(user.user_metadata, user.email) || appName).split(" ")[0];

  if (!relatedApps || relatedApps.length === 0) {
    return (
      <>
        <SiteHeader />
        <main id="main-content" className="ez-customer-page min-h-screen bg-secondary/40">
          <DashboardHeader
            badge="My account"
            title={firstName ? `Welcome, ${firstName}` : "Your account"}
            description={user.email}
          />
          <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <DashboardCard className="ez-dashboard-empty mx-auto flex max-w-lg flex-col items-center gap-6 p-8 text-center">
              <Globi pose="welcome" className="ez-empty-globi" />
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  <LangText en={translations.en.dashboardEmpty.title} ar={translations.ar.dashboardEmpty.title} />
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <LangText en={translations.en.dashboardEmpty.before} ar={translations.ar.dashboardEmpty.before} />{" "}
                  <strong className="ltr-isolate text-foreground">{user.email}</strong>
                  {". "}
                  <LangText en={translations.en.dashboardEmpty.after} ar={translations.ar.dashboardEmpty.after} />
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <LocaleLink href="/apply">
                    <Plus />
                    Start an application
                  </LocaleLink>
                </Button>
                <SignOutButton label="Sign out" action={signOut} />
              </div>
              {SHOW_DEMO_ACCESS && (
                <div className="w-full border-t border-border/60 pt-6 text-left">
                  <DemoLoginButtons next="/dashboard" />
                </div>
              )}
            </DashboardCard>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const mainApp = relatedApps.find((app) => app.id === resolvedSearchParams.id) || relatedApps[0];
  const currentScenario: DemoScenario = (demoSession?.scenario ||
    (user.email.includes("pending") ? "pending" : user.email.includes("family") ? "multi" : "ready")) as DemoScenario;

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="ez-customer-page min-h-screen bg-secondary/40">
        {mainApp?.id ? <SupportApplication id={mainApp.id} country={mainApp.destination_country} status={getStatusLabel(mainApp).label} step="overview" /> : null}
        <DashboardHeader
          badge="My account"
          title={firstName ? (
            <>
              <LangText en={translations.en.dashboardHome.welcomeBack} ar={translations.ar.dashboardHome.welcomeBack} />{" "}
              <span className="ltr-isolate">{firstName}</span>
            </>
          ) : "Your visa applications"}
          description={<>
            <LangText en={translations.en.dashboardHome.signedInAs} ar={translations.ar.dashboardHome.signedInAs} />{" "}
            <span className="ltr-isolate">{user.email}</span>
          </>}
          actions={
            <Button asChild>
              <LocaleLink href="/apply">
                <Plus />
                <LangText en="New application" ar="طلب جديد" />
              </LocaleLink>
            </Button>
          }
        />

        {isDemo && (
          <DemoModeBar
            currentScenario={currentScenario}
            applicantName={mainApp.full_name || "Demo applicant"}
            applicantEmail={user.email}
          />
        )}

        <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <ApplicationView
            app={mainApp}
            relatedApps={relatedApps}
            hrefFor={(app) => `/dashboard?id=${app.id}`}
            showTrackingLink
            allowDiscard={!isDemo}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
