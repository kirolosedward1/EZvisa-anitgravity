import { useColorScheme } from "react-native"

/**
 * Mirrors the web design tokens (app/globals.css): bright white surfaces,
 * brand blue, neutral grays, 16px radius, Poppins-like semibold headings
 * (system font on iOS). No purple, no glass.
 */
const light = {
  background: "#FFFFFF",
  surface: "#F5F7FC",
  card: "#FFFFFF",
  text: "#0B1020",
  textMuted: "#5B6478",
  border: "#E3E7F0",
  primary: "#0536DC",
  primaryText: "#FFFFFF",
  primarySoft: "#E9EEFE",
  accent: "#4C74F2",
  success: "#0E8A4F",
  successSoft: "#E3F6EC",
  warning: "#B25E00",
  warningSoft: "#FFF2DF",
  danger: "#C4262E",
  dangerSoft: "#FDE8E9",
}

const dark: typeof light = {
  background: "#0B1020",
  surface: "#121931",
  card: "#161E39",
  text: "#F2F4FA",
  textMuted: "#9AA3B8",
  border: "#263055",
  primary: "#4C74F2",
  primaryText: "#FFFFFF",
  primarySoft: "#1B2756",
  accent: "#7C9BFF",
  success: "#3DCB86",
  successSoft: "#12321F",
  warning: "#F0A43A",
  warningSoft: "#3A2A10",
  danger: "#FF6B72",
  dangerSoft: "#3D1518",
}

export type Colors = typeof light

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light
}

export const radius = { sm: 10, md: 16, lg: 20, pill: 999 }
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
export const type = {
  title: { fontSize: 28, fontWeight: "600" as const, letterSpacing: -0.4 },
  heading: { fontSize: 20, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: "500" as const },
  caption: { fontSize: 13, lineHeight: 18 },
}
