import { getImageProps, type ImageProps } from "next/image"
import { preload } from "react-dom"

/**
 * Optimized image with the same attributes as next/image, but no client state.
 * next/image's onError calls setShowAltText during hydration and removes
 * style="color:transparent", which React reports as error #418.
 */
export function Image(props: ImageProps) {
  const { props: imgProps } = getImageProps(props)
  if ((props.priority || props.preload) && typeof window === "undefined") {
    preload(imgProps.src, {
      as: "image",
      imageSrcSet: imgProps.srcSet,
      imageSizes: imgProps.sizes,
      fetchPriority: imgProps.fetchPriority,
      crossOrigin: imgProps.crossOrigin,
      referrerPolicy: imgProps.referrerPolicy,
    })
  }
  return <img {...imgProps} data-nimg={props.fill ? "fill" : "1"} />
}
