import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { LogOut, Plus, Search } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { isDemoEmail, getDemoApplicationsByEmail, DEMO_CONFIGS, type DemoScenario } from "@/lib/demo-data";
import { DemoModeBar } from "@/components/dashboard/demo-mode-bar";
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ApplicationView } from "@/components/dashboard/application-view";
import type { VisaApplication } from "@/lib/types/visa-application";

// Demo shortcuts are for previews and local testing, not real customers
const SHOW_DEMO_ACCESS = process.env.VERCEL_ENV !== "production";

function SignOutButton({ label }: { label: string }) {
  return (
    <form action="/api/auth/signout" method="POST">
      <Button type="submit" variant="ghost" className="rounded-full text-muted-foreground hover:text-foreground">
        <LogOut />
        {label}
      </Button>
    </form>
  );
}

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

  const firstName = (user.user_metadata?.full_name || relatedApps[0]?.full_name || "").split(" ")[0];

  if (!relatedApps || relatedApps.length === 0) {
    return (
      <>
        <SiteHeader />
        <main id="main-content" className="bg-background">
          <DashboardHeader
            badge="My account"
            title={firstName ? `Welcome, ${firstName}` : "Your account"}
            description={user.email}
          />
          <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <DashboardCard className="mx-auto flex max-w-lg flex-col items-center gap-6 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Search className="size-6" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">No applications yet</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We couldn&apos;t find any visa applications for <strong className="text-foreground">{user.email}</strong>.
                  If you applied with a different email, sign in with that one instead.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild className="rounded-full px-5">
                  <Link href="/apply">
                    <Plus />
                    Start an application
                  </Link>
                </Button>
                <SignOutButton label="Sign out" />
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
      <main id="main-content" className="bg-background">
        <DashboardHeader
          badge="My account"
          title={firstName ? `Welcome back, ${firstName}` : "Your visa applications"}
          description={
            <>
              Track your visa file, upload documents and download everything you need for your appointment.
              <span className="mt-1 block text-sm">Signed in as {user.email}</span>
            </>
          }
          actions={
            <>
              <Button asChild className="rounded-full px-5 shadow-lg shadow-primary/20">
                <Link href="/apply">
                  <Plus />
                  New application
                </Link>
              </Button>
              <SignOutButton label={isDemo ? "Exit demo" : "Sign out"} />
            </>
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
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
