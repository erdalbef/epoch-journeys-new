import type { FormState } from '@/features/quotes/types'
import type { NormalizedRow } from '@/lib/quotes/types'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formStateToNormalizedRows(form: FormState): NormalizedRow[] {
  const rows: NormalizedRow[] = []

  const totalPassengers = Math.max(form.group.totalPassengers || 0, 0)
  const nights = Math.max(form.group.nights || 0, 0)
  const safePassengerDivisor = Math.max(totalPassengers, 1)

  // Fixed: entrance fees
  if (form.fixedCosts.entranceFees) {
    rows.push({
      id: 'entrance-fees',
      sourceType: 'ENTRANCE',
      section: 'FIXED',
      bucket: 'UNIFORM_FIXED',
      totalCost: round2(form.fixedCosts.entranceFees),
      uniformPerPerson: round2(form.fixedCosts.entranceFees / safePassengerDivisor),
      perPersonByOccupancy: null,
      divisorUsed: safePassengerDivisor,
    })
  }

  // Fixed: lunch
  if (form.fixedCosts.lunchUnitCost && form.fixedCosts.lunchQty) {
    const uniformPerPerson = round2(
      form.fixedCosts.lunchUnitCost * form.fixedCosts.lunchQty
    )

    rows.push({
      id: 'lunch',
      sourceType: 'LUNCH',
      section: 'FIXED',
      bucket: 'UNIFORM_FIXED',
      totalCost: round2(uniformPerPerson * totalPassengers),
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: totalPassengers || null,
    })
  }

  // Fixed: dinner
  if (form.fixedCosts.dinnerUnitCost && form.fixedCosts.dinnerQty) {
    const uniformPerPerson = round2(
      form.fixedCosts.dinnerUnitCost * form.fixedCosts.dinnerQty
    )

    rows.push({
      id: 'dinner',
      sourceType: 'DINNER',
      section: 'FIXED',
      bucket: 'UNIFORM_FIXED',
      totalCost: round2(uniformPerPerson * totalPassengers),
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: totalPassengers || null,
    })
  }

  // Fixed: whisper
  if (form.fixedCosts.whisperUnitCost && form.fixedCosts.whisperDays) {
    const uniformPerPerson = round2(
      form.fixedCosts.whisperUnitCost * form.fixedCosts.whisperDays
    )

    rows.push({
      id: 'whisper',
      sourceType: 'WHISPER_SET',
      section: 'FIXED',
      bucket: 'UNIFORM_FIXED',
      totalCost: round2(uniformPerPerson * totalPassengers),
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: totalPassengers || null,
    })
  }

  // Fixed: city tax
  if (form.fixedCosts.cityTaxUnitCost && nights) {
    const uniformPerPerson = round2(form.fixedCosts.cityTaxUnitCost * nights)

    rows.push({
      id: 'city-tax',
      sourceType: 'CITY_TAX',
      section: 'FIXED',
      bucket: 'UNIFORM_FIXED',
      totalCost: round2(uniformPerPerson * totalPassengers),
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: totalPassengers || null,
    })
  }

  // Occupancy rows
  const accommodationTaxDoubleTwin =
    nights > 0 ? (form.fixedCosts.accommodationTaxPerRoomNight / 2) * nights : 0
  const accommodationTaxSingle =
    nights > 0 ? form.fixedCosts.accommodationTaxPerRoomNight * nights : 0
  const accommodationTaxTriple =
    nights > 0 ? (form.fixedCosts.accommodationTaxPerRoomNight / 3) * nights : 0

  const climateTaxDoubleTwin =
    nights > 0 ? (form.fixedCosts.climateTaxPerRoomNight / 2) * nights : 0
  const climateTaxSingle =
    nights > 0 ? form.fixedCosts.climateTaxPerRoomNight * nights : 0
  const climateTaxTriple =
    nights > 0 ? (form.fixedCosts.climateTaxPerRoomNight / 3) * nights : 0

  const hotelDoubleTwin = round2(
    form.fixedCosts.hotelDoubleTwinPerPerson +
      accommodationTaxDoubleTwin +
      climateTaxDoubleTwin
  )
  const hotelSingle = round2(
    form.fixedCosts.hotelSinglePerPerson +
      accommodationTaxSingle +
      climateTaxSingle
  )
  const hotelTriple = round2(
    form.fixedCosts.hotelTriplePerPerson +
      accommodationTaxTriple +
      climateTaxTriple
  )

  rows.push({
    id: 'hotel-occupancy',
    sourceType: 'HOTEL',
    section: 'FIXED',
    bucket: 'OCCUPANCY_FIXED',
    totalCost: null,
    uniformPerPerson: null,
    perPersonByOccupancy: {
      doubleTwin: hotelDoubleTwin,
      single: hotelSingle,
      triple: hotelTriple,
    },
    divisorUsed: null,
  })

  // Variable cost rows
  for (const item of form.variableCosts) {
    rows.push({
      id: item.id,
      sourceType: 'CUSTOM',
      section: 'VARIABLE',
      bucket: 'VARIABLE_SHARED',
      totalCost: round2(item.amount),
      uniformPerPerson: round2(item.amount / safePassengerDivisor),
      perPersonByOccupancy: null,
      divisorUsed: safePassengerDivisor,
    })
  }

  // Passenger flight
  if (form.flightCosts.passengerFlightPerPerson) {
    rows.push({
      id: 'passenger-flight',
      sourceType: 'PASSENGER_FLIGHT',
      section: 'FLIGHT',
      bucket: 'PASSENGER_FLIGHT',
      totalCost: round2(form.flightCosts.passengerFlightPerPerson * totalPassengers),
      uniformPerPerson: round2(form.flightCosts.passengerFlightPerPerson),
      perPersonByOccupancy: null,
      divisorUsed: totalPassengers || null,
    })
  }

  // Internal flights
  const internalFlightTotal =
    form.flightCosts.guideFlightTotal +
    form.flightCosts.tourManagerFlightTotal +
    form.flightCosts.staffFlightTotal

  if (internalFlightTotal) {
    rows.push({
      id: 'internal-flight',
      sourceType: 'STAFF_FLIGHT',
      section: 'FLIGHT',
      bucket: 'INTERNAL_FLIGHT',
      totalCost: round2(internalFlightTotal),
      uniformPerPerson: round2(internalFlightTotal / safePassengerDivisor),
      perPersonByOccupancy: null,
      divisorUsed: safePassengerDivisor,
    })
  }

  return rows
}