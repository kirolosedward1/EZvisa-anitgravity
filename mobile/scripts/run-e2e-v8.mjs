// Bundles scripts/e2e-v8.ts with esbuild (react-native stubbed) and runs it with the .env values.
import fs from "fs"; import { execFileSync } from "child_process";
const { build } = await import(process.env.ESBUILD || "esbuild");
const dir = new URL(".", import.meta.url).pathname;
const env = Object.fromEntries(fs.readFileSync(dir + "../.env", "utf8").split("\n").filter((l) => /^\w+=/.test(l)).map((l) => l.split(/=(.*)/s).slice(0, 2)));
await build({ entryPoints: [dir + "e2e-v8.ts"], bundle: true, platform: "node", format: "esm", outfile: "/tmp/e2e-v8.mjs", logLevel: "error", define: { __DEV__: "false" },
  alias: { "react-native": dir + "stubs/rn.js", "@react-native-async-storage/async-storage": dir + "stubs/storage.js", "react-native-url-polyfill/auto": dir + "stubs/empty.js", "expo-secure-store": dir + "stubs/secure-store.js" },
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" } });
execFileSync(process.execPath, ["/tmp/e2e-v8.mjs"], { stdio: "inherit", env: { ...process.env, ...env } });
