// Bundles scripts/test-after-payment.ts with esbuild (react-native, storage and lib/supabase.ts stubbed) and runs it. No .env needed.
import { execFileSync } from "child_process";
const { build } = await import(process.env.ESBUILD || "esbuild");
const dir = new URL(".", import.meta.url).pathname;
await build({ entryPoints: [dir + "test-after-payment.ts"], bundle: true, platform: "node", format: "esm", outfile: "/tmp/test-after-payment.mjs", logLevel: "error",
  alias: { "react-native": dir + "stubs/rn.js", "@react-native-async-storage/async-storage": dir + "stubs/storage.js", "react-native-url-polyfill/auto": dir + "stubs/empty.js", "expo-crypto": dir + "stubs/empty.js" },
  plugins: [{ name: "fake-supabase", setup(b) { b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: dir + "stubs/supabase.js" })); } }],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" } });
execFileSync(process.execPath, ["/tmp/test-after-payment.mjs"], { stdio: "inherit" });
