// The wizard reads some option lists straight from the website's plain modules in the repo root (../lib/countries.ts,
// ../lib/residence.ts) so the app and www.ezvisa.net share one source. Metro only serves files inside watchFolders,
// so add that one folder (not the whole website). Those modules must stay dependency-free.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [...new Set([...(config.watchFolders ?? []), path.resolve(__dirname, "../lib")])];

module.exports = config;
