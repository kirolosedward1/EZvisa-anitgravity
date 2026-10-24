"use client"

import type { MouseEvent } from "react"

import { useSiteLocale } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

// Store listing URLs. Both are placeholders until the apps are published.
export const APP_STORE_URL = "#"
export const GOOGLE_PLAY_URL = "#"
export const GOOGLE_PLAY_AVAILABLE = false

const BADGE_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function AppStoreBadge({ className, arabic }: { className?: string; arabic: boolean }) {
  return (
    <svg viewBox="0 0 120 40" className={className} aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="119" height="39" rx="6.5" fill="#000" stroke="#a6a6a6" />
      <g fill="#fff">
        <path
          transform="translate(8.5 8.6) scale(0.95)"
          d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
        />
        <text x="35" y="16" fontSize="7" fontWeight="500" fontFamily={arabic ? "var(--font-arabic), system-ui, sans-serif" : BADGE_FONT}>
          {arabic ? "حمّل من" : "Download on the"}
        </text>
        <text x="35" y="30.5" fontSize="14.5" fontWeight="600" letterSpacing="-0.3" fontFamily={BADGE_FONT}>
          App Store
        </text>
      </g>
    </svg>
  )
}

function GooglePlayBadge({ className, arabic }: { className?: string; arabic: boolean }) {
  return (
    <svg viewBox="0 0 135 40" className={className} aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="134" height="39" rx="6.5" fill="#000" stroke="#a6a6a6" />
      <g transform="translate(9 7)">
        <polygon points="1,1 15,13 1,25" fill="#00c3ff" />
        <polygon points="1,1 18.1,10.3 15,13" fill="#00f076" />
        <polygon points="1,25 15,13 18.1,15.7" fill="#ff3a44" />
        <polygon points="15,13 18.1,10.3 23,13 18.1,15.7" fill="#ffd500" />
      </g>
      <g fill="#fff">
        <text x="40" y="15.5" fontSize="6.5" fontWeight="500" letterSpacing={arabic ? "0" : "0.7"} fontFamily={arabic ? "var(--font-arabic), system-ui, sans-serif" : BADGE_FONT}>
          {arabic ? "احصل عليه من" : "GET IT ON"}
        </text>
        <text x="40" y="30.5" fontSize="14.5" fontWeight="600" letterSpacing="-0.3" fontFamily={BADGE_FONT}>
          Google Play
        </text>
      </g>
    </svg>
  )
}

interface StoreBadgesProps {
  size?: "md" | "lg"
  className?: string
}

/**
 * App Store + Google Play download badges. Google Play is muted and marked
 * "Coming soon" until GOOGLE_PLAY_AVAILABLE is flipped.
 */
export function StoreBadges({ size = "md", className }: StoreBadgesProps) {
  const arabic = useSiteLocale() === "ar"
  const badgeHeight = size === "lg" ? "h-12 sm:h-14" : "h-10 sm:h-12"

  const preventWhenUnavailable = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!GOOGLE_PLAY_AVAILABLE) event.preventDefault()
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3 sm:gap-4", className)}>
      <a
        href={APP_STORE_URL}
        aria-label={arabic ? "حمّل إيزي فيزا من App Store" : "Download EZvisa on the App Store"}
        className="inline-flex rounded-md transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <AppStoreBadge arabic={arabic} className={cn(badgeHeight, "w-auto")} />
      </a>

      <span className="relative inline-flex">
        <a
          href={GOOGLE_PLAY_URL}
          aria-disabled={GOOGLE_PLAY_AVAILABLE ? undefined : "true"}
          aria-label={
            arabic
              ? GOOGLE_PLAY_AVAILABLE
                ? "احصل على إيزي فيزا من Google Play"
                : "احصل على إيزي فيزا من Google Play (قريبًا)"
              : GOOGLE_PLAY_AVAILABLE
                ? "Get EZvisa on Google Play"
                : "Get EZvisa on Google Play (coming soon)"
          }
          onClick={preventWhenUnavailable}
          className={cn(
            "inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            GOOGLE_PLAY_AVAILABLE ? "transition-opacity hover:opacity-85" : "cursor-not-allowed opacity-45 grayscale",
          )}
        >
          <GooglePlayBadge arabic={arabic} className={cn(badgeHeight, "w-auto")} />
        </a>
        {!GOOGLE_PLAY_AVAILABLE && (
          <span
            aria-hidden="true"
            className="absolute -top-2.5 end-2 rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground shadow-sm"
          >
            {arabic ? "قريبًا" : "Coming soon"}
          </span>
        )}
      </span>
    </div>
  )
}
