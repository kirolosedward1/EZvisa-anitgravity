import { Stack } from "expo-router";
import { useColors, useIsDark, isIOS } from "./theme";
export function useStackOptions() {
  const c = useColors(); const dark = useIsDark();
  return {
    headerLargeTitle: true,
    headerTransparent: isIOS,
    headerBlurEffect: isIOS ? (dark ? ("systemChromeMaterialDark" as const) : ("systemChromeMaterialLight" as const)) : undefined,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerTintColor: c.tint,
    headerTitleStyle: { color: c.label, fontWeight: "600" as const },
    headerLargeTitleStyle: { color: c.label, fontWeight: "700" as const },
    headerStyle: isIOS ? undefined : { backgroundColor: c.bg },
    contentStyle: { backgroundColor: c.bg },
    headerBackButtonDisplayMode: "minimal" as const,
  };
}
export function TabStack({ children }: { children?: React.ReactNode }) {
  return <Stack screenOptions={useStackOptions()}>{children}</Stack>;
}
