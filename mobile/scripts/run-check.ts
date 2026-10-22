// Runs a node-only check script (no device, no network): bundles it with Bun, replacing native/Expo modules with the
// stubs in scripts/stubs (same idea as run-e2e-v8.mjs, which needs esbuild). Usage: bun scripts/run-check.ts scripts/timeline-check.ts
// @ts-ignore bun runtime
declare const Bun: any; declare const process: any;
const dir = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
const STUB: Record<string, string> = {
  "react-native": `${dir}/stubs/rn.js`,
  "@react-native-async-storage/async-storage": `${dir}/stubs/storage.js`,
  "react-native-url-polyfill/auto": `${dir}/stubs/empty.js`,
  "expo-calendar/legacy": `${dir}/stubs/calendar.js`,
  "expo-crypto": `${dir}/stubs/crypto.js`,
};
const entry = process.argv[2];
const out = await Bun.build({
  entrypoints: [entry], target: "node", format: "esm",
  plugins: [{ name: "stubs", setup(b: any) { b.onResolve({ filter: /.*/ }, (a: any) => (STUB[a.path] ? { path: STUB[a.path] } : undefined)); } }],
});
if (!out.success) { console.error(out.logs); process.exit(1); }
const file = `/tmp/check-${Date.now()}.mjs`;
await Bun.write(file, out.outputs[0]);
const p = Bun.spawnSync(["bun", file], { stdout: "inherit", stderr: "inherit" });
process.exit(p.exitCode);
