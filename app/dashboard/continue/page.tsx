import { redirectLocalized, requestLocale } from "@/lib/request-locale"

/** Older link format: the continue flow lives at /continue/[id] (it signs the customer in when needed). */
export default async function DashboardContinueRedirect({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  redirectLocalized(id ? `/continue/${encodeURIComponent(id)}` : "/dashboard", (await requestLocale()) === "ar")
}
