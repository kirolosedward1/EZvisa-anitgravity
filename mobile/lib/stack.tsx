import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { useColors, useIsDark, isIOS, HIT, ICON } from "./theme";
import { useT } from "./i18n";
import { Icon } from "../components/ui";

const ROOTS = ["index", "countries"];
const ROOT_OF: Record<string, string> = { "[id]": "/applications", "notifications": "/account", "details": "/account", "settings": "/account", "travellers": "/account", "destination/[slug]": "/", "country/[slug]": "/countries" };

/** iOS back chevron for a detail screen that was opened without a screen under it (deep link, push, cross-tab). */
export function HeaderBack({ fallback, navigation }: { fallback: string; navigation?: { getState: () => { index: number }; goBack: () => void } }) {
  const c = useColors(); const { t, rtl } = useT();
  // Back stays inside this tab: pop to the screen under this one, or open the tab's list when there is none.
  // (router.canGoBack() also counts other tabs, so a deep-linked application went back to Home instead of the list.)
  const back = () => { if (navigation) return navigation.getState().index > 0 ? navigation.goBack() : router.replace(fallback as any); return router.canGoBack() ? router.back() : router.replace(fallback as any); };
  return (
    <Pressable onPress={back} hitSlop={HIT / 4} accessibilityRole="button" accessibilityLabel={t("Back")} testID="header-back"
      style={({ pressed }) => ({ minWidth: HIT, height: HIT, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
      <Icon name={rtl ? "chevron.right" : "chevron.left"} size={ICON.lg - 2} color={c.accent} weight="semibold" />
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
    headerLargeTitleStyle: { color: c.label, fontWeight: "600" as const },
    headerStyle: isIOS ? undefined : { backgroundColor: c.bg },
    contentStyle: { backgroundColor: c.bg },
    headerBackButtonDisplayMode: "minimal" as const,
  };
  // Every non-root screen always gets the same back chevron (the default one is missing on deep links / cross-tab pushes
  // and on web). Swipe-back still works: it's a native-stack gesture, independent of headerLeft.
  return ({ route, navigation }: { route: { name: string }; navigation: any }) =>
    ROOTS.includes(route.name) ? base : { ...base, headerBackVisible: false, headerLeft: () => <HeaderBack fallback={ROOT_OF[route.name] ?? "/"} navigation={navigation} /> };
}
export function TabStack({ children }: { children?: React.ReactNode }) {
  return <Stack screenOptions={useStackOptions() as any}>{children}</Stack>;
}
