// Photo header for the country screen (App Store "Today" story style):
// - PhotoHeader: the destination photo at HERO.ratio of the screen. Pulling down past the top stretches it (scale,
//   anchored to the top); scrolling up fades it a little. Ignored by VoiceOver.
// - TopBar: Back and Share (44pt, blurred, hairline ring, readable on any photo) that stay put, plus a compact
//   blurred bar with the small flag and the name that fades in once the large title has scrolled under it.
// - TitleBlock: round flag, large title, capital, and the visa type line.
// Motion is driven only by the user's own scrolling; with Reduce Motion the photo does not scale and the bar
// switches without a fade.
import { Platform, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, Icon, PressScale, Text, type IconName } from "../ui";
import { useColors, useIsDark, S, R, HIT, ICON, AVATAR, BLUR, curve } from "../../lib/theme";
import { useT } from "../../lib/i18n";

const FADE_TO = 0.6; // photo opacity once it has scrolled fully out (a slight fade, not a disappearance)

export function PhotoHeader({ photo, height, scrollY }: { photo: number; height: number; scrollY: SharedValue<number> }) {
  const c = useColors(); const reduce = useReducedMotion();
  const a = useAnimatedStyle(() => {
    const y = scrollY.value;
    if (y < 0) return reduce ? { transform: [{ translateY: y }] } : { transform: [{ translateY: y / 2 }, { scale: 1 - y / height }] };
    return { opacity: interpolate(y, [0, height], [1, FADE_TO], Extrapolation.CLAMP) };
  });
  return (
    <Animated.View style={[{ height, backgroundColor: c.fill }, a]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="country-photo">
      <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" accessibilityIgnoresInvertColors />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.imageScrim }]} />
    </Animated.View>
  );
}

/** Blurred material on iOS; elsewhere the opaque chrome colour (Android blur over a moving photo is costly, and the
 *  web preview's backdrop blur lets text show through under the title). */
function Material({ intensity, round }: { intensity: number; round?: boolean }) {
  const c = useColors(); const dark = useIsDark();
  const st = [StyleSheet.absoluteFill, round && { borderRadius: R.round, overflow: "hidden" as const }];
  if (Platform.OS !== "ios") return <View style={[st, { backgroundColor: c.chrome }]} />;
  return <BlurView intensity={intensity} tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={st} />;
}

function RoundButton({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  const c = useColors();
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID}
      style={[{ width: HIT, height: HIT, borderRadius: R.round, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }, curve]}>
      <Material intensity={BLUR.control} round />
      <Icon name={icon} size={ICON.md} color={c.label} weight="semibold" />
    </PressScale>
  );
}

export const topBarHeight = (insetTop: number) => insetTop + HIT + S.xs * 2;

/** `showAt`: scroll offset at which the large title is under the bar. */
export function TopBar({ name, title, scrollY, showAt, onBack, onShare }: { name: string; title: string; scrollY: SharedValue<number>; showAt: number; onBack: () => void; onShare: () => void }) {
  const c = useColors(); const i = useSafeAreaInsets(); const { t, rtl } = useT(); const reduce = useReducedMotion();
  const h = topBarHeight(i.top);
  const bar = useAnimatedStyle(() => ({ opacity: reduce ? (scrollY.value >= showAt ? 1 : 0) : interpolate(scrollY.value, [showAt - S.xl, showAt], [0, 1], Extrapolation.CLAMP) }));
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, start: 0, end: 0, height: h }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator, overflow: "hidden" }, bar]} testID="country-bar">
        <Material intensity={BLUR.chrome} />
        <View style={{ position: "absolute", top: i.top, bottom: 0, start: HIT + S.md * 2, end: HIT + S.md * 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.xs }}>
          <Flag country={name} size={AVATAR.sm} />
          <Text variant="headline" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ flexShrink: 1 }}>{title}</Text>
        </View>
      </Animated.View>
      <View pointerEvents="box-none" style={{ position: "absolute", top: i.top + S.xs, start: S.md, end: S.md, flexDirection: "row", justifyContent: "space-between" }}>
        <RoundButton icon={rtl ? "chevron.right" : "chevron.left"} label={t("Back")} onPress={onBack} testID="country-back" />
        <RoundButton icon="square.and.arrow.up" label={t("Share")} onPress={onShare} testID="country-share" />
      </View>
    </View>
  );
}

export function TitleBlock({ name, title, capital }: { name: string; title: string; capital: string }) {
  const { t } = useT();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.gutter }} testID="country-title">
      <Flag country={name} size={AVATAR.lg} />
      <View style={{ flex: 1 }}>
        <Text variant="largeTitle" accessibilityRole="header">{title}</Text>
        {!!capital && <Text variant="subhead" tone="secondary">{capital}</Text>}
        <Text variant="footnote" tone="secondary" style={{ marginTop: S.xxs }}>{t("Schengen short-stay visa")}</Text>
      </View>
    </View>
  );
}

