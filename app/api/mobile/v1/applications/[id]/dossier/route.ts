import { RATE_LIMITS } from "@/lib/rate-limit"
import { generateCompleteDossierPack } from "@/lib/documents/templates"
import { ApiError, getAdmin, handler, json, loadOwnedApplication, rateLimit, requireUser } from "@/lib/mobile/server"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/**
 * GET — the prepared visa dossier, once the experts mark the file "ready".
 * Mirrors /api/download-document: prefer the uploaded final PDF, otherwise
 * return the generated HTML pack (the app renders it to PDF on device).
 */
export const GET = handler(async (request: Request, { params }: Ctx) => {
  const user = await requireUser(request)
  await rateLimit(`dossier:${user.id}`, RATE_LIMITS.standard)
  const { id } = await params
  const owned = await loadOwnedApplication(user, id)
  if (!["ready", "approved"].includes(owned.application_status || "")) {
    throw new ApiError(403, "not_ready", "Your documents are not ready yet. We'll notify you as soon as they are.")
  }

  const db = getAdmin()
  const signed = await db.storage.from("visa_documents").createSignedUrl(`${owned.id}/final_package.pdf`, 600)
  if (!signed.error && signed.data) {
    return json({ kind: "pdf", url: signed.data.signedUrl, expiresIn: 600 })
  }

  const { data: full, error } = await db.from("visa_applications").select("*").eq("id", owned.id).single()
  if (error) throw error
  const country = String(full.destination_country || "Schengen").replace(/[^A-Za-z]+/g, "_")
  return json({ kind: "html", html: generateCompleteDossierPack(full), fileName: `EZvisa_Dossier_${country}` })
})
