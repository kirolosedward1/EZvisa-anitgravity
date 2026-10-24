import type { ReactNode } from "react"
import { Image } from "@/components/image"

import { cn } from "@/lib/utils"
import styles from "./iphone-frame.module.css"

/** Native iPhone 15 Pro screenshot size. Replacement screenshots should use the same ratio. */
export const SCREENSHOT_WIDTH = 1179
export const SCREENSHOT_HEIGHT = 2556

interface IphoneFrameProps {
  /** Single screenshot (1179 x 2556 or the same ratio). Ignored when `children` is given. */
  src?: string
  alt?: string
  /** Set on the hero mockup so it loads eagerly; everything else lazy-loads. */
  priority?: boolean
  /** `sizes` hint for next/image, matching the rendered frame width. */
  sizes?: string
  /** Width classes for the frame, e.g. `w-64 lg:w-80`. Height follows automatically. */
  className?: string
  /** Custom screen content. The screen box is positioned, so children can use `absolute inset-0`. */
  children?: ReactNode
}

export function IphoneFrame({
  src,
  alt = "",
  priority = false,
  sizes = "(min-width: 1024px) 300px, 240px",
  className,
  children,
}: IphoneFrameProps) {
  return (
    <div className={cn(styles.frame, className)}>
      <div className={styles.body}>
        <div className={styles.bezel}>
          <div className={styles.screen}>
            {children ??
              (src ? (
                <Image
                  src={src}
                  alt={alt}
                  width={SCREENSHOT_WIDTH}
                  height={SCREENSHOT_HEIGHT}
                  sizes={sizes}
                  priority={priority}
                  loading={priority ? "eager" : "lazy"}
                />
              ) : null)}
          </div>
          <div className={styles.island} aria-hidden="true" />
        </div>
      </div>
      <span className={cn(styles.button, styles.action)} aria-hidden="true" />
      <span className={cn(styles.button, styles.volumeUp)} aria-hidden="true" />
      <span className={cn(styles.button, styles.volumeDown)} aria-hidden="true" />
      <span className={cn(styles.button, styles.power)} aria-hidden="true" />
    </div>
  )
}
