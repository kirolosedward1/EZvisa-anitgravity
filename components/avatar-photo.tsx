"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Profile photo over the initials: the initials show at once and the photo fades in when it has loaded, so the
 * circle is never an empty colour while the image downloads. Signed storage or Google URLs, so a plain <img>.
 */
export function AvatarPhoto({ src, initials, className }: { src: string | null; initials: React.ReactNode; className?: string }) {
  const [loaded, setLoaded] = useState<string | null>(null)
  return (
    <span className={cn("relative flex items-center justify-center overflow-hidden rounded-full", className)}>
      <span aria-hidden={loaded === src && !!src}>{initials}</span>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(src)}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", loaded === src ? "opacity-100" : "opacity-0")}
        />
      ) : null}
    </span>
  )
}
