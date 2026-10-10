// Lets the app import the wizard schema shared with the Next.js API
// (../lib/shared) so validation, options and pricing never drift apart.
const path = require("path")
const { getDefaultConfig } = require("expo/metro-config")

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, "../lib/shared")

const config = getDefaultConfig(projectRoot)
config.watchFolders = [...(config.watchFolders || []), sharedRoot]
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")]
config.resolver.extraNodeModules = { ...(config.resolver.extraNodeModules || {}), "@shared": sharedRoot }

module.exports = config
