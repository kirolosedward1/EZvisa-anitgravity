// Regenerates lib/legal/content.generated.ts from content/legal/*.md (run: node scripts/build-legal-content.mjs).
// The text is inlined as strings so the pages need no filesystem access at runtime.
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
const dir = new URL("../content/legal/", import.meta.url)
const out = {}
for (const f of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) out[f.replace(/\.md$/, "")] = readFileSync(new URL(f, dir), "utf8").trim()
writeFileSync(new URL("../lib/legal/content.generated.ts", import.meta.url),
  `// GENERATED from content/legal/*.md by scripts/build-legal-content.mjs. Do not edit by hand.\n// LEGAL DRAFT – pending Legal Auditor\nexport const LEGAL_MD: Record<string, string> = ${JSON.stringify(out, null, 2)}\n`)
console.log(Object.keys(out).join(", "))
