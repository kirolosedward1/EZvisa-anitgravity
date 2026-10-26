import { Image } from "@/components/image"
import { PhotoHeroOverlay } from "@/components/photo-hero-overlay"

/**
 * A destination photo behind a whole section, under the same dark scrim as the photo heroes.
 * Put it first inside a `photo-hero relative overflow-hidden` section, with the content in a `relative` wrapper.
 */
export function SectionPhoto({ src }: { src: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <Image src={src} alt="" fill sizes="100vw" className="object-cover" />
      <PhotoHeroOverlay />
    </div>
  )
}
