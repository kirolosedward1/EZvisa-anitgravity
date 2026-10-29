import type { ReactNode } from "react"
import { LocaleLink } from "@/components/locale-link"

/** Turns "[text](/path)" into locale-aware links; everything else stays text. */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /\[([^\]]+)\]\((\/[^)]*)\)/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    parts.push(
      <LocaleLink key={index} href={match[2]} className="font-medium text-primary underline underline-offset-4 hover:no-underline">
        {match[1]}
      </LocaleLink>,
    )
    last = index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/** Article body: paragraphs, with consecutive "- " lines grouped into one list (lib/help/articles.ts). */
export function HelpBody({ paragraphs }: { paragraphs: string[] }) {
  const blocks: ({ type: "p"; text: string } | { type: "ul"; items: string[] })[] = []
  for (const paragraph of paragraphs) {
    if (paragraph.startsWith("- ")) {
      const previous = blocks[blocks.length - 1]
      if (previous?.type === "ul") previous.items.push(paragraph.slice(2))
      else blocks.push({ type: "ul", items: [paragraph.slice(2)] })
    } else {
      blocks.push({ type: "p", text: paragraph })
    }
  }

  return (
    <div className="flex flex-col gap-5 text-base leading-relaxed text-foreground/90 sm:text-lg">
      {blocks.map((block, index) =>
        block.type === "p" ? (
          <p key={index}>{inline(block.text)}</p>
        ) : (
          <ul key={index} className="flex list-disc flex-col gap-2.5 ps-5 marker:text-primary">
            {block.items.map((item) => (
              <li key={item} className="ps-1">{inline(item)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
