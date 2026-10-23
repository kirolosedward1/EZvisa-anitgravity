import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { AccountForm } from "@/app/account/account-form"
import { createServerClient } from "@/lib/supabase/server"

export const metadata = { title: "Account", robots: { index: false, follow: false } }

export default async function AccountPage() {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user?.email) redirect("/login?next=/account")

  const metadata = user.user_metadata || {}
  const phone = typeof metadata.phone === "string" ? metadata.phone : ""
  const citizenship = typeof metadata.citizenship === "string" ? metadata.citizenship : ""

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="bg-background px-4 py-16">
        <AccountForm email={user.email} phone={phone} citizenship={citizenship} />
      </main>
      <Footer />
    </>
  )
}
