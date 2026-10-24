import { Platform, TextStyle } from "react-native";

// One type scale: Apple's iOS text styles at the default (Large) size, from the HIG typography specifications.
// Nothing is smaller than 11 pt (HIG minimum) and body copy is 17 pt (HIG default). Dynamic Type stays ON
// (allowFontScaling); `TYPE_SCALE` caps the multiplier per role so the hierarchy survives the largest sizes.
export type TextVariant = "display" | "largeTitle" | "title1" | "title2" | "title3" | "headline" | "body" | "callout" | "subhead" | "footnote" | "caption" | "caption2" | "overline";

const web = Platform.OS === "web";
const F: TextStyle = web ? { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif" } : {};
// On iOS the system font sets its own tracking at every point size (HIG › Typography › "If necessary, adjust tracking
// in interface mockups"), so native text gets no manual letter spacing. The web preview keeps SF's published values.
const track = (v: number): TextStyle => (web ? { letterSpacing: v } : {});
// Weights: semibold (600) carries hierarchy, regular is for reading. Captions stay medium so 11-12 pt reads well.
export const T: Record<TextVariant, TextStyle> = {
  display: { ...F, fontSize: 34, lineHeight: 41, fontWeight: "700", ...track(0.4) },
  largeTitle: { ...F, fontSize: 34, lineHeight: 41, fontWeight: "600", ...track(0.4) },
  title1: { ...F, fontSize: 28, lineHeight: 34, fontWeight: "600", ...track(0.38) },
  title2: { ...F, fontSize: 22, lineHeight: 28, fontWeight: "600", ...track(-0.26) },
  title3: { ...F, fontSize: 20, lineHeight: 25, fontWeight: "600", ...track(-0.45) },
  headline: { ...F, fontSize: 17, lineHeight: 22, fontWeight: "600", ...track(-0.43) },
  body: { ...F, fontSize: 17, lineHeight: 22, fontWeight: "400", ...track(-0.43) },
  callout: { ...F, fontSize: 16, lineHeight: 21, fontWeight: "400", ...track(-0.31) },
  subhead: { ...F, fontSize: 15, lineHeight: 20, fontWeight: "400", ...track(-0.23) },
  footnote: { ...F, fontSize: 13, lineHeight: 18, fontWeight: "400", ...track(-0.08) },
  caption: { ...F, fontSize: 12, lineHeight: 16, fontWeight: "500", ...track(0) },
  caption2: { ...F, fontSize: 11, lineHeight: 13, fontWeight: "500", ...track(0.06) },
  /** Inset-grouped section header ("APPLICATION HISTORY"): footnote size in capitals, as in iOS grouped lists. */
  overline: { ...F, fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: 0.3, textTransform: "uppercase" },
};
/** Max Dynamic Type multiplier per role. Reading text reaches 2x (HIG: let people enlarge text by at least 200%).
 *  Titles grow less, as in Apple's accessibility sizes, but always stay larger than the body text beside them.
 *  Fixed labels (tab bar labels, the A-Z index, avatar initials) pass their own `maxFontSizeMultiplier`. */
export const TYPE_SCALE: Record<TextVariant, number> = { display: 1.6, largeTitle: 1.75, title1: 1.8, title2: 1.9, title3: 2, headline: 2, body: 2, callout: 2, subhead: 2, footnote: 2, caption: 2, caption2: 2, overline: 2 };
/** Text inputs: large enough to read, small enough that a single-line field keeps its height. */
export const INPUT_SCALE = 1.6;
