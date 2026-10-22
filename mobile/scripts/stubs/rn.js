export const Platform = { OS: "node", select: (o) => o.default };
export const I18nManager = { isRTL: false, allowRTL() {}, forceRTL() {} };
export const DevSettings = { reload() {} };
export const Alert = { alert() {} };
export const Linking = { openURL: async () => {}, openSettings: async () => {} };
export const ActionSheetIOS = { showActionSheetWithOptions() {} };
export const AppState = { addEventListener: () => ({ remove() {} }) };
// expo-modules-core (pulled in through expo-secure-store since chat 03) imports these; never called in the tests.
export const NativeEventEmitter = class { addListener() { return { remove() {} }; } removeAllListeners() {} };
export const TurboModuleRegistry = { get: () => null, getEnforcing: () => ({}) };
