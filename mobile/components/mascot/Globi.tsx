// Globi, the EZvisa mascot: a round brand-blue globe with soft invented continents, a paper plane on a dotted orbit,
// stubby arms and white sneakers. One component, one `pose` per question and an optional `mood`; props sit in his hands.
// Drawn in the 200 x 200 space of the design canvas and scaled by `size`. Colours are fixed brand values on purpose
// (the character looks the same in dark mode, like the logo), except the ground shadow which follows the scheme.
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";
import { useIsDark } from "../../lib/theme";

export type GlobiPose = "idle" | "wave" | "suitcase" | "book" | "flag" | "pin" | "write" | "phone" | "think" | "duo" | "pilot" | "celebrate" | "map" | "calendar" | "calendar-check" | "sleep" | "coin" | "lock" | "stamps" | "heart" | "plane" | "idcard" | "party" | "shield" | "magnify" | "briefcase" | "letter" | "thumbs";
export type GlobiMood = "happy" | "excited" | "think" | "calm" | "sleepy" | "wow";

const BLUE = "#0436DC", LAND = "#8CA2FF", INK = "#111114", WHITE = "#FFFFFF", GREEN = "#1A7F37";
const DEFAULT_MOOD: Partial<Record<GlobiPose, GlobiMood>> = { celebrate: "excited", pilot: "excited", thumbs: "excited", party: "excited", think: "think", magnify: "think", sleep: "sleepy", heart: "calm", lock: "calm" };
const UP_RIGHT: GlobiPose[] = ["flag", "pin", "phone", "calendar", "calendar-check", "coin", "heart", "shield", "letter", "thumbs", "pilot"];

type Arm = { L?: string; lh?: [number, number]; R?: string; rh?: [number, number] };
function arms(pose: GlobiPose): Required<Arm> {
  const down: Required<Arm> = { L: "M44 116 q-14 10 -12 30", lh: [32, 148], R: "M156 116 q14 10 12 30", rh: [168, 148] };
  const upR: Arm = { R: "M156 108 q22 -8 24 -34", rh: [180, 74] };
  const lowR: Arm = { R: "M156 120 q12 4 12 20", rh: [168, 144] };
  const lowL: Arm = { L: "M44 120 q-12 4 -12 20", lh: [32, 144] };
  const centre: Arm = { L: "M46 128 q-6 14 14 22", lh: [66, 150], R: "M154 128 q6 14 -14 22", rh: [134, 150] };
  const v: Arm =
    pose === "wave" ? { L: "M44 108 q-18 -18 -14 -44", lh: [30, 66], ...lowR } :
    pose === "suitcase" || pose === "book" ? lowL :
    UP_RIGHT.includes(pose) ? upR :
    pose === "write" ? { L: "M44 126 q-8 10 2 20", lh: [36, 150], R: "M156 124 q10 12 -4 24", rh: [154, 150] } :
    pose === "think" ? { R: "M156 114 q10 -8 6 -22", rh: [160, 92] } :
    pose === "magnify" ? { R: "M156 108 q14 -10 10 -26", rh: [162, 84] } :
    pose === "map" || pose === "lock" || pose === "briefcase" ? lowR :
    pose === "stamps" || pose === "idcard" ? centre :
    pose === "celebrate" ? { L: "M44 96 q-16 -10 -18 -32", lh: [24, 58], R: "M156 96 q16 -10 18 -32", rh: [176, 58] } :
    pose === "duo" ? { R: "M156 122 q6 6 10 2", rh: [164, 124] } :
    pose === "sleep" ? { L: "M44 122 q-10 6 -8 22", lh: [36, 148], R: "M156 122 q10 6 8 22", rh: [164, 148] } : {};
  return { ...down, ...v };
}

const MOUTH: Record<GlobiMood, [string, string]> = {
  happy: ["M92 114 q8 8 16 0", "none"],
  excited: ["M90 112 q10 14 20 0 z", INK],
  think: ["M98 116 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", WHITE],
  calm: ["M94 114 q7 5 14 0", "none"],
  sleepy: ["M96 114 q6 4 12 0", "none"],
  wow: ["M95 112 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0", INK],
};

