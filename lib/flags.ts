import { countrySlug } from "@/lib/shared/wizard-contract"

/**
 * Flag images available under public/flags/<slug>.png (the website's slug convention). Generated from the
 * 197373-country-flags pack for every country in the shared nationality and destination lists.
 * Use flagSrc(); components fall back to a neutral icon when a flag is missing instead of a broken image.
 */
export const FLAG_SLUGS = new Set([
  "afghanistan", "algeria", "angola", "armenia", "austria", "azerbaijan", "bahrain", "bangladesh", "belarus", "belgium", "belize", "benin", "bhutan", "bolivia", "botswana", "bulgaria", "burkina-faso", "burundi", "cabo-verde", "cambodia", "cameroon", "central-african-republic", "chad", "china", "comoros", "congo", "croatia", "cuba", "czech-republic", "côte-d'ivoire", "denmark", "djibouti", "dominican-republic", "dr-congo", "ecuador", "egypt", "equatorial-guinea", "eritrea", "estonia", "eswatini", "ethiopia", "european-union", "fiji", "finland", "france", "gabon", "gambia", "germany", "ghana", "greece", "guinea-bissau", "guinea", "guyana", "haiti", "hungary", "iceland", "india", "indonesia", "iran", "iraq", "italy", "jamaica", "jordan", "kazakhstan", "kenya", "kuwait", "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia", "libya", "liechtenstein", "lithuania", "luxembourg", "madagascar", "malawi", "maldives", "mali", "malta", "mauritania", "monaco", "mongolia", "morocco", "mozambique", "myanmar", "namibia", "nepal", "netherlands", "niger", "nigeria", "north-korea", "norway", "oman", "pakistan", "palestine", "papua-new-guinea", "philippines", "poland", "portugal", "qatar", "romania", "russia", "russian-federation", "rwanda", "sao-tome-and-principe", "saudi-arabia", "senegal", "sierra-leone", "slovakia", "slovenia", "somalia", "south-africa", "south-sudan", "spain", "sri-lanka", "sudan", "suriname", "sweden", "switzerland", "syria", "tajikistan", "tanzania", "thailand", "togo", "tunisia", "turkey", "turkmenistan", "uganda", "united-arab-emirates", "uzbekistan", "vanuatu", "vietnam", "yemen", "zambia", "zimbabwe",
])

/** URL of the flag image for a country name, or null when none is bundled. */
export function flagSrc(name?: string | null): string | null {
  if (!name) return null
  const slug = countrySlug(name)
  // ASCII alias avoids filesystem Unicode normalization differences for Côte d’Ivoire.
  if (slug === "côte-d'ivoire") return "/flags/ivory-coast.png"
  return FLAG_SLUGS.has(slug) ? `/flags/${encodeURIComponent(slug)}.png` : null
}
