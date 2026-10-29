import { Platform, TextStyle } from "react-native";

// One type scale. Sizes and line heights follow Apple's text styles. Dynamic Type stays ON (allowFontScaling);
// `TYPE_SCALE` caps the multiplier per role so big headings never overflow while body text scales furthest.
export type TextVariant = "display" | "largeTitle" | "title1" | "title2" | "title3" | "headline" | "body" | "callout" | "subhead" | "footnote" | "caption" | "caption2" | "overline"
  // Canvas roles (app design "EZvisa app with Globi"): use these on new and redrawn screens.
  | "question" | "pageTitle" | "resultTitle" | "tile" | "option" | "optionSm" | "row" | "button" | "note";

const F: TextStyle = Platform.OS === "web" ? { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif" } : {};
// Refined scale (premium, calm): smaller sizes, semibold (600) at most, slightly tight titles, letter-spaced capitals.
export const T: Record<TextVariant, TextStyle> = {
  display: { ...F, fontSize: 32, lineHeight: 38, fontWeight: "600", letterSpacing: -0.6 },
  largeTitle: { ...F, fontSize: 26, lineHeight: 32, fontWeight: "600", letterSpacing: -0.4 },
  title1: { ...F, fontSize: 22, lineHeight: 28, fontWeight: "600", letterSpacing: -0.3 },
  title2: { ...F, fontSize: 19, lineHeight: 24, fontWeight: "600", letterSpacing: -0.25 },
  title3: { ...F, fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.2 },
  headline: { ...F, fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.15 },
  body: { ...F, fontSize: 15, lineHeight: 22, fontWeight: "400", letterSpacing: -0.15 },
  callout: { ...F, fontSize: 14, lineHeight: 20, fontWeight: "400", letterSpacing: -0.1 },
  subhead: { ...F, fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.05 },
  footnote: { ...F, fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0 },
  caption: { ...F, fontSize: 11, lineHeight: 14, fontWeight: "500", letterSpacing: 0.1 },
  caption2: { ...F, fontSize: 10, lineHeight: 12, fontWeight: "500", letterSpacing: 0.1 },
  /** Small capital section labels ("APPLICATION HISTORY"); callers pass the text, it is shown in capitals. */
  overline: { ...F, fontSize: 11, lineHeight: 14, fontWeight: "600", letterSpacing: 0.9, textTransform: "uppercase" },
  // ---- Canvas roles. Maximum weight 600; never 700. ----
  /** The question inside Globi's bubble (it is the screen title). 19/600. */
  question: { ...F, fontSize: 19, lineHeight: 25, fontWeight: "600", letterSpacing: -0.2 },
  /** Large page titles (Home "Hi, Ahmed", Applications, Settings). 28/600. */
  pageTitle: { ...F, fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -0.5 },
  /** Result and dialog headings (Payment received, File ready, Visa approved). 23/600. */
  resultTitle: { ...F, fontSize: 23, lineHeight: 28, fontWeight: "600", letterSpacing: -0.3 },
  /** Yes / No tiles. 20/600. */
  tile: { ...F, fontSize: 20, lineHeight: 25, fontWeight: "600", letterSpacing: -0.2 },
  /** Option tiles and option rows. 16/500. */
  option: { ...F, fontSize: 16, lineHeight: 21, fontWeight: "500", letterSpacing: -0.15 },
  /** Grid option tiles (nationality, hotel, employment). 15/500. */
  optionSm: { ...F, fontSize: 15, lineHeight: 20, fontWeight: "500", letterSpacing: -0.1 },
  /** List row labels. 16/400; pass weight="600" for an emphasised or selected row. */
  row: { ...F, fontSize: 16, lineHeight: 21, fontWeight: "400", letterSpacing: -0.15 },
  /** Buttons. 16/600. */
  button: { ...F, fontSize: 16, lineHeight: 21, fontWeight: "600", letterSpacing: -0.15 },
  /** Info notes and sub-labels. 13/400 (captions use footnote 12 and callout 14). */
  note: { ...F, fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.05 },
};
/** Max Dynamic Type multiplier per role (body scales furthest; display least; tab labels fixed like iOS). */
export const TYPE_SCALE: Record<TextVariant, number> = { display: 1.3, largeTitle: 1.35, title1: 1.4, title2: 1.5, title3: 1.6, headline: 2, body: 2, callout: 2, subhead: 2, footnote: 1.8, caption: 1.6, caption2: 1, overline: 1.4,
  question: 1.6, pageTitle: 1.35, resultTitle: 1.4, tile: 1.6, option: 2, optionSm: 2, row: 2, button: 1.8, note: 2 };
/** Text inputs: large enough to read, small enough that a single-line field keeps its height. */
export const INPUT_SCALE = 1.6;
