// Lets Node run the app's plain TS modules for tests (node --import ./scripts/ts-hooks.mjs file.ts): resolves the
// extensionless relative imports the app uses ("./wizard" -> "./wizard.ts"). Type stripping is built into Node 22.18+.
import { registerHooks } from "node:module";
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(spec)) {
      for (const ext of [".ts", ".tsx", "/index.ts"]) { try { return next(spec + ext, ctx); } catch {} }
    }
    return next(spec, ctx);
  },
});
