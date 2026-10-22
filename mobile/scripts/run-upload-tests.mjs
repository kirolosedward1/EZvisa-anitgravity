// Bundles scripts/test-upload-queue.ts with esbuild (react-native, NetInfo, file system and the server stubbed) and runs:
// the pure checks, then phase a (offline, mid-upload loss, duplicate, app killed) and phase b in a NEW process (restart).
// Usage: node scripts/run-upload-tests.mjs   (ESBUILD=/path/to/esbuild if it is not installed)
import fs from "fs"; import os from "os"; import path from "path"; import { execFileSync } from "child_process";
const { build } = await import(process.env.ESBUILD || "esbuild");
const dir = new URL(".", import.meta.url).pathname; const s = dir + "stubs/";
const out = path.join(os.tmpdir(), "ezvisa-upload-tests.mjs");
await build({ entryPoints: [dir + "test-upload-queue.ts"], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error",
  alias: { "react-native": s + "rn-queue.js", "@react-native-async-storage/async-storage": s + "storage-file.js", "@react-native-community/netinfo": s + "netinfo.js",
    "expo-crypto": s + "crypto.js", "expo-file-system": s + "fs.js", "react-native-url-polyfill/auto": s + "empty.js", "expo-image-picker": s + "empty.js", "expo-document-picker": s + "empty.js",
    "expo-image": s + "empty.js", "expo-updates": s + "empty.js" },
  plugins: [{ name: "fake-server", setup(b) {
    b.onResolve({ filter: /^\.\/data$/ }, (a) => (a.importer.endsWith("uploads.ts") ? { path: s + "data-server.ts" } : undefined));
    // Any other Expo / React Native package is only imported, never called, in these tests.
    const keep = new Set(["expo-crypto", "expo-file-system", "react-native-url-polyfill/auto"]);
    b.onResolve({ filter: /^(expo|@expo\/|react-native-)/ }, (a) => (keep.has(a.path) ? undefined : { path: s + "cjs-any.js" }));
  } }],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" } });
const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ezvisa-q-"));
const run = (phase) => execFileSync(process.execPath, [out, phase], { stdio: "inherit", env: { ...process.env, TEST_DIR } });
let failed = false;
for (const p of ["pure", "a", "b"]) { try { run(p); } catch { failed = true; } }
process.exit(failed ? 1 : 0);
