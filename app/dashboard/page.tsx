import { Globi } from "@/components/globi/globi"
import { redirectLocalized, requestLocale } from "@/lib/request-locale";
import { LocaleLink } from "@/components/locale-link";
import { cookies } from "next/headers";
import { Plus } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { isDemoEmail, getDemoApplicationsByEmail, DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data";
import { DemoModeBar } from "@/components/dashboard/demo-mode-bar";
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons";
import { ApplicationView } from "@/components/dashboard/application-view";
import { DashboardStarter } from "@/components/dashboard/dashboard-starter";
import { visibleApplications } from "@/lib/active-applications";
import { metadataFullName } from "@/lib/auth/apple-profile";
import type { VisaApplication } from "@/lib/types/visa-application";
import { SupportApplication } from "@/components/support-application";
import { getStatusLabel } from "@/lib/application-status";
import { attentionCount } from "@/lib/dashboard-state";
import { formatAedLabel } from "@/lib/currency";
import { PRICE_AED } from "@/lib/shared/wizard-contract";
import { customerText, type CustomerKey } from "@/lib/translations/customer";
import { getWhatsAppUrl } from "@/lib/whatsapp";

// Demo shortcuts are for previews and local testing, not real customers
const SHOW_DEMO_ACCESS = process.env.VERCEL_ENV !== "production";

const HOW_STEPS: [CustomerKey, CustomerKey][] = [
  ["empty.step1", "empty.step1Body"],
  ["empty.step2", "empty.step2Body"],
  ["empty.step3", "empty.step3Body"],
  ["empty.step4", "empty.step4Body"],
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ id?: string; demo?: string; pay?: string }> }) {
  const arabic = (await requestLocale()) === "ar";
  const locale = arabic ? "ar" : "en";
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values);
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
  // Preview builds only: ?demo=empty shows the dashboard of an account with no applications.
  const emptyPreview = SHOW_DEMO_ACCESS && demoParam === "empty";

  if (emptyPreview) {
    user = { email: "demo.empty@ezvisa.net", user_metadata: { full_name: "Demo Visitor" } };
  } else if (demoSession) {
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

  if (emptyPreview) {
    relatedApps = [];
  } else if (isDemo) {
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
        <main id="main-content" className="ez-customer-page ez-dash min-h-screen pt-[72px]">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-4 pb-16 pt-9 sm:px-8">
            <div className="flex flex-col gap-1">
              <h1 className="ez-dash-h1 text-foreground">
                {firstName ? t("dash.welcome", { name: firstName }) : t("dash.welcomeNoName")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("dash.signedInAs")} <span className="ltr-isolate">{user.email}</span>
              </p>
            </div>

            <section aria-label={t("empty.title")} className="ez-dash-card ez-dash-hero grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <h2 className="ez-dash-hero-title text-foreground">{t("empty.title")}</h2>
                  <p className="max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground">{t("empty.body")}</p>
                </div>
                <DashboardStarter />
                <p className="text-xs text-muted-foreground">{t("empty.fee", { amount: formatAedLabel(PRICE_AED, locale) })}</p>
              </div>
              <Globi pose="welcome" className="mx-auto w-full max-w-[260px]" />
            </section>

            <section aria-label={t("empty.howTitle")} className="flex flex-col gap-3">
              <h2 className="ez-dash-panel text-foreground">{t("empty.howTitle")}</h2>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {HOW_STEPS.map(([title, body], index) => (
                  <li key={title} className="ez-dash-card flex flex-col gap-2 p-[18px]">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#edf4ff] text-xs font-semibold text-primary">{index + 1}</span>
                    <span className="text-sm font-medium text-foreground">{t(title)}</span>
                    <span className="text-[13px] leading-relaxed text-muted-foreground">{t(body)}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-label={t("empty.linkTitle")} className="ez-dash-card flex flex-wrap items-center justify-between gap-4 px-5 py-[18px]">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">{t("empty.linkTitle")}</p>
                <p className="text-[13px] text-muted-foreground">{t("empty.linkBody")}</p>
              </div>
              <Button asChild variant="outline">
                <a href={getWhatsAppUrl(t("empty.linkMessage"), arabic)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-4 text-[#1A7F37]" />
                  {t("empty.linkButton")}
                </a>
              </Button>
            </section>

            {SHOW_DEMO_ACCESS && (
              <div className="ez-dash-card p-5">
                <DemoLoginButtons next="/dashboard" />
              </div>
            )}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const mainApp = relatedApps.find((app) => app.id === resolvedSearchParams.id) || relatedApps[0];
  const currentScenario: DemoScenario = (demoSession?.scenario ||
    (user.email.includes("pending") ? "pending" : user.email.includes("family") ? "multi" : "ready")) as DemoScenario;
  const attention = attentionCount(relatedApps);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="ez-customer-page ez-dash min-h-screen pt-[72px]">
        {mainApp?.id ? <SupportApplication id={mainApp.id} country={mainApp.destination_country} status={getStatusLabel(mainApp).label} step="overview" /> : null}

        {isDemo && (
          <DemoModeBar
            currentScenario={currentScenario}
            applicantName={mainApp.full_name || "Demo applicant"}
            applicantEmail={user.email}
          />
        )}

        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-4 pb-16 pt-9 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="ez-dash-h1 text-foreground">
                {firstName ? t("dash.welcomeBack", { name: firstName }) : t("dash.welcomeNoName")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {relatedApps.length === 1 ? t("dash.countOne") : t("dash.countMany", { n: relatedApps.length })}
                {attention > 0 ? (
                  <>
                    {" · "}
                    <span className="font-medium text-[#7a4b00]">{attention === 1 ? t("dash.attentionOne") : t("dash.attentionMany", { n: attention })}</span>
                  </>
                ) : null}
              </p>
            </div>
            <Button asChild>
              <LocaleLink href="/apply">
                <Plus />
                {t("dash.newApp")}
              </LocaleLink>
            </Button>
          </div>

          <ApplicationView
            app={mainApp}
            relatedApps={relatedApps}
            hrefFor={(app) => `/dashboard?id=${app.id}`}
            showTrackingLink
            showInsurance
            allowDiscard={!isDemo}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
