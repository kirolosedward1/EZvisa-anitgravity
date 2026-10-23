/** Arabic names for the 29 Schengen destinations, keyed by slug. */
export const DESTINATION_NAMES_AR: Record<string, string> = {
  austria: "النمسا",
  belgium: "بلجيكا",
  bulgaria: "بلغاريا",
  croatia: "كرواتيا",
  "czech-republic": "التشيك",
  denmark: "الدنمارك",
  estonia: "إستونيا",
  finland: "فنلندا",
  france: "فرنسا",
  germany: "ألمانيا",
  greece: "اليونان",
  hungary: "المجر",
  iceland: "آيسلندا",
  italy: "إيطاليا",
  latvia: "لاتفيا",
  liechtenstein: "ليختنشتاين",
  lithuania: "ليتوانيا",
  luxembourg: "لوكسمبورغ",
  malta: "مالطا",
  netherlands: "هولندا",
  norway: "النرويج",
  poland: "بولندا",
  portugal: "البرتغال",
  romania: "رومانيا",
  slovakia: "سلوفاكيا",
  slovenia: "سلوفينيا",
  spain: "إسبانيا",
  sweden: "السويد",
  switzerland: "سويسرا",
}

export function destinationNameAr(slug: string): string {
  return DESTINATION_NAMES_AR[slug] ?? ""
}
