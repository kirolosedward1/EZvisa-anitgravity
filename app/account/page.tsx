import { cookies } from "next/headers"
import { redirectLocalized, requestLocale } from "@/lib/request-locale"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { AccountView, DEFAULT_NOTIFICATIONS, type AccountApplication, type AccountProfile, type NotificationPrefs } from "@/app/account/account-view"
import { createServerClient } from "@/lib/supabase/server"
import { listApplicationsFor } from "@/lib/applications"
import { isPaid } from "@/lib/application-status"
import { DEMO_CONFIGS, getDemoApplicationsByEmail, type DemoScenario } from "@/lib/demo-data"
import type { VisaApplication } from "@/lib/types/visa-application"
import { referenceOf } from "@/lib/shared/wizard-contract"
import { isAppleRelayEmail, metadataFullName } from "@/lib/auth/apple-profile"

import { accountBirthDate } from "@/lib/auth/account-details"
import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    { title: "Account", robots: { index: false, follow: false } },
    { title: "الحساب", path: "/ar/account" },
  )
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")

/** Saved choices over the defaults; anything that is not a boolean is ignored. */
function notificationPrefs(value: unknown): NotificationPrefs {
  const saved = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const pick = (key: keyof NotificationPrefs) => (typeof saved[key] === "boolean" ? (saved[key] as boolean) : DEFAULT_NOTIFICATIONS[key])
  return { whatsapp: pick("whatsapp"), push: pick("push"), tips: pick("tips") }
}

/** The demo login's cookie, honoured only for the demo accounts (the cookie is client-editable). */
async function demoAccount() {
  const raw = (await cookies()).get("ez_demo_session")?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const config = DEMO_CONFIGS[parsed?.scenario as DemoScenario]
    return config && parsed.email === config.email ? config : null
  } catch {
    return null
  }
}

function accountApplications(rows: VisaApplication[]): AccountApplication[] {
  return rows
    .filter((row) => row.id && row.application_status !== "cancelled")
    .map((row) => ({
      id: row.id as string,
      country: row.destination_country || "Application",
      reference: referenceOf(row.id as string),
      traveller: row.full_name ?? "",
      receipt: isPaid(row) && row.payment_amount != null ? { amount: Number(row.payment_amount), paidAt: row.paid_at ?? null } : null,
    }))
}

// The same sections as the app's Account tab (mobile/app/(tabs)/account): profile photo and name, account details,
// saved travellers, notifications, sign-in, receipts, sign out and delete account. Phone-only settings (Face ID,
// appearance) stay in the app.
export default async function AccountPage() {
  const arabic = (await requestLocale()) === "ar"
  const demo = await demoAccount()
  let profile: AccountProfile
  let applications: AccountApplication[]

  if (demo) {
    const rows = getDemoApplicationsByEmail(demo.email)
    profile = {
      id: `demo-${demo.id}`,
      email: demo.email,
      emailVerified: true,
      name: demo.name,
      phone: rows[0]?.phone?.replace(/\s+/g, "") ?? "",
      birthdate: "1990-05-14",
      citizenship: "Egypt",
      providers: ["email", "google"],
      createdAt: "2026-03-01T09:00:00.000Z",
      notifications: DEFAULT_NOTIFICATIONS,
      userMetadata: {},
      demo: true,
    }
    applications = accountApplications(rows)
  } else {
    const supabase = await createServerClient()
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user?.email) redirectLocalized("/login?next=/account", arabic)

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const identities = (user.identities ?? []).map((identity) => identity.provider)
    const providers = [...new Set(identities.length ? identities : [str(user.app_metadata?.provider) || "email"])]

    profile = {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.email_confirmed_at),
      name: metadataFullName(meta, user.email) || [str(meta.first_name), str(meta.last_name)].filter(Boolean).join(" "),
      privateRelay: isAppleRelayEmail(user.email),
      phone: str(meta.phone),
      birthdate: accountBirthDate(meta.date_of_birth),
      citizenship: str(meta.citizenship) || str(meta.nationality),
      providers,
      createdAt: user.created_at ?? null,
      notifications: notificationPrefs(meta.notifications),
      userMetadata: { avatar_path: meta.avatar_path ?? null, avatar_url: meta.avatar_url ?? null, picture: meta.picture ?? null },
    }
    applications = accountApplications(await listApplicationsFor({ email: user.email.toLowerCase(), demo: false }))
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="ez-customer-page ez-dash min-h-screen px-4 pb-20 pt-[104px] sm:px-8 md:pt-[112px]">
        <AccountView profile={profile} applications={applications} />
      </main>
      <Footer />
    </>
  )
}