export type GlobiProps = { pose?: GlobiPose; mood?: GlobiMood; tie?: boolean; size?: number; /** Gentle idle bob (off under Reduce Motion). */ animate?: boolean; accessibilityLabel?: string };

export function Globi({ pose = "idle", mood, tie = false, size = 120, animate = true, accessibilityLabel }: GlobiProps) {
  const dark = useIsDark(); const reduce = useReducedMotion();
  const m = mood ?? DEFAULT_MOOD[pose] ?? "happy";
  const a = arms(pose);
  const is = (p: GlobiPose) => pose === p;
  const topLeftBusy = is("wave") || is("celebrate") || is("plane") || is("party");
  const orbit = !topLeftBusy && !is("pilot") && !is("duo");
  const [mouth, mouthFill] = MOUTH[m];
  const eyesOpen = m !== "sleepy" && m !== "calm" && m !== "excited";
  const pupil = m === "wow" ? 6.5 : 5.5;
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduce || !animate) { bob.value = 0; return; }
    bob.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, animate, bob]);
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * bob.value }] }));
  const sw = 4;

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? `Globi, the EZvisa mascot, ${pose.replace("-", " ")}`}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {is("plane") && <>
          <Path d="M10 30 q40 -28 72 0 t82 -6" fill="none" stroke={BLUE} strokeWidth={3} strokeDasharray="4 6" strokeLinecap="round" />
          <Path d="M164 14 l20 10 l-20 6 l4 -8 z" fill={BLUE} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </>}
        <Ellipse cx={100} cy={186} rx={50} ry={6} fill={dark ? "rgba(255,255,255,0.08)" : "#E4E7F6"} />
        {is("duo") && <Ellipse cx={172} cy={186} rx={28} ry={5} fill={dark ? "rgba(255,255,255,0.08)" : "#E4E7F6"} />}
      </Svg>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, bobStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          {is("duo") && <G>
            <Circle cx={172} cy={140} r={32} fill={LAND} stroke={INK} strokeWidth={3.5} />
            <Path d="M150 128 q10 -6 18 2 q2 8 -8 10 q-10 0 -10 -12 z" fill="#B8C6FF" />
            <Path d="M184 150 q10 -4 14 6 q-4 8 -12 6 q-6 -4 -2 -12 z" fill="#B8C6FF" />
            <Ellipse cx={164} cy={138} rx={5.5} ry={7} fill={WHITE} /><Ellipse cx={182} cy={138} rx={5.5} ry={7} fill={WHITE} />
            <Circle cx={165} cy={139.5} r={3} fill={INK} /><Circle cx={183} cy={139.5} r={3} fill={INK} />
            <Path d="M168 150 q5 5 10 0" fill="none" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M204 150 q10 2 8 14" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" /><Circle cx={210} cy={166} r={5.5} fill={LAND} stroke={INK} strokeWidth={3.5} />
            <Ellipse cx={162} cy={178} rx={9} ry={5.5} fill={WHITE} stroke={INK} strokeWidth={3.5} /><Ellipse cx={184} cy={178} rx={9} ry={5.5} fill={WHITE} stroke={INK} strokeWidth={3.5} />
          </G>}
          {orbit && <Ellipse cx={100} cy={100} rx={76} ry={24} fill="none" stroke={INK} strokeWidth={2.5} strokeDasharray="5 7" transform="rotate(-18 100 100)" opacity={0.55} />}

          <Ellipse cx={80} cy={176} rx={14} ry={8} fill={WHITE} stroke={INK} strokeWidth={sw} />
          <Ellipse cx={120} cy={176} rx={14} ry={8} fill={WHITE} stroke={INK} strokeWidth={sw} />
          <Path d="M70 177 h20 M110 177 h20" stroke={BLUE} strokeWidth={2.5} strokeLinecap="round" />

          <Path d={a.L} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
          <Path d={a.R} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />

          <Circle cx={100} cy={100} r={60} fill={BLUE} stroke={INK} strokeWidth={sw} />
          <Path d="M58 72 q18 -10 30 4 q8 12 -6 18 q-16 4 -24 -4 q-8 -8 0 -18 z" fill={LAND} />
          <Path d="M118 50 q22 -2 30 14 q4 12 -10 14 q-18 -2 -22 -14 q-2 -10 2 -14 z" fill={LAND} />
          <Path d="M120 122 q20 -6 26 12 q-4 16 -22 14 q-14 -6 -4 -26 z" fill={LAND} />
          <Path d="M62 130 q10 -8 20 2 q-2 14 -16 12 q-10 -4 -4 -14 z" fill={LAND} />
          <Path d="M100 48 q8 -8 16 -2" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={3} strokeLinecap="round" />
          {orbit && <Path d="M26 52 l18 9 l-18 5 l4 -7 z" fill={WHITE} stroke={INK} strokeWidth={3} strokeLinejoin="round" />}

          {is("pilot") && <>
            <Path d="M56 56 q44 -36 88 0 l-3 10 q-41 -26 -82 0 z" fill={INK} />
            <Path d="M62 56 q38 -16 76 0" fill="none" stroke="#FAFAF8" strokeWidth={3} strokeLinecap="round" />
            <Path d="M86 36 q14 -6 28 0" fill="none" stroke={WHITE} strokeWidth={3} strokeLinecap="round" /><Circle cx={100} cy={36} r={3.5} fill={WHITE} />
          </>}
          {is("party") && <>
            <Path d="M80 48 l20 -40 l20 40 z" fill={WHITE} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <Path d="M88 32 l24 0 M84 40 l32 0" stroke={BLUE} strokeWidth={3} strokeLinecap="round" /><Circle cx={100} cy={9} r={5} fill={BLUE} stroke={INK} strokeWidth={3} />
          </>}
          {is("sleep") && <>
            <Path d="M150 44 h14 l-14 14 h14" fill="none" stroke={BLUE} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M170 24 h10 l-10 10 h10" fill="none" stroke={BLUE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </>}
          {is("think") && <>
            <SvgText x={166} y={54} fontSize={30} fontWeight="700" fill={BLUE}>?</SvgText>
            <SvgText x={150} y={36} fontSize={18} fontWeight="700" fill={LAND}>?</SvgText>
          </>}
          {is("celebrate") && <>
            <Rect x={14} y={24} width={8} height={8} rx={2} fill={BLUE} transform="rotate(20 18 28)" /><Rect x={176} y={18} width={8} height={8} rx={2} fill={BLUE} transform="rotate(-25 180 22)" />
            <Circle cx={36} cy={14} r={4} fill={LAND} /><Circle cx={160} cy={36} r={3} fill={INK} />
            <Path d="M100 12 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill={BLUE} />
          </>}

          <Ellipse cx={86} cy={96} rx={11} ry={13} fill={WHITE} />
          <Ellipse cx={118} cy={96} rx={11} ry={13} fill={WHITE} />
          {eyesOpen && <>
            <Circle cx={88} cy={98} r={pupil} fill={INK} /><Circle cx={120} cy={98} r={pupil} fill={INK} />
            <Circle cx={90.5} cy={94.5} r={2} fill={WHITE} /><Circle cx={122.5} cy={94.5} r={2} fill={WHITE} />
          </>}
          {(m === "sleepy" || m === "calm") && <>
            <Path d="M78 98 q8 5 16 0" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" /><Path d="M110 98 q8 5 16 0" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
          </>}
          {m === "excited" && <>
            <Path d="M78 99 q8 -9 16 0" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" /><Path d="M110 99 q8 -9 16 0" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
          </>}
          {m === "think" && <Path d="M110 76 q8 -6 16 -2" fill="none" stroke={WHITE} strokeWidth={3} strokeLinecap="round" />}
          <Circle cx={70} cy={110} r={5} fill="rgba(255,255,255,0.3)" /><Circle cx={134} cy={110} r={5} fill="rgba(255,255,255,0.3)" />
          <Path d={mouth} fill={mouthFill} stroke={WHITE} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          {tie && <Path d="M100 130 l6 6 l-6 22 l-6 -22 z" fill={WHITE} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />}

          <Circle cx={a.lh[0]} cy={a.lh[1]} r={8} fill={BLUE} stroke={INK} strokeWidth={sw} />
          <Circle cx={a.rh[0]} cy={a.rh[1]} r={8} fill={BLUE} stroke={INK} strokeWidth={sw} />

          {is("wave") && <>
            <Path d="M10 56 l-8 -6 M14 46 l-4 -9 M24 42 l1 -10" stroke={BLUE} strokeWidth={3.5} strokeLinecap="round" />
            <Rect x={158} y={140} width={40} height={34} rx={8} fill={WHITE} stroke={INK} strokeWidth={sw} />
            <Path d="M170 140 v-8 q0 -4 4 -4 h8 q4 0 4 4 v8" fill="none" stroke={INK} strokeWidth={3.5} />
            <Rect x={176} y={152} width={14} height={10} rx={2} fill={BLUE} transform="rotate(-12 183 157)" />
          </>}
          {is("suitcase") && <>
            <Rect x={2} y={140} width={40} height={34} rx={8} fill={WHITE} stroke={INK} strokeWidth={sw} />
            <Path d="M14 140 v-8 q0 -4 4 -4 h8 q4 0 4 4 v8" fill="none" stroke={INK} strokeWidth={3.5} />
            <Rect x={10} y={152} width={14} height={10} rx={2} fill={BLUE} transform="rotate(-12 17 157)" />
          </>}
          {is("book") && <>
            <Rect x={4} y={124} width={38} height={46} rx={6} fill={WHITE} stroke={INK} strokeWidth={sw} />
            <Path d="M12 136 h22 M12 146 h22 M12 156 h14" stroke={BLUE} strokeWidth={3} strokeLinecap="round" />
          </>}
          {is("flag") && <>
            <Rect x={162} y={28} width={38} height={50} rx={6} fill={WHITE} stroke={INK} strokeWidth={sw} />
            <Path d="M170 42 h22 M170 52 h22 M170 62 h14" stroke={BLUE} strokeWidth={3} strokeLinecap="round" />
          </>}
          {is("pin") && <>
            <Path d="M198 54 c0 -13 -8 -22 -18 -22 s-18 9 -18 22 c0 14 18 30 18 30 s18 -16 18 -30 z" fill={WHITE} stroke={INK} strokeWidth={sw} />
            <Circle cx={180} cy={53} r={7} fill={BLUE} />
          </>}
          {is("write") && <>
            <Rect x={2} y={138} width={54} height={40} rx={6} fill={WHITE} stroke={INK} strokeWidth={sw} transform="rotate(-8 29 158)" />
            <Path d="M12 150 h28 M12 160 h18" stroke={BLUE} strokeWidth={3} strokeLinecap="round" transform="rotate(-8 29 158)" />
            <Path d="M164 150 l-30 12" stroke={BLUE} strokeWidth={6} strokeLinecap="round" /><Path d="M164 150 l6 -2" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          </>}
          {is("phone") && <>
            <Rect x={166} y={32} width={30} height={50} rx={7} fill={INK} /><Rect x={170} y={38} width={22} height={36} rx={3} fill={WHITE} />
            <Path d="M174 48 h14 M174 56 h10" stroke={BLUE} strokeWidth={3} strokeLinecap="round" />
            <Path d="M152 28 q6 -8 14 -8 M152 18 q10 -12 22 -10" fill="none" stroke={BLUE} strokeWidth={3} strokeLinecap="round" />
          </>}
          {is("map") && <>
            <Path d="M158 134 l18 -6 l18 6 v36 l-18 -6 l-18 6 z" fill={WHITE} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <Path d="M176 128 v36" stroke={INK} strokeWidth={3} /><Path d="M164 158 q10 -16 24 -10" fill="none" stroke={BLUE} strokeWidth={3} strokeDasharray="3 3" /><Circle cx={188} cy={148} r={3.5} fill={BLUE} />
          </>}
          {(is("calendar") || is("calendar-check")) && <>
            <Rect x={154} y={28} width={46} height={46} rx={8} fill={WHITE} stroke={INK} strokeWidth={sw} /><Rect x={154} y={28} width={46} height={13} rx={6.5} fill={BLUE} />
            {is("calendar-check")
              ? <Path d="M166 58 l7 7 l14 -14" fill="none" stroke={GREEN} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              : <Path d="M164 52 h6 M176 52 h6 M188 52 h6 M164 63 h6 M176 63 h6" stroke={INK} strokeWidth={3} strokeLinecap="round" />}
          </>}
          {is("coin") && <>
            <Circle cx={180} cy={52} r={21} fill={WHITE} stroke={INK} strokeWidth={sw} /><Circle cx={180} cy={52} r={14} fill="none" stroke={BLUE} strokeWidth={3} />
            <SvgText x={180} y={58} textAnchor="middle" fontSize={15} fontWeight="700" fill={BLUE}>د.إ</SvgText>
          </>}
          {is("lock") && <>
            <Rect x={158} y={134} width={40} height={32} rx={7} fill={WHITE} stroke={INK} strokeWidth={sw} />
            <Path d="M166 134 v-8 a12 12 0 0 1 24 0 v8" fill="none" stroke={INK} strokeWidth={sw} /><Circle cx={178} cy={150} r={4.5} fill={BLUE} />
          </>}
          {is("stamps") && <>
            <Rect x={56} y={140} width={88} height={48} rx={6} fill={WHITE} stroke={INK} strokeWidth={sw} /><Path d="M100 140 v48" stroke={INK} strokeWidth={3} />
            <Circle cx={78} cy={162} r={11} fill="none" stroke={BLUE} strokeWidth={3} strokeDasharray="3 3" />
            <Rect x={110} y={152} width={24} height={18} rx={3} fill="none" stroke={BLUE} strokeWidth={3} transform="rotate(-10 122 161)" />
          </>}
          {is("heart") && <>
            <Path d="M180 58 c-8 -14 -26 -2 -14 12 l14 14 l14 -14 c12 -14 -6 -26 -14 -12 z" fill={WHITE} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <Path d="M174 64 l4 -4 l4 4" fill="none" stroke={BLUE} strokeWidth={3} strokeLinecap="round" />
          </>}
          {is("idcard") && <>
            <Rect x={54} y={140} width={92} height={48} rx={8} fill={WHITE} stroke={INK} strokeWidth={sw} /><Rect x={54} y={140} width={92} height={12} rx={6} fill={BLUE} />
            <Circle cx={72} cy={170} r={8} fill="none" stroke={INK} strokeWidth={3} /><Path d="M88 165 h40 M88 175 h28" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          </>}
          {is("shield") && <>
            <Path d="M180 28 l22 10 v16 c0 14 -10 24 -22 28 c-12 -4 -22 -14 -22 -28 v-16 z" fill={WHITE} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <Path d="M170 54 l7 7 l14 -14" fill="none" stroke={BLUE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </>}
          {is("magnify") && <>
            <Circle cx={172} cy={56} r={20} fill="rgba(140,162,255,0.25)" stroke={INK} strokeWidth={sw} /><Path d="M186 70 l12 12" stroke={INK} strokeWidth={7} strokeLinecap="round" /><Path d="M160 46 q6 -8 14 -6" fill="none" stroke={WHITE} strokeWidth={3} strokeLinecap="round" />
          </>}
          {is("briefcase") && <>
            <Rect x={158} y={138} width={42} height={32} rx={6} fill={INK} /><Path d="M171 138 v-6 q0 -3 3 -3 h10 q3 0 3 3 v6" fill="none" stroke={INK} strokeWidth={3.5} /><Rect x={158} y={150} width={42} height={3} fill={BLUE} />
          </>}
          {is("letter") && <>
            <Rect x={158} y={26} width={44} height={56} rx={5} fill={WHITE} stroke={INK} strokeWidth={sw} />
            <Path d="M166 40 h28 M166 50 h28 M166 60 h18" stroke={INK} strokeWidth={3} strokeLinecap="round" /><Circle cx={190} cy={68} r={7} fill="none" stroke={BLUE} strokeWidth={3} strokeDasharray="3 2" />
          </>}
          {(is("thumbs") || is("pilot")) && <Path d="M172 84 l10 -2 l6 -16 q6 -2 8 4 l-2 12 l10 0 q6 0 6 6 l-6 20 q-2 6 -8 6 l-22 0 z" fill={WHITE} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />}
        </Svg>
      </Animated.View>
    </View>
  );
}
