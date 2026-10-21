import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { useColors, useIsDark, isIOS } from "./theme";
import { Icon } from "../components/ui";

const ROOTS = ["index", "countries"];
const ROOT_OF: Record<string, string> = { "[id]": "/applications", "notifications": "/account", "destination/[slug]": "/", "country/[slug]": "/countries" };

/** iOS back chevron for a detail screen that was opened without a screen under it (deep link, push, cross-tab). */
export function HeaderBack({ fallback }: { fallback: string }) {
  const c = useColors();
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as any))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" testID="header-back"
      style={{ minWidth: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
      <Icon name="chevron.left" size={20} color={c.tint} weight="semibold" />
    </Pressable>
  );
}

export function useStackOptions() {
  const c = useColors(); const dark = useIsDark();
  const base = {
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
  // Every non-root screen always gets the same back chevron (the default one is missing on deep links / cross-tab pushes
  // and on web). Swipe-back still works: it's a native-stack gesture, independent of headerLeft.
  return ({ route }: { route: { name: string } }) =>
    ROOTS.includes(route.name) ? base : { ...base, headerBackVisible: false, headerLeft: () => <HeaderBack fallback={ROOT_OF[route.name] ?? "/"} /> };
}
export function TabStack({ children }: { children?: React.ReactNode }) {
  return <Stack screenOptions={useStackOptions() as any}>{children}</Stack>;
}
