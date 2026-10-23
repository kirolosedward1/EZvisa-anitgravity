export const Platform = { OS: "node", select: (o) => o.default };
export const I18nManager = { isRTL: false, allowRTL() {}, forceRTL() {} };
export const DevSettings = { reload() {} };
export const Alert = { alert(title) { (globalThis.__calls ??= []).push(["alert", title]); } };
export const Linking = { openURL: async (u) => { (globalThis.__calls ??= []).push(["openURL", u]); }, openSettings: async () => {} };
export const ActionSheetIOS = { showActionSheetWithOptions() {} };
export const AppState = { addEventListener: () => ({ remove() {} }) };
// expo-modules-core (pulled in through expo-secure-store since chat 03) imports these; never called in the tests.
export const NativeEventEmitter = class { addListener() { return { remove() {} }; } removeAllListeners() {} };
export const TurboModuleRegistry = { get: () => null, getEnforcing: () => ({}) };
export const PixelRatio = { get: () => 2, getFontScale: () => 1, getPixelSizeForLayoutSize: (n) => n * 2, roundToNearestPixel: (n) => Math.round(n * 2) / 2 };
export const NativeModules = {};
export const AppRegistry = { registerComponent() {}, runApplication() {} };
export const LogBox = { ignoreLogs() {}, ignoreAllLogs() {} };
export const StyleSheet = { create: (s) => s, flatten: (s) => (Array.isArray(s) ? Object.assign({}, ...s.flat(9).filter(Boolean)) : s || {}), hairlineWidth: 0.5, absoluteFill: {}, absoluteFillObject: {} };
export const Text = function Text() { return null; };
export const View = function View() { return null; };
