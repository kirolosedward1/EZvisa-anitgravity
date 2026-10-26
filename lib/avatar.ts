"use client"

// Profile photo, shared with the app (mobile/lib/avatar.ts): a 256 px square JPEG in the private `avatars` bucket at
// <user id>/avatar.jpg, its path kept in user_metadata.avatar_path and shown through a 1-hour signed URL. Customers
// who signed in with Google and never chose a photo get their Google picture.
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createBrowserClient } from "@/lib/supabase/client"

const BUCKET = "avatars"
const SIZE = 256

type Meta = Record<string, unknown>
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "")

// Signed URLs are valid for an hour. Keep them (in memory, and for the tab session) so the header, the menu and the
// account page share one request and later pages show the photo at once. Only the URL to the user's own photo is
// kept, never the image or other account data. The key includes avatar_version, so a new upload is never shown stale.
const SIGNED_TTL = 3600
const REUSE_FOR_MS = 50 * 60 * 1000
const memory = new Map<string, { url: string; until: number }>()
const pending = new Map<string, Promise<string | null>>()

function cached(key: string): string | null {
  const hit = memory.get(key)
  if (hit && hit.until > Date.now()) return hit.url
  try {
    const raw = sessionStorage.getItem(`ez_avatar:${key}`)
    const saved = raw ? (JSON.parse(raw) as { url: string; until: number }) : null
    if (saved && saved.until > Date.now()) {
      memory.set(key, saved)
      return saved.url
    }
  } catch {
    // storage unavailable (private mode): fetch instead
  }
  return null
}

function signedUrl(path: string, key: string): Promise<string | null> {
  const hit = cached(key)
  if (hit) return Promise.resolve(hit)
  const inFlight = pending.get(key)
  if (inFlight) return inFlight
  const request = createBrowserClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL)
    .then(({ data }) => {
      const url = data?.signedUrl ?? null
      if (url) {
        const entry = { url, until: Date.now() + REUSE_FOR_MS }
        memory.set(key, entry)
        try {
          sessionStorage.setItem(`ez_avatar:${key}`, JSON.stringify(entry))
        } catch {
          // ignore
        }
      }
      return url
    })
    .finally(() => pending.delete(key))
  pending.set(key, request)
  return request
}

/** The URL to show for this user's photo, or null (then initials are shown). */
export function useAvatarUrl(user: Pick<User, "id" | "user_metadata"> | null | undefined): string | null {
  const meta = (user?.user_metadata ?? {}) as Meta
  const path = str(meta.avatar_path)
  const key = path ? `${path}#${String(meta.avatar_version ?? "")}` : ""
  const provider = str(meta.avatar_url) || str(meta.picture)
  const [signed, setSigned] = useState<{ key: string; url: string } | null>(null)

  useEffect(() => {
    if (!path) return
    let alive = true
    signedUrl(path, key).then((url) => {
      if (alive && url) setSigned({ key, url })
    })
    return () => {
      alive = false
    }
  }, [path, key])

  if (path) return signed?.key === key ? signed.url : null
  return provider || null
}

/** Centre-crops the picked image to a 256 px square JPEG, like the app's picker does. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("This browser can't prepare the photo.")
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85))
  if (!blob) throw new Error("This browser can't prepare the photo.")
  return blob
}

function friendly(message: string): string {
  if (/bucket not found|not found/i.test(message)) return "Profile photos aren't switched on for this account yet. Please try again later."
  if (/row-level security|unauthorized|not allowed/i.test(message)) return "You can only change your own photo. Sign in again and retry."
  return "We couldn't save your photo. Please try again."
}

/** Uploads a new photo for the signed-in user and records its path on the account. */
export async function uploadAvatar(file: File): Promise<void> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (JPG, PNG or HEIC).")
  if (file.size > 15 * 1024 * 1024) throw new Error("That photo is larger than 15 MB. Choose a smaller one.")
  const supabase = createBrowserClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) throw new Error("Your session has ended. Sign in again to change your photo.")
  let blob: Blob
  try {
    blob = await toSquareJpeg(file)
  } catch {
    throw new Error("We couldn't read that photo. Try a JPG or PNG.")
  }
  const path = `${user.id}/avatar.jpg`
  const old = str((user.user_metadata as Meta)?.avatar_path)
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: true })
  if (error) throw new Error(friendly(error.message))
  // avatar_version changes the cache key, so every page shows the new photo instead of the old signed URL.
  const { error: metaError } = await supabase.auth.updateUser({ data: { avatar_path: path, avatar_version: Date.now() } })
  if (metaError) throw new Error(friendly(metaError.message))
  // The app may have saved another format (avatar.png, avatar.heic): this one replaces it.
  if (old && old !== path) await supabase.storage.from(BUCKET).remove([old]).catch(() => {})
}

/** Removes the photo from storage and from the account (the Google picture, if any, shows again). */
export async function removeAvatar(): Promise<void> {
  const supabase = createBrowserClient()
  const { data } = await supabase.auth.getUser()
  const path = str((data.user?.user_metadata as Meta | undefined)?.avatar_path)
  if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
  const { error } = await supabase.auth.updateUser({ data: { avatar_path: null } })
  if (error) throw new Error(friendly(error.message))
}
