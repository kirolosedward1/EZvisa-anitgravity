import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ReceiptView } from "@/components/dashboard/receipt-view"
import { createServerClient } from "@/lib/supabase/server"
import { isPaid } from "@/lib/application-status"
import { getDemoApplicationByToken } from "@/lib/demo-data"
import type { VisaApplication } from "@/lib/types/visa-application"
import { SupportApplication } from "@/components/support-application"

import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    { title: "Receipt", robots: { index: false, follow: false } },
    { title: "الإيصال", path: "/ar/receipt" },
  )
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const demo = id.startsWith("demo-") ? getDemoApplicationByToken(id) : null
  let app: VisaApplication | null = demo

  if (!demo) {
    const supabase = await createServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user?.email) redirect(`/login?next=/receipt/${id}`)
    const { data } = await supabase.from("visa_applications").select("*").eq("id", id).eq("email", auth.user.email).maybeSingle()
    app = data
  }

  if (!app || !isPaid(app)) redirect(`/dashboard?id=${id}&pay=1#pay`)

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="min-h-screen bg-secondary/40 px-4 pb-20 pt-28 md:pt-32">
        <SupportApplication id={app.id ?? id} country={app.destination_country} step="receipt" />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Link href={`/dashboard?id=${app.id ?? id}`} className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            Back to your application
          </Link>
          <ReceiptView app={app} />
        </div>
      </main>
      <Footer />
    </>
  )
}
