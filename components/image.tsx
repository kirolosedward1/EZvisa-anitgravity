"use client"

import { useEffect, useRef } from "react"
import { getImageProps, type ImageProps } from "next/image"
import { preload } from "react-dom"

/**
 * Same attributes as next/image, without next/image's client state.
 * next/image's onError calls setShowAltText during hydration and removes
 * style="color:transparent", which React reports as error #418.
 * The transparent color is also dropped here: some browsers rewrite or
 * discard that inline declaration before hydration.
 * A failed image is hidden after mount by writing visibility on the element.
 * preload() runs on the server and the client so the head link is adopted
 * instead of being a server-only branch.
 */
export function Image(props: ImageProps) {
  const { props: imgProps } = getImageProps(props)
  const { style, className, ...rest } = imgProps
  let safeStyle = style
  if (style && typeof style === "object" && "color" in style && style.color === "transparent") {
    const { color: _omit, ...restStyle } = style
    safeStyle = restStyle
  }
  if (props.priority || props.preload) {
    preload(imgProps.src, {
      as: "image",
      imageSrcSet: imgProps.srcSet,
      imageSizes: imgProps.sizes,
      fetchPriority: imgProps.fetchPriority,
      crossOrigin: imgProps.crossOrigin,
      referrerPolicy: imgProps.referrerPolicy,
    })
  }
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = ref.current
    if (!img) return
    const hide = () => {
      img.style.visibility = "hidden"
    }
    if (img.complete && img.naturalWidth === 0) hide()
    img.addEventListener("error", hide)
    return () => img.removeEventListener("error", hide)
  }, [imgProps.src])
  return (
    <img
      {...rest}
      className={[className, "text-transparent"].filter(Boolean).join(" ")}
      style={safeStyle}
      ref={ref}
      data-nimg={props.fill ? "fill" : "1"}
    />
  )
}
