// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "migrations/functions/*"], // Deno edge functions, not app code
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"], // Node scripts
    languageOptions: { globals: { Buffer: "readonly", process: "readonly", __dirname: "readonly", require: "readonly", module: "writable" } },
  },
  {
    // React Compiler rules (eslint-plugin-react-hooks 7). The app does not use the React Compiler, and these rules flag
    // normal Reanimated shared-value writes (`sv.value = …`) and ref reads in render. Kept visible as warnings.
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/globals": "warn",
    },
  },
]);
