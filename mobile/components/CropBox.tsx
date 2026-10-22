import { useState } from "react";
import { View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import { useColors } from "../lib/theme";
import type { Rect } from "../lib/capture";

/** Default crop: the whole image minus a small margin (the user drags the corners onto the document edges). */
export const defaultCrop = (w: number, h: number): Rect => ({ originX: w * 0.04, originY: h * 0.04, width: w * 0.92, height: h * 0.92 });

type Corner = "tl" | "tr" | "bl" | "br" | "move";
const HANDLE = 44; // hit target
const ARM = 22;    // visible corner bracket length

/** Moves one corner (or the whole box) by dx/dy image pixels, keeping it inside the image and at least `min` big. Pure. */
export function dragRect(r: Rect, corner: Corner, dx: number, dy: number, imgW: number, imgH: number, min: number): Rect {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  if (corner === "move") return { ...r, originX: clamp(r.originX + dx, 0, imgW - r.width), originY: clamp(r.originY + dy, 0, imgH - r.height) };
  let x1 = r.originX, y1 = r.originY, x2 = r.originX + r.width, y2 = r.originY + r.height;
  if (corner === "tl" || corner === "bl") x1 = clamp(x1 + dx, 0, x2 - min); else x2 = clamp(x2 + dx, x1 + min, imgW);
  if (corner === "tl" || corner === "tr") y1 = clamp(y1 + dy, 0, y2 - min); else y2 = clamp(y2 + dy, y1 + min, imgH);
  return { originX: x1, originY: y1, width: x2 - x1, height: y2 - y1 };
}

/** Image with a draggable crop box. `rect` is in image pixels. Always laid out LTR so drag maths match the screen. */
export function CropBox({ uri, width, height, rect, onChange, label }: { uri: string; width: number; height: number; rect: Rect; onChange: (r: Rect) => void; label: string }) {
  const c = useColors();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<{ corner: Corner; rect: Rect; x: number; y: number } | null>(null);
  const s = box.w && box.h ? Math.min(box.w / width, box.h / height) : 0; // screen points per image pixel
  const ox = (box.w - width * s) / 2, oy = (box.h - height * s) / 2;
  const min = Math.min(width, height) * 0.15;
  /** Plain responder props: the gesture starts on grant (rect + finger position), each move is measured from there. */
  const handlers = (corner: Corner) => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => setDrag({ corner, rect, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }),
    onResponderMove: (e: GestureResponderEvent) => { if (drag?.corner === corner && s) onChange(dragRect(drag.rect, corner, (e.nativeEvent.pageX - drag.x) / s, (e.nativeEvent.pageY - drag.y) / s, width, height, min)); },
    onResponderRelease: () => setDrag(null),
    onResponderTerminate: () => setDrag(null),
  });

  const L = ox + rect.originX * s, T = oy + rect.originY * s, W = rect.width * s, H = rect.height * s;
  const shade = "rgba(0,0,0,0.55)";
  const bracket = (corner: "tl" | "tr" | "bl" | "br") => {
    const left = corner[1] === "l", top = corner[0] === "t";
    return (
      <View key={corner} {...handlers(corner)} accessible={false} testID={`crop-${corner}`}
        style={{ position: "absolute", width: HANDLE, height: HANDLE, left: (left ? L : L + W) - HANDLE / 2, top: (top ? T : T + H) - HANDLE / 2 }}>
        {/* The bracket's outer corner sits on the crop corner (the handle's centre). */}
        <View style={{ position: "absolute", width: ARM, height: ARM, left: left ? HANDLE / 2 - 2 : HANDLE / 2 - ARM + 2, top: top ? HANDLE / 2 - 2 : HANDLE / 2 - ARM + 2,
          borderColor: "#FFFFFF", borderLeftWidth: left ? 4 : 0, borderRightWidth: left ? 0 : 4, borderTopWidth: top ? 4 : 0, borderBottomWidth: top ? 0 : 4 }} />
      </View>
    );
  };

  return (
    <View onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ flex: 1, direction: "ltr", backgroundColor: c.card, overflow: "hidden" }}
      accessible accessibilityLabel={label} testID="crop-box">
      {s > 0 && <>
        <Image source={{ uri }} style={{ position: "absolute", left: ox, top: oy, width: width * s, height: height * s }} contentFit="fill" transition={150} />
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: T, backgroundColor: shade }} />
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: T + H, bottom: 0, backgroundColor: shade }} />
        <View pointerEvents="none" style={{ position: "absolute", left: 0, width: L, top: T, height: H, backgroundColor: shade }} />
        <View pointerEvents="none" style={{ position: "absolute", left: L + W, right: 0, top: T, height: H, backgroundColor: shade }} />
        <View {...handlers("move")} style={{ position: "absolute", left: L, top: T, width: W, height: H, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" }} testID="crop-move" />
        {(["tl", "tr", "bl", "br"] as const).map(bracket)}
      </>}
    </View>
  );
}
