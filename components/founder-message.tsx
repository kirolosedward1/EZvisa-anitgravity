"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"

export function FounderMessage({ arabic = false }: { arabic?: boolean }) {
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = section.current
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!root || reducedMotion.matches || !("IntersectionObserver" in window) || !("animate" in HTMLElement.prototype)) return

    const animations = new Set<Animation>()
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const element = entry.target as HTMLElement
        observer.unobserve(element)
        const portrait = element.dataset.founderReveal === "photo"
        const animation = element.animate([
          { opacity: 0, transform: portrait ? "translateY(24px) scale(.985)" : "translateY(16px)" },
          { opacity: 1, transform: "none" },
        ], {
          duration: portrait ? 800 : 600,
          delay: Number(element.dataset.revealDelay || 0),
          easing: "cubic-bezier(.2,.7,.2,1)",
          fill: "backwards",
        })
        animations.add(animation)
        animation.onfinish = () => animations.delete(animation)
      }
    }, { threshold: 0.12 })

    root.querySelectorAll("[data-founder-reveal]").forEach(element => observer.observe(element))
    const stop = () => {
      observer.disconnect()
      animations.forEach(animation => animation.cancel())
      animations.clear()
    }
    const handlePreference = () => { if (reducedMotion.matches) stop() }
    reducedMotion.addEventListener("change", handlePreference)
    return () => { stop(); reducedMotion.removeEventListener("change", handlePreference) }
  }, [])

  return (
    <section ref={section} id="founder" className="ez-founder" aria-label={arabic ? "رسالة المؤسس" : "Founder message"}>
      <div className="ez-founder-layout">
        <div className="ez-founder-photo" data-founder-reveal="photo">
          <Image
            src="/images/kirolos-edward-paris.jpg"
            alt={arabic ? "كيرلس إدوارد في باريس بجوار نهر السين وبرج إيفل" : "Kirolos Edward in Paris beside the Seine and the Eiffel Tower"}
            width={1050}
            height={1400}
            sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 40vw, 440px"
          />
        </div>
        <div className="ez-founder-message">
          <figure>
            <blockquote data-founder-reveal="quote" data-reveal-delay="100">
              <p>{arabic
                ? "«أؤمن بأن لكل شخص الحق في السفر واستكشاف العالم. كل ما عليك هو أن تخطّط له بالطريقة الصحيحة!»"
                : "“I believe everyone has the right to travel and explore the world. You just need to do it right!”"}</p>
            </blockquote>
            <figcaption data-founder-reveal="attribution" data-reveal-delay="200">
              <span className="ez-founder-name">{arabic ? "كيرلس إدوارد" : "Kirolos Edward"}</span>
              <span className="ez-founder-role">{arabic ? "مؤسس EZvisa" : "EZvisa Founder"}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
