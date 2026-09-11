import { notFound, redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { generateCompleteDossierPack } from "@/lib/documents/templates"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"
import { DossierViewerClient } from "@/components/track/dossier-viewer-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Consular Dossier Package | EZvisa",
  robots: {
    index: false,
    follow: false,
  },
}

import { isDemoToken, getDemoApplicationByToken } from "@/lib/demo-data"

async function getApplication(token: string) {
  if (isDemoToken(token)) {
    return getDemoApplicationByToken(token);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) {
    return getDemoApplicationByToken(token);
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: appData, error } = await supabase
    .from("visa_applications")
    .select("*")
    .eq("tracking_token", token)
    .single()

  if (error || !appData) {
    return getDemoApplicationByToken(token);
  }
  return appData
}


export default async function DossierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const appData = await getApplication(token)

  if (!appData) {
    notFound()
  }

  const isPaid = appData.payment_status === "completed" || appData.payment_status === "paid"

  if (!isPaid) {
    redirect(`/track/${token}`)
  }

  const dossierHtml = generateCompleteDossierPack(appData)
  const whatsAppUrl = getCaseTrackingWhatsAppUrl(token, appData.destination_country)

  return (
    <DossierViewerClient
      htmlContent={dossierHtml}
      token={token}
      applicantName={appData.full_name || "Applicant"}
      destinationCountry={appData.destination_country || "Schengen"}
      whatsAppUrl={whatsAppUrl}
    />
  )
}
