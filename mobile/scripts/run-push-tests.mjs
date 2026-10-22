// Bundles scripts/test-push.ts with esbuild (React, React Native, Expo modules and the Supabase client replaced by fakes that
// the test drives through globalThis.__push) and runs it once per platform, each in a fresh process, because lib/push.ts
// reads Platform and the Expo Go flag when it loads.
// Usage: node scripts/run-push-tests.mjs   (ESBUILD=/path/to/esbuild if it is not installed)
import os from "os"; import path from "path"; import { execFileSync } from "child_process";
const { build } = await import(process.env.ESBUILD || "esbuild");
const dir = new URL(".", import.meta.url).pathname; const s = dir + "stubs/";
const out = path.join(os.tmpdir(), "ezvisa-push-tests.mjs");
// Each fake module re-exports what the test put on globalThis.__push.fakes.
const FAKES = ["react", "react-native", "expo-constants", "expo-router", "expo-device", "expo-notifications"];
await build({ entryPoints: [dir + "test-push.ts"], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error",
  alias: { "@react-native-async-storage/async-storage": s + "storage.js", "expo-crypto": s + "crypto.js" },
  plugins: [{ name: "fakes", setup(b) {
    b.onResolve({ filter: new RegExp(`^(${FAKES.join("|")})$`) }, (a) => ({ path: a.path, namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, (a) => ({ contents: `module.exports = globalThis.__push.fakes[${JSON.stringify(a.path)}];`, loader: "js" }));
    b.onResolve({ filter: /^\.\/supabase$/ }, (a) => (a.importer.endsWith(path.join("lib", "data.ts")) ? { path: "supabase", namespace: "fake-sb" } : undefined));
    b.onLoad({ filter: /.*/, namespace: "fake-sb" }, () => ({ contents: "module.exports = { supabase: globalThis.__push.supabase };", loader: "js" }));
  } }],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" } });
let failed = false;
for (const p of ["ios", "android-expo-go", "web"]) {
  try { execFileSync(process.execPath, [out, p], { stdio: "inherit" }); } catch { failed = true; }
}
process.exit(failed ? 1 : 0);
