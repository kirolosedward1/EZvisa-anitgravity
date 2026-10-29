// The 21 Globi poses (public/globi/video-manifest.json + video-manifest.additions.json; canvas "Globi character sheet").
// The order matches scripts/globi-convert.sh. Every pose has a clip and a still: there is no fallback pose.
export const GLOBI_POSES = [
  "welcome", "destination", "passport", "checklist", "calendar", "shield", "waiting", "celebrate", "companion", "documents", "travel",
  "thinking", "phone", "writing", "wallet", "lock", "plane", "hotel", "stamp", "puzzled", "magnify",
] as const;
export type GlobiPose = (typeof GLOBI_POSES)[number];

/** Canvas sizes (pt): beside a question bubble, in a Home hero card, in an info card, on result and welcome screens. */
export const GLOBI_SIZE = { question: 124, home: 96, info: 57, result: 165, welcome: 236 } as const;
