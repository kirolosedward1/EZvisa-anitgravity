// Bundles scripts/test-privacy.ts with esbuild (React Native stubbed) and runs it. No network, no database.
import { execFileSync } from "child_process";
const { build } = await import(process.env.ESBUILD || "esbuild");
const dir = new URL(".", import.meta.url).pathname;
await build({ entryPoints: [dir + "test-privacy.ts"], bundle: true, platform: "node", format: "esm", outfile: "/tmp/test-privacy.mjs", logLevel: "error", define: { __DEV__: "false" },
  alias: { "react-native": dir + "stubs/rn.js", "@react-native-async-storage/async-storage": dir + "stubs/storage.js", "react-native-url-polyfill/auto": dir + "stubs/empty.js",
    "expo-constants": dir + "stubs/constants.js", "@react-native-community/netinfo": dir + "stubs/netinfo.js", "expo-secure-store": dir + "stubs/secure-store.js" },
  plugins: [{ name: "fake-supabase", setup(b) { b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: dir + "stubs/supabase-fake.js" })); } }],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" } });
execFileSync(process.execPath, ["/tmp/test-privacy.mjs"], { stdio: "inherit", env: { ...process.env, EXPO_PUBLIC_SUPABASE_URL: "", EXPO_PUBLIC_SUPABASE_ANON_KEY: "", EXPO_PUBLIC_SENTRY_DSN: "https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/42" } });
