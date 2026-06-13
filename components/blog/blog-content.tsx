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
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/gm, "<ul>$&</ul>")
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

  return (
    <div className="prose prose-lg max-w-none mt-8">
      <style jsx global>{`
        .prose h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #000;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.3;
          scroll-margin-top: 100px; /* Add scroll offset to account for sticky header */
        }

        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #000;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          scroll-margin-top: 100px; /* Add scroll offset to account for sticky header */
        }

        .prose p {
          color: #4a5568;
          line-height: 1.75;
          margin-bottom: 1.25rem;
        }

        .prose ul {
          list-style: none;
          padding-left: 0;
          margin-top: 1rem;
          margin-bottom: 1.5rem;
        }

        .prose ul li {
          position: relative;
          padding-left: 2rem;
          margin-bottom: 0.75rem;
          color: #4a5568;
          line-height: 1.6;
        }

        .prose ul li::before {
          content: "▶";
          position: absolute;
          left: 0.5rem;
          color: #3b82f6;
          font-size: 0.75rem;
          top: 0.25rem;
        }

        .prose ol {
          list-style: none;
          counter-reset: item;
          padding-left: 0;
          margin-top: 1rem;
          margin-bottom: 1.5rem;
        }

        .prose ol li {
          position: relative;
          padding-left: 2rem;
          margin-bottom: 0.75rem;
          color: #4a5568;
          line-height: 1.6;
          counter-increment: item;
        }

        .prose ol li::before {
          content: counter(item) ". ";
          position: absolute;
          left: 0;
          color: #4a5568;
          font-weight: 500;
        }

        .prose strong {
          color: #000;
          font-weight: 600;
        }

        .prose a {
          color: #3b82f6;
          text-decoration: none;
        }

        .prose a:hover {
          text-decoration: underline;
        }

        .prose blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1.5rem;
          font-style: italic;
          color: #6b7280;
          margin: 1.5rem 0;
        }

        .prose img,
        .prose .blog-image {
          border-radius: 0.75rem;
          margin: 2rem auto;
          max-width: 100%;
          height: auto;
          display: block;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .prose .blog-image {
          width: 100%;
        }

        @media (min-width: 768px) {
          .prose .blog-image {
            max-width: 800px;
          }
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: processedContent }} />
    </div>
  )
}
