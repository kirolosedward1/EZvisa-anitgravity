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

// Markers below were checked against this exact Next release. A newer Next
// can move the bootstrap chunk or the page-script flags; refuse to no-op.
const EXPECTED_NEXT = "16.0.10"

const root = join(import.meta.dirname, "..", "node_modules")

function fail(message) {
  console.error(`defer-next-scripts: ${message}`)
  process.exit(1)
}

const installedNext = JSON.parse(readFileSync(join(root, "next/package.json"), "utf8")).version
if (installedNext !== EXPECTED_NEXT) {
  fail(
    `installed next@${installedNext}, pinned next@${EXPECTED_NEXT}. ` +
      "Re-check the async/defer markers and update EXPECTED_NEXT before upgrading.",
  )
}

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

function mustInclude(rel, needle, label) {
  const path = join(root, rel)
  let src
  try {
    src = readFileSync(path, "utf8")
  } catch {
    fail(`missing ${rel} (${label})`)
  }
  if (!src.includes(needle)) fail(`${rel} has no ${label}`)
  return src
}

// The files next start actually renders with. Already-patched and freshly
// patched copies both have to match; a missing marker is a failed patch.
for (const rel of [
  "react-dom/cjs/react-dom-server.node.production.js",
  "next/dist/compiled/react-dom/cjs/react-dom-server.node.production.js",
]) {
  const src = mustInclude(rel, toMarker, "deferred bootstrap chunk")
  if (src.includes(fromMarker)) fail(`${rel} still emits an async bootstrap chunk`)
}

for (const name of ["app-page.runtime.prod.js", "app-page.runtime.dev.js"]) {
  const rel = `next/dist/compiled/next-server/${name}`
  const src = mustInclude(rel, runtimeDefer, "deferred webpack runtime")
  if (src.includes(runtimeMarker)) fail(`${name} still emits an async webpack runtime`)
  if (src.includes("async:!0")) fail(`${name} still sets async:!0 on a Next script`)
  if (!src.includes("defer:!0")) fail(`${name} never set defer:!0 on the page-chunk scripts`)
}

console.log(`defer-next-scripts: next@${installedNext} ok`)
