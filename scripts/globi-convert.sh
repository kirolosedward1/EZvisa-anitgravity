#!/usr/bin/env bash
# Converts the transparent Globi clips (public/globi/<pose>.webm, VP9 with alpha) into the app's assets:
#   mobile/assets/globi/<pose>.mov   HEVC with alpha, 480x480, looping clip for expo-video on iOS
#   mobile/assets/globi/<pose>.webp  transparent first frame, 480x480: the poster, and the only image with Reduce Motion
#   mobile/assets/globi/anim/<pose>.webp  transparent animated WebP, 320x320 at 12 fps, looping: what the app plays
#     (expo-image animates WebP on iOS, Android and web, so it ships in an over-the-air update and builds on any OS)
#
# iOS cannot play transparent WebM. HEVC with alpha is the format AVPlayer composites with transparency, and only
# Apple's VideoToolbox encoder writes it, so the .mov step runs on macOS (ffmpeg from Homebrew: `brew install ffmpeg`).
# The stills need only libvpx-vp9 (to decode the alpha plane) and libwebp, so they also build on Linux.
#
# Usage (from the repository root):
#   scripts/globi-convert.sh                 # stills + clips (macOS)
#   scripts/globi-convert.sh --stills-only   # stills + animated WebP (any OS), no .mov
#   scripts/globi-convert.sh --check         # list poses and what is missing, write nothing
# Options: --src <dir> (default public/globi), --out <dir> (default mobile/assets/globi), --size <px> (default 480).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/globi"
OUT="$ROOT/mobile/assets/globi"
SIZE=480
ANIM_SIZE=320; ANIM_FPS=12; ANIM_Q=65
MODE=all
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stills-only) MODE=stills ;;
    --check) MODE=check ;;
    --src) SRC="$2"; shift ;;
    --out) OUT="$2"; shift ;;
    --size) SIZE="$2"; shift ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

# The 21 poses, in the order of mobile/components/globi/poses.ts. Batch 1 is listed in video-manifest.json,
# batch 2 in video-manifest.additions.json; the list is fixed here so a missing clip is an error, never a silent skip.
POSES=(welcome destination passport checklist calendar shield waiting celebrate companion documents travel
       thinking phone writing wallet lock plane hotel stamp puzzled magnify)

# --size goes into an ffmpeg filtergraph: accept a plain integer in a sane range only.
[[ "$SIZE" =~ ^[0-9]+$ ]] && (( SIZE >= 64 && SIZE <= 2048 )) || { echo "--size must be a whole number of pixels between 64 and 2048." >&2; exit 2; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is not installed." >&2; exit 1; }
missing=0
for p in "${POSES[@]}"; do [[ -f "$SRC/$p.webm" ]] || { echo "missing source: $SRC/$p.webm" >&2; missing=1; }; done
[[ $missing -eq 0 ]] || exit 1

if [[ $MODE == check ]]; then
  for p in "${POSES[@]}"; do
    printf '%-12s webp:%s mov:%s\n' "$p" "$([[ -f $OUT/$p.webp ]] && echo yes || echo no)" "$([[ -f $OUT/$p.mov ]] && echo yes || echo no)"
  done
  exit 0
fi

DECODERS="$(ffmpeg -hide_banner -decoders 2>/dev/null)"; ENCODERS="$(ffmpeg -hide_banner -encoders 2>/dev/null)"
grep -q libvpx-vp9 <<<"$DECODERS" || { echo "ffmpeg lacks libvpx-vp9; it is needed to read the alpha channel." >&2; exit 1; }
grep -q libwebp_anim <<<"$ENCODERS" || { echo "ffmpeg lacks libwebp_anim; it is needed for the animated WebP." >&2; exit 1; }
if [[ $MODE == all ]] && ! grep -q hevc_videotoolbox <<<"$ENCODERS"; then
  echo "ffmpeg has no hevc_videotoolbox encoder. HEVC with alpha needs macOS; run with --stills-only elsewhere." >&2
  exit 1
fi

mkdir -p "$OUT/anim"
SCALE="scale=${SIZE}:${SIZE}:flags=lanczos"
# The background removal left a near-zero matte (alpha 1/255) over the whole frame, which tints the canvas by one level
# in a visible square. Clamp alpha below 8 to fully transparent, keep everything else.
CLEAN="format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(alpha(X,Y),8),0,alpha(X,Y))'"
for p in "${POSES[@]}"; do
  in="$SRC/$p.webm"
  # The native vp9 decoder drops the alpha plane; libvpx-vp9 keeps it (yuva420p).
  ffmpeg -hide_banner -loglevel error -y -c:v libvpx-vp9 -i "$in" -frames:v 1 \
    -vf "$SCALE,$CLEAN,format=yuva420p" -c:v libwebp -quality 88 -compression_level 6 "$OUT/$p.webp"
  # The animation the app plays: every frame cleaned the same way, lossy WebP with alpha, looping forever.
  ffmpeg -hide_banner -loglevel error -y -c:v libvpx-vp9 -i "$in" -an \
    -vf "fps=${ANIM_FPS},scale=${ANIM_SIZE}:${ANIM_SIZE}:flags=lanczos,$CLEAN" -c:v libwebp_anim -lossless 0 -q:v $ANIM_Q \
    -compression_level 6 -loop 0 "$OUT/anim/$p.webp"
  if [[ $MODE == all ]]; then
    # bgra in, alpha_quality for the alpha layer, hvc1 tag so AVFoundation recognises HEVC in a .mov.
    ffmpeg -hide_banner -loglevel error -y -c:v libvpx-vp9 -i "$in" -an \
      -vf "$SCALE,$CLEAN,format=bgra" -c:v hevc_videotoolbox -alpha_quality 0.9 -b:v 900k -tag:v hvc1 \
      -movflags +faststart "$OUT/$p.mov"
  fi
  echo "ok  $p"
done
# The asset index the app imports (mobile/components/globi/GlobiPose.tsx). Stills: every pose (the type check fails if
# one is missing). Clips: only the .mov files that exist, so a Linux run (stills only) still bundles.
INDEX="$OUT/index.ts"
{
  echo "// Generated by scripts/globi-convert.sh. Do not edit by hand: re-run the script after changing public/globi."
  echo "import type { GlobiPose } from \"../../components/globi/poses\";"
  echo ""
  echo "export const GLOBI_STILLS: Record<GlobiPose, number> = {"
  for p in "${POSES[@]}"; do echo "  $p: require(\"./$p.webp\"),"; done
  echo "};"
  echo ""
  echo "/** Transparent animated WebP, one per pose (played with expo-image). */"
  echo "export const GLOBI_ANIMS: Record<GlobiPose, number> = {"
  for p in "${POSES[@]}"; do echo "  $p: require(\"./anim/$p.webp\"),"; done
  echo "};"
  echo ""
  echo "/** HEVC-with-alpha clips (iOS). Empty until the script has run on macOS. */"
  echo "export const GLOBI_CLIPS: Partial<Record<GlobiPose, number>> = {"
  for p in "${POSES[@]}"; do [[ -f "$OUT/$p.mov" ]] && echo "  $p: require(\"./$p.mov\"),"; done
  echo "};"
} > "$INDEX"
echo "Wrote ${#POSES[@]} poses and $INDEX to $OUT"
