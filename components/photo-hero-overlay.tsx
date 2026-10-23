import { cn } from "@/lib/utils"

/**
 * Photo-hero scrim, shared by every photo hero.
 * Restored exactly from main before 169d011: a vertical black gradient,
 * from-black/75 via-black/60 to-black/75.
 */
export function PhotoHeroOverlay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-hero-overlay="pre-169d011"
      className={cn(
        "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/75",
        className,
      )}
    />
  )
}
