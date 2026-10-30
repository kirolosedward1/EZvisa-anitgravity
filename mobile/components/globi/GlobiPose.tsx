// Globi, the EZvisa globe character: the supplied transparent clips, one per pose (components/globi/poses.ts).
//
// He moves with a transparent animated WebP per pose (assets/globi/anim, 320×320 at 12 fps, scripts/globi-convert.sh),
// played by expo-image on iOS, Android and web: no extra native module, so it ships in an over-the-air update. When the
// HEVC-with-alpha `.mov` clips exist (a macOS run of the script) and the build has expo-video, those play instead (smoother,
// 24 fps). The transparent `.webp` first frame is the only image when Reduce Motion is on, when "Globi animations" is off
// or when `animated` is false. Globi faces the text: he is mirrored in right-to-left layouts.
// Canvas rules: no gradients, glows or sparkles around him; one Globi per screen; never on the icon, splash or receipt.
import React, { useEffect, useRef, useState } from "react";
import { AppState, I18nManager, Image as RNImage, Platform, Pressable, StyleProp, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { requireOptionalNativeModule } from "expo";
import { useIsFocused } from "expo-router";
import { useReducedMotion } from "../../lib/motion";
import { useGlobiAnimations } from "../../lib/globiMotion";
import { useT } from "../../lib/i18n";
import { GLOBI_ANIMS, GLOBI_CLIPS, GLOBI_STILLS } from "../../assets/globi";
import type { GlobiPose as Pose } from "./poses";

// expo-video is loaded only when this build has its native module: an over-the-air update can reach a build made
// before the module was added, and a missing native module must not crash the app (the stills still show).
type VideoLib = typeof import("expo-video");
const video: VideoLib | null = (() => {
  try { return requireOptionalNativeModule("ExpoVideo") ? (require("expo-video") as VideoLib) : null; } catch { return null; }
})();

/** The 21-pose union (same name as the component: the type and the value live side by side). */
export type GlobiPose = Pose;
export { GLOBI_POSES, GLOBI_SIZE } from "./poses";

type Props = {
  pose: Pose;
  /** Square size in points (canvas: 124 beside a question, 96 in Home cards, 57 in info cards, 142–236 on result screens). */
  size: number;
  /** Loop the clip (default true). False shows the still. */
  animated?: boolean;
  /** Makes Globi a button (wizard questions open the "why this question" sheet). */
  onPress?: () => void;
  /** Spoken label when Globi is a button; otherwise he is decorative and hidden from VoiceOver. */
  accessibilityLabel?: string;
  /** Mirror override; default follows the reading direction. */
  mirrored?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** True outside a navigator (root overlays): those never sit off screen behind another page. */
function useFocusedSafe() {
  try { return useIsFocused(); } catch { return true; }
}

export function GlobiPose({ pose, size, animated = true, onPress, accessibilityLabel, mirrored, style, testID }: Props) {
  const reduce = useReducedMotion(); const allowed = useGlobiAnimations(); const { rtl } = useT();
  const flip = mirrored ?? (rtl || I18nManager.isRTL);
  const clip = GLOBI_CLIPS[pose];
  const move = animated && allowed && !reduce;
  const play = move && clip != null && video != null; // the HEVC clip, when this build and the assets have it
  const [shown, setShown] = useState(false); // the clip has rendered its first frame: hide the poster
  useEffect(() => { setShown(false); }, [pose, play]);

  const box: ViewStyle = { width: size, height: size, transform: flip ? [{ scaleX: -1 }] : undefined };
  const art = (
    <View style={[box, style]} pointerEvents={onPress ? "box-none" : "none"} testID={testID ?? `globi-${pose}`}
      accessibilityElementsHidden={!onPress} importantForAccessibility={onPress ? "auto" : "no-hide-descendants"}>
      {move && !play
        ? <GlobiAnim pose={pose} size={size} />
        : !shown && <Image source={GLOBI_STILLS[pose]} style={{ width: size, height: size }} contentFit="contain" transition={0} accessibilityIgnoresInvertColors />}
      {play && clip != null && <GlobiClip source={clip} size={size} onShown={() => setShown(true)} />}
    </View>
  );
  if (!onPress) return art;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {art}
    </Pressable>
  );
}

/** The animated WebP, looping. The still shows until the animation has loaded; it pauses off screen and in the background. */
function GlobiAnim({ pose, size }: { pose: Pose; size: number }) {
  const focused = useFocusedSafe(); const ref = useRef<Image>(null);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => { const s = AppState.addEventListener("change", (st) => setActive(st === "active")); return () => s.remove(); }, []);
  useEffect(() => { if (focused && active) ref.current?.startAnimating?.(); else ref.current?.stopAnimating?.(); }, [focused, active]);
  // Web: expo-image wraps the img in a zero-height box, and Chrome never advances an animation it considers off screen,
  // so the web build (previews, tests) uses React Native's own Image. iOS and Android decode the WebP natively.
  if (Platform.OS === "web") return <RNImage source={GLOBI_ANIMS[pose]} style={{ width: size, height: size }} resizeMode="contain" />;
  return (
    <Image ref={ref} source={GLOBI_ANIMS[pose]} placeholder={GLOBI_STILLS[pose]} placeholderContentFit="contain" autoplay={focused && active}
      style={{ width: size, height: size }} contentFit="contain" transition={0} accessibilityIgnoresInvertColors />
  );
}

/** The looping clip. Muted, mixes with the user's audio, never keeps the screen awake, pauses off screen and in the background. */
function GlobiClip({ source, size, onShown }: { source: number; size: number; onShown: () => void }) {
  const { useVideoPlayer, VideoView } = video!; // only rendered when the module exists
  const focused = useFocusedSafe();
  const player = useVideoPlayer(source, (p) => {
    p.loop = true; p.muted = true; p.audioMixingMode = "mixWithOthers"; p.keepScreenOnWhilePlaying = false; p.showNowPlayingNotification = false;
  });
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => { const s = AppState.addEventListener("change", (st) => setActive(st === "active")); return () => s.remove(); }, []);
  useEffect(() => { if (focused && active) player.play(); else player.pause(); }, [player, focused, active]);
  return (
    <VideoView player={player} nativeControls={false} contentFit="contain" allowsPictureInPicture={false} fullscreenOptions={{ enable: false }}
      onFirstFrameRender={onShown} style={{ position: "absolute", top: 0, left: 0, width: size, height: size, backgroundColor: "transparent" }} />
  );
}
