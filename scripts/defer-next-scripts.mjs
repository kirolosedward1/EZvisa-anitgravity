/**
 * Next 16 marks its webpack runtime and page chunks as <script async>.
 * A cached async chunk can run before the inline flight scripts that follow
 * the runtime, so hydration replays against a cursor that is already inside
 * the host node (React #418, production, images blocked).
 * defer runs after the document is parsed, in order, once those flight
 * scripts have pushed the full payload.
 *
 * The attributes are hardcoded in Next and in the react-dom server build it
 * loads, so this reapplies the change after install. Running it twice is safe.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "node_modules")

const scriptPairs = [
  [
    join(root, "next/dist/server/app-render/get-layer-assets.js"),
    `return createElement('script', {
            src: fullSrc,
            async: true,`,
    `return createElement('script', {
            src: fullSrc,
            defer: true,`,
  ],
  [
    join(root, "next/dist/server/app-render/create-component-styles-and-scripts.js"),
    `createElement('script', {
            src: \`\${ctx.assetPrefix}/_next/\${(0, _encodeuripath.encodeURIPath)(href)}\${(0, _getassetquerystring.getAssetQueryString)(ctx, true)}\`,
            async: true,`,
    `createElement('script', {
            src: \`\${ctx.assetPrefix}/_next/\${(0, _encodeuripath.encodeURIPath)(href)}\${(0, _getassetquerystring.getAssetQueryString)(ctx, true)}\`,
            defer: true,`,
  ],
]

for (const [path, from, to] of scriptPairs) {
  const src = readFileSync(path, "utf8")
  if (src.includes(from)) {
    writeFileSync(path, src.replace(from, to))
    console.log("defer page chunks:", path)
  } else if (src.includes(to)) {
    console.log("page chunks already defer:", path)
  } else {
    throw new Error(`script tag pattern missing in ${path}`)
  }
}

// Bootstrap runtime: the chunk is the characters ` async=""></script>` with `<` escaped.
const fromMarker = ' async="">\\x3c/script>'
const toMarker = ' defer="">\\x3c/script>'

function walk(dir, out) {
  let names
  try {
    names = readdirSync(dir)
  } catch {
    return
  }
  for (const name of names) {
    const path = join(dir, name)
    let st
    try {
      st = statSync(path)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      if (name === "react-dom" || name === "react-dom-experimental" || name === "cjs" || name === "compiled" || name === "dist" || name === "next") {
        walk(path, out)
      }
      continue
    }
    if (name.startsWith("react-dom-server") && name.endsWith(".js")) out.push(path)
  }
}

const files = []
walk(join(root, "react-dom"), files)
walk(join(root, "next/dist/compiled"), files)
if (files.length === 0) throw new Error("no react-dom server builds found")

let patched = 0
for (const path of files) {
  const src = readFileSync(path, "utf8")
  const hits = src.split(fromMarker).length - 1
  if (hits === 0) {
    if (!src.includes(toMarker) && src.includes("endAsyncScript")) {
      throw new Error(`bootstrap marker missing in ${path}`)
    }
    continue
  }
  writeFileSync(path, src.replaceAll(fromMarker, toMarker))
  patched += hits
  console.log(`defer runtime (${hits}):`, path.replace(root + "/", ""))
}
console.log("runtime replacements", patched)

// next start renders with the prebundled page runtime, not the files above.
const runtimeDir = join(root, "next/dist/compiled/next-server")
const runtimeMarker = ' async=""><\\/script>'
const runtimeDefer = ' defer=""><\\/script>'
for (const name of readdirSync(runtimeDir)) {
  if (!name.startsWith("app-page") || !name.endsWith(".js")) continue
  const path = join(runtimeDir, name)
  let src = readFileSync(path, "utf8")
  let hits = 0
  if (src.includes(runtimeMarker)) {
    const count = src.split(runtimeMarker).length - 1
    src = src.replaceAll(runtimeMarker, runtimeDefer)
    hits += count
  } else if (!src.includes(runtimeDefer)) {
    throw new Error(`runtime bootstrap marker missing in ${name}`)
  }
  const asyncFlag = "async:!0"
  const deferFlag = "defer:!0"
  const flags = src.split(asyncFlag).length - 1
  if (flags) {
    src = src.replaceAll(asyncFlag, deferFlag)
    hits += flags
  }
  if (hits) {
    writeFileSync(path, src)
    console.log(`defer runtime bundle (${hits}):`, name)
  } else {
    console.log("runtime bundle already defer:", name)
  }
}
