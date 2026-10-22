import { Platform, TextStyle } from "react-native";

// One type scale. Sizes and line heights follow Apple's text styles. Dynamic Type stays ON (allowFontScaling);
// `TYPE_SCALE` caps the multiplier per role so big headings never overflow while body text scales furthest.
export type TextVariant = "display" | "largeTitle" | "title1" | "title2" | "title3" | "headline" | "body" | "callout" | "subhead" | "footnote" | "caption" | "caption2";

const F: TextStyle = Platform.OS === "web" ? { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif" } : {};
export const T: Record<TextVariant, TextStyle> = {
  display: { ...F, fontSize: 40, lineHeight: 46, fontWeight: "800", letterSpacing: -1.2 },
  largeTitle: { ...F, fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.9 },
  title1: { ...F, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  title2: { ...F, fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.4 },
  title3: { ...F, fontSize: 20, lineHeight: 24, fontWeight: "600", letterSpacing: -0.35 },
  headline: { ...F, fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.35 },
  body: { ...F, fontSize: 17, lineHeight: 24, fontWeight: "400", letterSpacing: -0.35 },
  callout: { ...F, fontSize: 16, lineHeight: 22, fontWeight: "400", letterSpacing: -0.25 },
  subhead: { ...F, fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.2 },
  footnote: { ...F, fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.05 },
  caption: { ...F, fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0 },
  caption2: { ...F, fontSize: 11, lineHeight: 13, fontWeight: "500", letterSpacing: 0.06 }, // tab bar labels only
};
/** Max Dynamic Type multiplier per role (body scales furthest; display least; tab labels fixed like iOS). */
export const TYPE_SCALE: Record<TextVariant, number> = { display: 1.3, largeTitle: 1.35, title1: 1.4, title2: 1.5, title3: 1.6, headline: 2, body: 2, callout: 2, subhead: 2, footnote: 1.8, caption: 1.6, caption2: 1 };
/** Text inputs: large enough to read, small enough that a single-line field keeps its height. */
export const INPUT_SCALE = 1.6;
