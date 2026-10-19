import { Image } from "react-native";
import { useIsDark } from "../lib/theme";
export function Logo({ height = 28 }: { height?: number }) {
  const dark = useIsDark();
  return <Image source={dark ? require("../assets/logo-dark.png") : require("../assets/logo.png")} style={{ height, width: height * (873 / 216) }} resizeMode="contain" accessibilityLabel="EZvisa" accessibilityRole="image" />;
}
