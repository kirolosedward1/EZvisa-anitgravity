import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { UserRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ApplicationView } from "@/components/dashboard/application-view";
import { getReference } from "@/lib/application-status";
import { isDemoToken, getDemoApplicationByToken, getDemoRelatedApplications } from "@/lib/demo-data";
import type { VisaApplication } from "@/lib/types/visa-application";

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
    .select("id, tracking_token, destination_country, full_name, created_at, updated_at, application_status, payment_status, has_passport, has_photos, has_bank_statements, has_employment_proof")
    .eq("email", mainApp.email)
    .order('created_at', { ascending: false });

  return { mainApp, relatedApps: relatedApps || [] };
}


export default async function TrackApplicationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getDashboardData(token);

  if (!data || !data.mainApp) {
    notFound();
  }

  const mainApp = data.mainApp as VisaApplication;
  const relatedApps = data.relatedApps as VisaApplication[];

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="bg-background">
        <DashboardHeader
          badge="Application tracking"
          title={`${mainApp.destination_country} visa application`}
          description={
            <>
              Reference <span className="font-semibold tabular-nums text-foreground">{getReference(mainApp.tracking_token)}</span>
              {" · "}
              {mainApp.full_name}
            </>
          }
          actions={
            <Button asChild variant="outline" className="rounded-full px-5">
              <Link href="/dashboard">
                <UserRound />
                My account
              </Link>
            </Button>
          }
        />
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <ApplicationView
            app={mainApp}
            relatedApps={relatedApps}
            hrefFor={(app) => `/track/${app.tracking_token}`}
            showTrackingLink={false}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
