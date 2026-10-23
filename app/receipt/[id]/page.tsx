import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ReceiptView } from "@/components/dashboard/receipt-view"
import { createServerClient } from "@/lib/supabase/server"
import { isPaid } from "@/lib/application-status"
import { getDemoApplicationByToken } from "@/lib/demo-data"
import type { VisaApplication } from "@/lib/types/visa-application"

export const metadata = { title: "Receipt", robots: { index: false, follow: false } }

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
      <main id="main-content" className="bg-background px-4 py-16">
        <ReceiptView app={app} />
      </main>
      <Footer />
    </>
  )
}
