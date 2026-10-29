import Image from "next/image"

const photos = {
  departure: {
    src: "/images/travel/airport-departure.webp",
    alt: "A traveller checking her passport beside the airport departure board",
    altAr: "مسافرة تتفقد جواز سفرها بجانب لوحة المغادرة في المطار",
    author: "prostooleh",
    source: "https://www.magnific.com/free-photo/beautiful-girl-standing-airport_4975626.htm",
    position: "50% 32%",
  },
  planning: {
    src: "/images/travel/planning-together.webp",
    alt: "A couple planning their trip together on a laptop",
    altAr: "زوجان يخططان لرحلتهما معًا على حاسوب محمول",
    author: "DC Studio",
    source: "https://www.magnific.com/free-photo/happy-couple-making-reservations-family-vacation-laptop_416761131.htm",
    position: "50% 45%",
  },
  connected: {
    src: "/images/travel/traveller-on-phone.webp",
    alt: "A traveller checking her phone with her suitcase beside her at the airport",
    altAr: "مسافرة تتفقد هاتفها وبجانبها حقيبتها في المطار",
    author: "wavebreakmedia_micro",
    source: "https://www.magnific.com/free-photo/woman-using-mobile-phone-waiting-area_10748111.htm",
    position: "50% 60%",
  },
}

/** Supporting travel photography; portraits remain separate from real team/customer claims. */
export function TravelPhoto({ photo, arabic = false, className = "" }: {
  photo: keyof typeof photos
  arabic?: boolean
  className?: string
}) {
  const image = photos[photo]
  return (
    <figure className={`ez-travel-photo ${className}`}>
      <div className="ez-travel-photo-frame">
        <Image src={image.src} alt={arabic ? image.altAr : image.alt} fill
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 80vw, 480px"
          style={{ objectFit: "cover", objectPosition: image.position }} />
      </div>
      {photo !== "departure" && (<figcaption><a href={image.source} target="_blank" rel="noopener noreferrer">{arabic ? "تصوير:" : "Photo:"} {image.author} / Freepik</a></figcaption>)}
    </figure>
  )
}
