import { redirectLocalized, requestLocale } from "@/lib/request-locale"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { AccountView, type AccountApplication, type AccountProfile } from "@/app/account/account-view"
import { createServerClient } from "@/lib/supabase/server"
import { listApplicationsFor, trackPath } from "@/lib/applications"
import { getStatusLabel, isPaid } from "@/lib/application-status"
import { referenceOf } from "@/lib/shared/wizard-contract"

import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    { title: "Account", robots: { index: false, follow: false } },
    { title: "الحساب", path: "/ar/account" },
  )
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")

// The same sections as the app's Account tab (mobile/app/(tabs)/account): profile photo and name, account details,
// sign-in, application history, receipts, support, sign out and delete account. Phone-only settings (Face ID,
// reminders, appearance) stay in the app.
export default async function AccountPage() {
  const arabic = (await requestLocale()) === "ar"
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user?.email) redirectLocalized("/login?next=/account", arabic)

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const identities = (user.identities ?? []).map((identity) => identity.provider)
  const providers = [...new Set(identities.length ? identities : [str(user.app_metadata?.provider) || "email"])]

  const profile: AccountProfile = {
    id: user.id,
    email: user.email,
    name: str(meta.full_name) || [str(meta.first_name), str(meta.last_name)].filter(Boolean).join(" "),
    phone: str(meta.phone),
    citizenship: str(meta.citizenship) || str(meta.nationality),
    providers,
    createdAt: user.created_at ?? null,
    userMetadata: { avatar_path: meta.avatar_path ?? null, avatar_url: meta.avatar_url ?? null, picture: meta.picture ?? null },
  }

  const rows = await listApplicationsFor({ email: user.email.toLowerCase(), demo: false })
  const applications: AccountApplication[] = rows
    .filter((row) => row.id && row.application_status !== "cancelled")
    .map((row) => ({
      id: row.id as string,
      country: row.destination_country || "Application",
      reference: referenceOf(row.id as string),
      status: getStatusLabel(row),
      href: trackPath({ id: row.id as string, tracking_token: row.tracking_token }),
      receipt: isPaid(row) && row.payment_amount != null ? { amount: Number(row.payment_amount), paidAt: row.paid_at ?? null } : null,
    }))

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="bg-secondary/40 px-4 pb-20 pt-28 md:pt-32">
        <AccountView profile={profile} applications={applications} />
      </main>
      <Footer />
    </>
  )
}
