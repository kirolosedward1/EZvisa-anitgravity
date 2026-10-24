import type { ReactNode } from "react"
import { DigitRanges } from "@/components/digit-ranges"
import { LocaleLink } from "@/components/locale-link"
import { fillCompany } from "@/lib/legal/company"

/** Minimal Markdown renderer for the legal drafts (headings, paragraphs, lists, tables, bold/italic/code/links). */
function inline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let n = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<DigitRanges key={`${key}-t${n}`} text={text.slice(last, m.index)} />)
    const t = m[0]
    const k = `${key}-${n++}`
    if (t.startsWith("**")) out.push(<strong key={k} className="text-foreground">{inline(t.slice(2, -2), k)}</strong>)
    else if (t.startsWith("`")) out.push(<code key={k} className="rounded bg-secondary px-1 text-[0.9em]" dir="ltr">{t.slice(1, -1)}</code>)
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!
      out.push(href.startsWith("/") ? <LocaleLink key={k} href={href} className="text-[#0436DC] underline">{label}</LocaleLink> : <a key={k} href={href} className="text-[#0436DC] underline" rel="noopener noreferrer" target="_blank">{label}</a>)
    } else if (t.startsWith("http")) out.push(<a key={k} href={t} className="text-[#0436DC] underline break-all" rel="noopener noreferrer" target="_blank" dir="ltr">{t}</a>)
    else out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(<DigitRanges key={`${key}-t${n}`} text={text.slice(last)} />)
  return out
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())

export function LegalMarkdown({ source }: { source: string }) {
  const lines = fillCompany(source).split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const k = `b${i}`
    if (!line.trim()) { i++; continue }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const cls = level <= 2 ? "mt-10 mb-3 text-xl font-semibold text-foreground" : "mt-8 mb-2 text-lg font-semibold text-foreground"
      blocks.push(level <= 2 ? <h2 key={k} className={cls}>{inline(h[2], k)}</h2> : <h3 key={k} className={cls}>{inline(h[2], k)}</h3>)
      i++; continue
    }
    if (line.trim().startsWith("|")) {
      const rows: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++])
      const head = cells(rows[0])
      const body = rows.slice(2).map(cells)
      const hasHead = head.some(Boolean)
      blocks.push(
        <div key={k} className="my-4 overflow-x-auto rounded-lg border border-[#E3E7EF]">
          <table className="w-full text-start text-sm">
            {hasHead && <thead className="bg-[#F7F8FA]"><tr>{head.map((c, j) => <th key={j} className="p-2.5 text-start font-semibold text-foreground">{inline(c, `${k}h${j}`)}</th>)}</tr></thead>}
            <tbody>{body.map((r, ri) => <tr key={ri} className="border-t border-[#E3E7EF]">{r.map((c, j) => <td key={j} className="p-2.5 align-top text-muted-foreground">{inline(c, `${k}${ri}-${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*-\s+/, ""))
      blocks.push(<ul key={k} className="my-3 list-disc space-y-2 ps-6 text-muted-foreground">{items.map((t, j) => <li key={j}>{inline(t, `${k}${j}`)}</li>)}</ul>)
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\||\s*-\s)/.test(lines[i])) para.push(lines[i++].replace(/^>\s?/, ""))
    blocks.push(<p key={k} className="my-3 leading-relaxed text-muted-foreground">{inline(para.join(" "), k)}</p>)
  }
  return <>{blocks}</>
}
