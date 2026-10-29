"use client"

import { useMemo } from "react"
import { sanitizeHtml } from "@/lib/sanitize"

export function BlogContent({ content }: { content: string }) {
  const processedContent = useMemo(() => {
    if (!content) return ""

    // First sanitize the raw content to prevent XSS
    const sanitizedContent = sanitizeHtml(content)

    return sanitizedContent
      // Process markdown images first: ![alt text](image-url)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" loading="lazy" class="blog-image" />`
      })
      .replace(/^## (.+)$/gm, (_, text) => `<h2 id="heading-${text.toLowerCase().replace(/\s+/g, "-")}">${text}</h2>`)
      .replace(/^### (.+)$/gm, (_, text) => `<h3 id="heading-${text.toLowerCase().replace(/\s+/g, "-")}">${text}</h3>`)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      .replace(/(<li>.*<\/li>\n?)+/gm, "<ul>$&</ul>")
      .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[hup]|<li|<ul|<img)(.+)$/gm, "<p>$1</p>")
      .replace(/<p><h/g, "<h")
      .replace(/<\/h2><\/p>/g, "</h2>")
      .replace(/<\/h3><\/p>/g, "</h3>")
      .replace(/<p><ul>/g, "<ul>")
      .replace(/<\/ul><\/p>/g, "</ul>")
      .replace(/<p><img/g, "<img")
      .replace(/<\/><\/p>/g, "/>")
      .replace(/<p>\s*<\/p>/g, "")
  }, [content])

  return <div className="ez-article-body" dangerouslySetInnerHTML={{ __html: processedContent }} />
}
