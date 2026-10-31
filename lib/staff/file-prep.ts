/**
 * File preparation (File preparation board): the parts of the prepared file in embassy order, plain text from the
 * existing HTML templates, and the PDF assembly. Assembly runs on the server with pdf-lib: text parts become simple
 * A4 pages, uploaded PDFs are copied page by page, and JPEG/PNG images are placed on their own page.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib"

export const PARTS = [
  { key: "form", name: "Application form", kind: "upload", hint: "The completed Schengen form, uploaded as a PDF." },
  { key: "cover_letter", name: "Cover letter", kind: "gen", hint: "Generated from the application. Review the ties and the trip summary." },
  { key: "flight", name: "Flight reservation", kind: "upload", hint: "Reservation PDF, or the booking reference." },
  { key: "hotel", name: "Hotel bookings", kind: "upload", hint: "Every night of the stay must be covered." },
  { key: "itinerary", name: "Day by day itinerary", kind: "gen", hint: "Generated from the trip dates and destination." },
  { key: "checklist", name: "Appointment checklist", kind: "gen", hint: "What the customer brings to the visa centre." },
] as const
export type PartKey = (typeof PARTS)[number]["key"]
export type PartState = "todo" | "draft" | "done"
export type Part = { key: PartKey; state: PartState; body: string | null; fileName: string | null; filePath: string | null; updatedBy: string | null }

export function isPartKey(v: unknown): v is PartKey {
  return typeof v === "string" && PARTS.some((p) => p.key === v)
}

/** Parts from stored rows; missing parts are "todo". */
export function partsFrom(rows: { part: string; state: string; body: string | null; file_name: string | null; file_path: string | null; updated_by: string | null }[]): Part[] {
  return PARTS.map((p) => {
    const r = rows.find((x) => x.part === p.key)
    const state = (r?.state === "draft" || r?.state === "done" ? r.state : "todo") as PartState
    return { key: p.key, state, body: r?.body ?? null, fileName: r?.file_name ?? null, filePath: r?.file_path ?? null, updatedBy: r?.updated_by ?? null }
  })
}

/** Readable plain text from the generated HTML (headings and paragraphs on their own lines). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|header|footer)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim()
}

/** Characters the standard PDF font can draw; anything else becomes "?". */
function printable(font: PDFFont, text: string): string {
  return [...text]
    .map((ch) => {
      try {
        font.encodeText(ch)
        return ch
      } catch {
        return "?"
      }
    })
    .join("")
}

function wrap(font: PDFFont, size: number, text: string, width: number): string[] {
  const out: string[] = []
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("")
      continue
    }
    let line = ""
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line)
        line = word
      } else line = next
    }
    out.push(line)
  }
  return out
}

export type AssemblyInput =
  | { kind: "text"; title: string; body: string }
  | { kind: "pdf"; title: string; bytes: Uint8Array }
  | { kind: "image"; title: string; bytes: Uint8Array; type: "jpg" | "png" }

/** Builds the prepared file. Returns the PDF bytes, its page count and the parts that could not be read. */
export async function assemblePdf(inputs: AssemblyInput[]): Promise<{ bytes: Uint8Array; pages: number; skipped: string[] }> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const A4: [number, number] = [595.28, 841.89]
  const margin = 56
  const skipped: string[] = []

  for (const input of inputs) {
    try {
      if (input.kind === "text") {
        const lines = wrap(font, 11, printable(font, input.body), A4[0] - margin * 2)
        let page = doc.addPage(A4)
        let y = A4[1] - margin
        page.drawText(printable(bold, input.title), { x: margin, y, size: 14, font: bold, color: rgb(0.06, 0.14, 0.28) })
        y -= 28
        for (const line of lines) {
          if (y < margin) {
            page = doc.addPage(A4)
            y = A4[1] - margin
          }
          if (line) page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) })
          y -= 15
        }
      } else if (input.kind === "pdf") {
        const src = await PDFDocument.load(input.bytes, { ignoreEncryption: true })
        const pages = await doc.copyPages(src, src.getPageIndices())
        pages.forEach((p) => doc.addPage(p))
      } else {
        const img = input.type === "png" ? await doc.embedPng(input.bytes) : await doc.embedJpg(input.bytes)
        const page = doc.addPage(A4)
        const scale = Math.min((A4[0] - margin * 2) / img.width, (A4[1] - margin * 2) / img.height, 1)
        const w = img.width * scale
        const h = img.height * scale
        page.drawImage(img, { x: (A4[0] - w) / 2, y: (A4[1] - h) / 2, width: w, height: h })
      }
    } catch {
      skipped.push(input.title)
    }
  }
  return { bytes: await doc.save(), pages: doc.getPageCount(), skipped }
}

/** File type from a name, for assembly. */
export function fileKind(name: string): "pdf" | "jpg" | "png" | null {
  if (/\.pdf$/i.test(name)) return "pdf"
  if (/\.jpe?g$/i.test(name)) return "jpg"
  if (/\.png$/i.test(name)) return "png"
  return null
}
