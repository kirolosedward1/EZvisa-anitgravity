// react-native stub for the queue tests (only what the imported modules touch at load time).
export const Platform = { OS: "ios", select: (o) => o.ios ?? o.default };
export const AppState = { addEventListener: () => ({ remove() {} }) };
export const Alert = { alert() {} }; export const ActionSheetIOS = {}; export const Linking = { openSettings: async () => {} };
export const I18nManager = { isRTL: false, allowRTL() {}, forceRTL() {} }; export const DevSettings = { reload() {} };
export const Appearance = {}; export const useColorScheme = () => "light";
export const View = "View";
