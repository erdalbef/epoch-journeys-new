import type { FormState } from '@/features/quotes/types'
import type { NormalizedRow } from '@/lib/quotes/types'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formStateToNormalizedRows(form: FormState): NormalizedRow[] {
  const rows: NormalizedRow[] = []

  const totalPassengers = Math.max(form.group.totalPassengers || 0, 0)
  const nights = Math.max(form.group.nights || 0, 0)

  // Fixed: entrance fees
  if (form.fixedCosts.entranceFees) {
    rows.push({
      code: 'entrance-fees',
      title: 'Entrance Fees',
      bucket: 'UNIFORM_FIXED',
      uniformPerPerson: round2(form.fixedCosts.entranceFees / Math.max(totalPassengers || 1, 1)),
    })
  }

  // Fixed: lunch
  if (form.fixedCosts.lunchUnitCost && form.fixedCosts.lunchQty) {
    rows.push({
      code: 'lunch',
      title: 'Lunch',
      bucket: 'UNIFORM_FIXED',
      uniformPerPerson: round2(form.fixedCosts.lunchUnitCost * form.fixedCosts.lunchQty),
    })
  }

  // Fixed: dinner
  if (form.fixedCosts.dinnerUnitCost && form.fixedCosts.dinnerQty) {
    rows.push({
      code: 'dinner',
      title: 'Dinner',
      bucket: 'UNIFORM_FIXED',
      uniformPerPerson: round2(form.fixedCosts.dinnerUnitCost * form.fixedCosts.dinnerQty),
    })
  }

  // Fixed: whisper
  if (form.fixedCosts.whisperUnitCost && form.fixedCosts.whisperDays) {
    rows.push({
      code: 'whisper',
      title: 'Whisper',
      bucket: 'UNIFORM_FIXED',
      uniformPerPerson: round2(form.fixedCosts.whisperUnitCost * form.fixedCosts.whisperDays),
    })
  }

  // Fixed: city tax
  if (form.fixedCosts.cityTaxUnitCost && nights) {
    rows.push({
      code: 'city-tax',
      title: 'City Tax',
      bucket: 'UNIFORM_FIXED',
      uniformPerPerson: round2(form.fixedCosts.cityTaxUnitCost * nights),
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

  rows.push({
    code: 'hotel-occupancy',
    title: 'Hotel Occupancy',
    bucket: 'OCCUPANCY_FIXED',
    perPersonByOccupancy: {
      doubleTwin: round2(
        form.fixedCosts.hotelDoubleTwinPerPerson +
          accommodationTaxDoubleTwin +
          climateTaxDoubleTwin
      ),
      single: round2(
        form.fixedCosts.hotelSinglePerPerson +
          accommodationTaxSingle +
          climateTaxSingle
      ),
      triple: round2(
        form.fixedCosts.hotelTriplePerPerson +
          accommodationTaxTriple +
          climateTaxTriple
      ),
    },
  })

  // Variable cost rows
  for (const item of form.variableCosts) {
    rows.push({
      code: item.id,
      title: item.label,
      bucket: 'VARIABLE_SHARED',
      uniformPerPerson: round2(item.amount / Math.max(totalPassengers || 1, 1)),
    })
  }

  // Passenger flight
  if (form.flightCosts.passengerFlightPerPerson) {
    rows.push({
      code: 'passenger-flight',
      title: 'Passenger Flight',
      bucket: 'PASSENGER_FLIGHT',
      uniformPerPerson: round2(form.flightCosts.passengerFlightPerPerson),
    })
  }

  // Internal flights
  const internalFlightTotal =
    form.flightCosts.guideFlightTotal +
    form.flightCosts.tourManagerFlightTotal +
    form.flightCosts.staffFlightTotal

  if (internalFlightTotal) {
    rows.push({
      code: 'internal-flight',
      title: 'Internal Flights',
      bucket: 'INTERNAL_FLIGHT',
      uniformPerPerson: round2(internalFlightTotal / Math.max(totalPassengers || 1, 1)),
    })
  }

  return rows
}