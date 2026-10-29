"use client"

import { useEffect, useState, useMemo } from "react"
import { Msg } from "@/components/msg"
import { useSiteLocale } from "@/components/locale-provider"

export function TableOfContents({ content }: { content: string }) {
  const [activeId, setActiveId] = useState("")
  const arabic = useSiteLocale() === "ar"
  const headings = useMemo(() => (content.match(/^#{2,3}\s+(.+)$/gm) || []).map((heading) => {
    const text = heading.replace(/^#+\s+/, "")
    return { id: `heading-${text.toLowerCase().replace(/\s+/g, "-")}`, text, level: heading.startsWith("###") ? 3 : 2 }
  }), [content])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActiveId(entry.target.id) })
    }, { rootMargin: "-110px 0px -65% 0px" })
    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [headings])

  if (!headings.length) return null
  return (
    <nav className="ez-article-toc" aria-label={arabic ? "محتويات المقال" : "On this page"}>
      <h2><Msg id="news.toc" /></h2>
      {headings.map((heading) => (
        <a key={heading.id} href={`#${heading.id}`} aria-current={activeId === heading.id ? "location" : undefined}
          className={heading.level === 3 ? "ez-toc-subheading" : undefined}>{heading.text}</a>
      ))}
    </nav>
  )
}
