"use client"

import React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { MapPin } from "lucide-react"
import { destinations } from "@/lib/destinations"
import { SCHENGEN_META } from "@/lib/countries"
import { LangText } from "@/components/lang-text"
import { stableIndex } from "@/lib/stable-index"
import { cn } from "@/lib/utils"

interface InnerHeroProps {
  badge?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  backgroundImage?: string
  randomizeBackground?: boolean
  /** "photo": copy on the left, a destination photo on the right. "plain": copy only (legal pages). */
  variant?: "photo" | "plain"
  /** Kept for older call sites; no longer used. */
  gradientType?: "default" | "ocean" | "sunset" | "aurora"
  children?: React.ReactNode
  className?: string
}

/**
 * Inner-page heading. Copy sits on the page background, left-aligned; the photo is a separate card with the
 * country named under it. Every page gets a destination photo, fixed per path so it never flashes between renders.
 */
export function InnerHero({
  badge,
  title,
  description,
  backgroundImage,
  randomizeBackground = true,
  variant = "photo",
  children,
  className = "",
}: InnerHeroProps) {
  const pathname = usePathname()
  const picked = randomizeBackground ? destinations[stableIndex(pathname || "inner", destinations.length)] : undefined
  const named = destinations.find((destination) => destination.image === backgroundImage)
  const image = variant === "photo" ? backgroundImage || picked?.image : undefined
  const place = named?.name || (backgroundImage ? undefined : picked?.name)

  return (
    <section className={cn("bg-background pb-12 pt-28 md:pb-16 md:pt-32", variant === "plain" && "border-b border-border/70", className)}>
      <div
        className={cn(
          "container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6",
          image && "lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-14",
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-5">
          {badge && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{badge}</span>
          )}
          <h1 className="max-w-2xl text-balance text-foreground">{title}</h1>
          {description && <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>}
          {children && <div className="mt-2 w-full max-w-xl">{children}</div>}
        </div>

        {image && (
          <figure className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-secondary lg:aspect-[5/4]">
            <Image
              src={image}
              alt={place ? `${place}` : ""}
              fill
              priority
              quality={75}
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover"
            />
            {place && (
              <figcaption className="absolute bottom-4 start-4 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                <LangText en={<bdi dir="ltr">{place}</bdi>} ar={SCHENGEN_META[place]?.ar ?? <bdi dir="ltr">{place}</bdi>} />
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </section>
  )
}
