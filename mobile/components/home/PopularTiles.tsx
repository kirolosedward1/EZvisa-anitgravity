// "Popular countries" (canvas Home, EmptyHome, HomeDraft): three soft-tinted tiles with the round flag and the name.
import { View } from "react-native";
import { router } from "expo-router";
import { Flag, PressScale, SectionHeader, Text } from "../ui";
import { useColors, useIsDark, useLargeText, S, R, curve } from "../../lib/theme";
import { toSlug } from "../../lib/countries";
import { tap } from "../../lib/haptics";
import { useT } from "../../lib/i18n";

/** Canvas tints (light / dark, HomeDark.dc.html). Other countries use the neutral fill. */
const TINT: Record<string, [string, string]> = { France: ["#E8ECFB", "#1A2140"], Italy: ["#E6E6E3", "#242424"], Spain: ["#EDE9DD", "#2A251C"] };
export const HOME_TILES = ["France", "Italy", "Spain"];

export function PopularTiles({ names = HOME_TILES }: { names?: string[] }) {
  const c = useColors(); const dark = useIsDark(); const { t } = useT(); const big = useLargeText();
  return (
    <View style={{ gap: S.xs }} testID="popular-countries">
      <SectionHeader title={t("Popular countries")} action={t("See all")} onAction={() => router.navigate("/countries")} />
      <View style={{ flexDirection: big ? "column" : "row", gap: 10, paddingHorizontal: S.gutter }}>
        {names.map((n) => (
          <PressScale key={n} onPress={() => { tap(); router.push(`/destination/${toSlug(n)}`); }} accessibilityRole="button" accessibilityLabel={t(n)} testID="popular-tile"
            style={[{ flex: big ? undefined : 1, minHeight: 84, borderRadius: R.card, padding: 10, justifyContent: "space-between", backgroundColor: TINT[n]?.[dark ? 1 : 0] ?? c.fill }, curve]}>
            <Flag country={n} size={24} />
            <Text variant="callout" weight="600" numberOfLines={1}>{t(n)}</Text>
          </PressScale>
        ))}
      </View>
    </View>
  );
}
