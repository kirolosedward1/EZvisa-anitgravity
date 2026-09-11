export interface TripInterval {
  id: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface CalculationResult {
  isValid: boolean
  totalDaysInWindow: number
  remainingDays: number
  isOverstay: boolean
  overstayDays: number
  maxAllowedDate?: string
  dailyBreakdown: {
    date: string
    isTripDay: boolean
    usedInWindow: number
    isOverstayDay: boolean
  }[]
  warnings: string[]
}

/**
 * Calculates Schengen stay compliance according to the 90/180 rule.
 */
export function calculateSchengenStay(
  pastTrips: TripInterval[],
  plannedTrip?: TripInterval
): CalculationResult {
  const warnings: string[] = []
  
  // Collect all trip days as unique timestamp keys (YYYY-MM-DD)
  const allTrips = [...pastTrips]
  if (plannedTrip && plannedTrip.startDate && plannedTrip.endDate) {
    allTrips.push(plannedTrip)
  }

  // Filter valid trips
  const validTrips = allTrips.filter(t => t.startDate && t.endDate && t.startDate <= t.endDate)

  if (validTrips.length === 0) {
    return {
      isValid: true,
      totalDaysInWindow: 0,
      remainingDays: 90,
      isOverstay: false,
      overstayDays: 0,
      dailyBreakdown: [],
      warnings: []
    }
  }

  // Expand all stay days
  const stayDaysSet = new Set<string>()
  for (const trip of validTrips) {
    const curr = new Date(trip.startDate + "T00:00:00Z")
    const end = new Date(trip.endDate + "T00:00:00Z")
    while (curr <= end) {
      stayDaysSet.add(curr.toISOString().split("T")[0])
      curr.setUTCDate(curr.getUTCDate() + 1)
    }
  }

  // If there's a planned trip, evaluate each day of the planned trip
  const evaluationTarget = plannedTrip && plannedTrip.startDate && plannedTrip.endDate 
    ? plannedTrip 
    : validTrips[validTrips.length - 1]

  const evalStart = new Date(evaluationTarget.startDate + "T00:00:00Z")
  const evalEnd = new Date(evaluationTarget.endDate + "T00:00:00Z")

  let maxDaysInWindow = 0
  let isOverstay = false
  let overstayCount = 0
  const dailyBreakdown: CalculationResult["dailyBreakdown"] = []

  const curr = new Date(evalStart)
  while (curr <= evalEnd) {
    const dateStr = curr.toISOString().split("T")[0]
    
    // 180-day window ending on dateStr: [dateStr - 179 days, dateStr]
    const windowStart = new Date(curr)
    windowStart.setUTCDate(windowStart.getUTCDate() - 179)
    
    let daysInWindow = 0
    const winCurr = new Date(windowStart)
    while (winCurr <= curr) {
      const winDateStr = winCurr.toISOString().split("T")[0]
      if (stayDaysSet.has(winDateStr)) {
        daysInWindow++
      }
      winCurr.setUTCDate(winCurr.getUTCDate() + 1)
    }

    if (daysInWindow > maxDaysInWindow) {
      maxDaysInWindow = daysInWindow
    }

    const dayOverstay = daysInWindow > 90
    if (dayOverstay) {
      isOverstay = true
      overstayCount++
    }

    dailyBreakdown.push({
      date: dateStr,
      isTripDay: true,
      usedInWindow: daysInWindow,
      isOverstayDay: dayOverstay
    })

    curr.setUTCDate(curr.getUTCDate() + 1)
  }

  const remaining = Math.max(0, 90 - maxDaysInWindow)

  if (isOverstay) {
    warnings.push(`You exceed the 90-day limit by ${overstayCount} day(s). Short-stay visas do not permit overstays.`)
  } else if (remaining <= 10) {
    warnings.push(`You have only ${remaining} days remaining in your 180-day rolling window. Plan buffer time.`)
  }

  return {
    isValid: !isOverstay,
    totalDaysInWindow: maxDaysInWindow,
    remainingDays: remaining,
    isOverstay,
    overstayDays: overstayCount,
    dailyBreakdown,
    warnings
  }
}
