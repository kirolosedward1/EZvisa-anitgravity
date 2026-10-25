// Who is calling the travellers API: the website's cookie session (or a demo session), or the app's
// `Authorization: Bearer <access token>` header, the same way /api/upload-document and /api/submit-application accept both.
import { getSessionUser, serviceClient, type SessionUser } from "@/lib/applications"
import { metadataFullName } from "@/lib/auth/apple-profile"

export async function travellersCaller(request: Request): Promise<SessionUser | null> {
  const fromCookie = await getSessionUser()
  if (fromCookie) return fromCookie
  const header = request.headers.get("authorization") ?? ""
  const jwt = /^Bearer\s+(\S+)/i.exec(header)?.[1] ?? ""
  if (!jwt) return null
  const admin = serviceClient()
  if (!admin) return null
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user?.email) return null
  return { email: data.user.email.toLowerCase(), name: metadataFullName(data.user.user_metadata, data.user.email) || undefined, demo: false }
}
