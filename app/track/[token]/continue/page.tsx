import { notFound } from "next/navigation"
import { redirectLocalized, requestLocale } from "@/lib/request-locale"
import { getApplicationByToken } from "@/lib/applications"

/** Older link format: the continue flow lives at /continue/[id] (it signs the customer in when needed). */
export default async function TrackContinueRedirect({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const app = await getApplicationByToken(token)
  if (!app?.id) notFound()
  redirectLocalized(`/continue/${app.id}`, (await requestLocale()) === "ar")
}
