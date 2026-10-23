/** Waiting mark for /payment-success. Same geometry as the mobile payment ring. */
const BOX = 90
const STROKE = 3
const RING_R = 41.5
const CIRC = 2 * Math.PI * RING_R
const ARC = CIRC * 0.25

export function PaymentWaitRing() {
  return (
    <svg
      width={BOX}
      height={BOX}
      viewBox={`0 0 ${BOX} ${BOX}`}
      className="payment-wait-ring"
      aria-hidden="true"
    >
      <circle cx={BOX / 2} cy={BOX / 2} r={RING_R} fill="none" stroke="#E3E7EF" strokeWidth={STROKE} />
      <circle
        cx={BOX / 2}
        cy={BOX / 2}
        r={RING_R}
        fill="none"
        stroke="#0436DC"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${ARC} ${CIRC}`}
        transform={`rotate(-90 ${BOX / 2} ${BOX / 2})`}
      />
    </svg>
  )
}

export function PaymentWaitBang() {
  return (
    <div className="relative flex h-[90px] w-[90px] items-center justify-center" aria-hidden="true">
      <svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`} className="absolute inset-0">
        <circle cx={BOX / 2} cy={BOX / 2} r={RING_R} fill="none" stroke="#E3E7EF" strokeWidth={STROKE} />
      </svg>
      <span className="payment-wait-bang inline-flex">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <path d="M14 4.5 V17.5" stroke="#B83200" strokeWidth="3" strokeLinecap="round" />
          <circle cx="14" cy="22.5" r="1.7" fill="#B83200" />
        </svg>
      </span>
    </div>
  )
}
