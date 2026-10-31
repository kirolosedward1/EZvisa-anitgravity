"use client"

/** Sends a file straight to the documents bucket with a one-time signed upload token from the server. */
import { createBrowserClient } from "@/lib/supabase/client"
import { DOC_BUCKET } from "@/lib/shared/wizard-contract"

export async function uploadWithToken(path: string, token: string, file: File): Promise<string | null> {
  const { error } = await createBrowserClient().storage.from(DOC_BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type || undefined, upsert: true })
  return error ? "The upload failed. Check your connection and try again." : null
}
