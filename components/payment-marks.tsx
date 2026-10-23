/** Official-style payment marks. Each sits in the same 48×32 white chip. */
const marks = [
  {
    name: "Visa",
    svg: (
      <svg viewBox="0 0 48 16" aria-hidden className="h-4 w-full">
        <text x="24" y="13" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fontWeight="700" fontStyle="italic" fill="#1A1F71">
          VISA
        </text>
      </svg>
    ),
  },
  {
    name: "Mastercard",
    svg: (
      <svg viewBox="0 0 36 22" aria-hidden className="h-4 w-auto">
        <circle cx="13" cy="11" r="8" fill="#EB001B" />
        <circle cx="23" cy="11" r="8" fill="#F79E1B" />
        <path d="M18 5.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6z" fill="#FF5F00" />
      </svg>
    ),
  },
  {
    name: "American Express",
    svg: (
      <svg viewBox="0 0 48 16" aria-hidden className="h-4 w-full">
        <rect width="48" height="16" rx="2" fill="#2E77BC" />
        <text x="24" y="11.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="7" fontWeight="700" fill="#FFFFFF">
          AMEX
        </text>
      </svg>
    ),
  },
  {
    name: "Apple Pay",
    svg: (
      <svg viewBox="0 0 48 18" aria-hidden className="h-4 w-full">
        <text x="2" y="13" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="600" fill="#0A0F1F">
          Pay
        </text>
        <path fill="#0A0F1F" d="M8.2 4.6c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.8.7.1 1.3-.3 1.7-.8zM9.7 5.8c-.9 0-1.7.5-2.1.5s-1.1-.5-1.9-.5c-1 0-1.8.6-2.3 1.4-1 1.7-.3 4.2.7 5.6.5.7 1 1.4 1.8 1.4.7 0 1-.4 1.8-.4s1.1.4 1.9.4 1.2-.7 1.7-1.4c.5-.8.8-1.5.8-1.6 0 0-1.5-.6-1.5-2.3 0-1.4 1.2-2.1 1.2-2.2-.7-1-1.7-1.1-2.1-.9z" transform="translate(0,-1) scale(.72)" />
      </svg>
    ),
  },
  {
    name: "Google Pay",
    svg: (
      <svg viewBox="0 0 48 18" aria-hidden className="h-4 w-full">
        <text x="14" y="13" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="600" fill="#3C4043">
          Pay
        </text>
        <circle cx="6" cy="9" r="4.2" fill="none" stroke="#4285F4" strokeWidth="1.6" />
        <path d="M6 6.2v5.6" stroke="#34A853" strokeWidth="1.4" />
      </svg>
    ),
  },
]

export function PaymentMarks() {
  return (
    <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0">
      {marks.map((mark) => (
        <li key={mark.name}>
          <span
            title={mark.name}
            className="flex h-8 w-12 items-center justify-center overflow-hidden rounded-[6px] border border-[#E3E7EF] bg-[#FFFFFF] p-1.5"
          >
            <span className="flex h-full w-full items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:object-contain">
              {mark.svg}
            </span>
            <span className="sr-only">{mark.name}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
