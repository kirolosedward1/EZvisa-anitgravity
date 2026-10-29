// Help center search: plain text matching over title, summary and body, in either language.

export type HelpSearchItem = {
  href: string
  title: string
  summary: string
  topic: string
  text: string
}

/** Lower case, no diacritics or tatweel, one alef/yaa/taa-marbuta form, Western digits, links reduced to their text. */
export function normalizeHelpText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[آأإ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

/**
 * Every word of the query must appear (as the start of a word) somewhere in the article. Title matches rank first,
 * then summary, then body. An empty query returns nothing: the page shows the topics instead.
 */
export function searchHelp(items: HelpSearchItem[], query: string, limit = 8): HelpSearchItem[] {
  const words = normalizeHelpText(query).split(" ").filter((word) => word.length > 1 || /\d/.test(word))
  if (!words.length) return []
  const has = (field: string, word: string) => ` ${field}`.includes(` ${word}`)

  return items
    .map((item, index) => {
      const title = normalizeHelpText(item.title)
      const summary = normalizeHelpText(item.summary)
      const all = `${title} ${summary} ${normalizeHelpText(item.topic)} ${normalizeHelpText(item.text)}`
      if (!words.every((word) => has(all, word))) return null
      const score = words.reduce((sum, word) => sum + (has(title, word) ? 3 : has(summary, word) ? 2 : 1), 0)
      return { item, score, index }
    })
    .filter((hit): hit is { item: HelpSearchItem; score: number; index: number } => hit !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((hit) => hit.item)
}
