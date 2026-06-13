"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"

interface Heading {
  id: string
  text: string
  level: number
}

export function TableOfContents({ content }: { content: string }) {
  const [activeId, setActiveId] = useState<string>("")
  const [mounted, setMounted] = useState(false)

  const headings = useMemo(() => {
    if (!content) return []
    const headingMatches = content.match(/^#{1,3}\s+(.+)$/gm) || []
    return headingMatches.map((heading, index) => {
      const level = heading.match(/^#+/)?.[0].length || 2
      const text = heading.replace(/^#+\s+/, "")
      const id = `heading-${text.toLowerCase().replace(/\s+/g, "-")}`
      return { id, text, level }
    })
  }, [content])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "-100px 0px -70% 0px" },
    )

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [mounted, headings])

  if (!mounted || headings.length === 0) return null

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="hidden xl:block"
    >
      <div className="sticky top-48 max-h-[calc(100vh-16rem)] overflow-y-auto z-10">
        <div className="relative pb-4 mb-6 border-b border-border/30">
          <h3 className="text-lg font-bold text-foreground">Table of Contents</h3>
          <div className="mt-2 h-1 w-16 bg-primary rounded-full" />
        </div>
        <nav className="space-y-3">
          {headings.map((heading, index) => {
            const isFirstHeading = index === 0
            return (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById(heading.id)
                  if (element) {
                    const top = element.getBoundingClientRect().top + window.scrollY - 200
                    window.scrollTo({ top, behavior: "smooth" })
                  }
                }}
                className={`block text-sm transition-all duration-200 leading-relaxed hover:translate-x-1 ${
                  isFirstHeading
                    ? "text-primary font-semibold hover:underline"
                    : activeId === heading.id
                      ? "text-primary font-medium border-l-2 border-primary pl-3 -ml-3"
                      : "text-muted-foreground hover:text-foreground"
                }`}
                style={{
                  paddingLeft: isFirstHeading ? "0" : `${(heading.level - 1) * 12}px`,
                }}
              >
                {!isFirstHeading && heading.level === 2 && `${index}. `}
                {heading.text}
              </a>
            )
          })}
        </nav>
      </div>
    </motion.aside>
  )
}
