// "Popular countries" on Home (owner, 30 Oct): a two-column grid of photo tiles, a photo of the country as the
// background, the round flag and the name on a flat scrim for contrast (no gradients). One column at large text sizes.
import { View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Flag, PressScale, SectionHeader, Text } from "../ui";
import { useColors, useLargeText, S, R, curve } from "../../lib/theme";
import { toSlug } from "../../lib/countries";
import { PHOTOS } from "../../lib/photos";
import { tap } from "../../lib/haptics";
import { useT } from "../../lib/i18n";

export const HOME_TILES = ["France", "Italy", "Spain", "Germany", "Greece", "Switzerland"];

export function PopularTiles({ names = HOME_TILES }: { names?: string[] }) {
  const c = useColors(); const { t } = useT(); const big = useLargeText(); const { width } = useWindowDimensions();
  const gap = 10; const cols = big ? 1 : 2;
  const w = (Math.min(width, 600) - S.gutter * 2 - gap * (cols - 1)) / cols;
  return (
    <View style={{ gap: S.xs }} testID="popular-countries">
      <SectionHeader title={t("Popular countries")} action={t("See all")} onAction={() => router.navigate("/countries")} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap, paddingHorizontal: S.gutter }}>
        {names.map((n) => {
          const photo = PHOTOS[toSlug(n)];
          return (
            <PressScale key={n} onPress={() => { tap(); router.push(`/destination/${toSlug(n)}`); }} accessibilityRole="button" accessibilityLabel={t(n)} testID="popular-tile"
              style={[{ width: w, height: big ? 120 : Math.round(w * 0.78), borderRadius: R.card, overflow: "hidden", backgroundColor: c.fill }, curve]}>
              {!!photo && <Image source={photo} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />}
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, backgroundColor: "rgba(0,0,0,0.28)" }} />
              <View style={{ flex: 1, padding: 12, justifyContent: "space-between" }}>
                <Flag country={n} size={26} />
                <Text variant="headline" weight="600" color="#FFFFFF" numberOfLines={1} style={{ textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>{t(n)}</Text>
              </View>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}
