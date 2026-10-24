/**
 * After `next build`, render a few pages and refuse async Next chunk scripts.
 * next start is what emits the tags (the pages are dynamic), from the runtime
 * `scripts/defer-next-scripts.mjs` patches. A silent no-op patch still fails here.
 */
import { spawn } from "node:child_process"
import { createServer } from "node:net"
import { setTimeout as delay } from "node:timers/promises"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const pages = ["/", "/contact", "/ar/destinations/france"]

function fail(message) {
  console.error(`check-deferred-scripts: ${message}`)
  process.exitCode = 1
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

function problemsFor(path, html) {
  const tags = [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0])
  const chunks = tags.filter((tag) => {
    const src = tag.match(/\bsrc="([^"]*)"/)?.[1] ?? ""
    return src.includes("/_next/static/chunks/")
  })
  if (chunks.length === 0) return [`${path}: no /_next/static/chunks scripts`]

  const problems = []
  for (const tag of chunks) {
    const src = tag.match(/\bsrc="([^"]*)"/)[1]
    const asyncAttr = /\basync\b/.test(tag)
    const deferAttr = /\bdefer\b/.test(tag)
    const polyfill = src.includes("/polyfills-")
    if (asyncAttr) problems.push(`${path}: async script ${src}`)
    else if (!polyfill && !deferAttr) problems.push(`${path}: script is not defer ${src}`)
  }
  if (!chunks.some((tag) => /webpack-|id="_R_"/.test(tag))) {
    problems.push(`${path}: webpack runtime script missing`)
  }
  return problems
}

const port = await freePort()
const child = spawn(
  process.execPath,
  [join(root, "node_modules/next/dist/bin/next"), "start", "--port", String(port), "--hostname", "127.0.0.1"],
  { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"] },
)
let log = ""
child.stdout.on("data", (chunk) => {
  log += chunk
})
child.stderr.on("data", (chunk) => {
  log += chunk
})

function stop() {
  try {
    process.kill(-child.pid, "SIGTERM")
  } catch {
    try {
      child.kill("SIGTERM")
    } catch {
      // already gone
    }
  }
}

let failed = false
try {
  const deadline = Date.now() + 45_000
  let ready = false
  while (Date.now() < deadline) {
    if (child.exitCode != null) break
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`)
      if (response.status < 500) {
        ready = true
        break
      }
    } catch {
      // not listening yet
    }
    await delay(200)
  }
  if (!ready) {
    fail(`next start did not serve HTML on :${port}\n${log.slice(-1200)}`)
    failed = true
  } else {
    const problems = []
    for (const path of pages) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`)
      const html = await response.text()
      if (!response.ok) {
        problems.push(`${path}: HTTP ${response.status}`)
        continue
      }
      const found = problemsFor(path, html)
      const tags = [...html.matchAll(/<script\b[^>]*src="[^"]*\/_next\/static\/chunks\/[^"]*"[^>]*>/gi)].map((m) => m[0])
      const asyncCount = tags.filter((tag) => /\basync\b/.test(tag)).length
      const deferCount = tags.filter((tag) => /\bdefer\b/.test(tag)).length
      console.log(`check-deferred-scripts: ${path} HTTP ${response.status} defer=${deferCount} async=${asyncCount}`)
      problems.push(...found)
    }
    if (problems.length) {
      fail(problems.join("\n"))
      failed = true
    } else {
      console.log("check-deferred-scripts: ok")
    }
  }
} finally {
  stop()
  await delay(300)
  try {
    process.kill(-child.pid, "SIGKILL")
  } catch {
    // already gone
  }
}

if (failed) process.exit(1)
