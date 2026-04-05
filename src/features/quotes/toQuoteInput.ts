import type { QuoteInput, QuoteLineItemInput } from '@/lib/quotes/types'
import type { FormState } from './types'

function isPositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && value > 0
}

function pushIfMeaningful(
  items: QuoteLineItemInput[],
  item: QuoteLineItemInput
) {
  const hasDirectOccupancy =
    isPositive(item.perPersonDoubleTwin) ||
    isPositive(item.perPersonSingle) ||
    isPositive(item.perPersonTriple)

  const hasNumericValue =
    isPositive(item.totalCost) ||
    isPositive(item.unitCost) ||
    isPositive(item.quantity) ||
    isPositive(item.days) ||
    isPositive(item.nights)

  if (hasDirectOccupancy || hasNumericValue) {
    items.push(item)
  }
}

export function toQuoteInput(form: FormState): QuoteInput {
  const items: QuoteLineItemInput[] = []

  // FIXED COSTS

  pushIfMeaningful(items, {
    id: 'entrance-fees',
    section: 'FIXED',
    type: 'ENTRANCE',
    title: 'Entrance Fees',
    calculationMethod: 'FLAT_TOTAL',
    totalCost: form.fixedCosts.entranceFees,
  })

  pushIfMeaningful(items, {
    id: 'lunch',
    section: 'FIXED',
    type: 'LUNCH',
    title: 'Lunch',
    calculationMethod: 'PER_PERSON_X_QTY',
    unitCost: form.fixedCosts.lunchUnitCost,
    quantity: form.fixedCosts.lunchQty,
  })

  pushIfMeaningful(items, {
    id: 'dinner',
    section: 'FIXED',
    type: 'DINNER',
    title: 'Dinner',
    calculationMethod: 'PER_PERSON_X_QTY',
    unitCost: form.fixedCosts.dinnerUnitCost,
    quantity: form.fixedCosts.dinnerQty,
  })

  pushIfMeaningful(items, {
    id: 'whisper',
    section: 'FIXED',
    type: 'WHISPER_SET',
    title: 'Whisper Set',
    calculationMethod: 'PER_PERSON_X_DAYS',
    unitCost: form.fixedCosts.whisperUnitCost,
    days: form.fixedCosts.whisperDays,
  })

  pushIfMeaningful(items, {
    id: 'city-tax',
    section: 'FIXED',
    type: 'CITY_TAX',
    title: 'City Tax',
    calculationMethod: 'PER_PERSON_PER_NIGHT',
    unitCost: form.fixedCosts.cityTaxUnitCost,
    nights: form.group.nights,
  })

  pushIfMeaningful(items, {
    id: 'hotel',
    section: 'FIXED',
    type: 'HOTEL',
    title: 'Hotel',
    calculationMethod: 'PER_OCCUPANCY_DIRECT',
    perPersonDoubleTwin: form.fixedCosts.hotelDoubleTwinPerPerson,
    perPersonSingle: form.fixedCosts.hotelSinglePerPerson,
    perPersonTriple: form.fixedCosts.hotelTriplePerPerson,
  })

  const accommodationTaxDoubleTwin =
    form.group.nights > 0
      ? (form.fixedCosts.accommodationTaxPerRoomNight / 2) * form.group.nights
      : 0

  const accommodationTaxSingle =
    form.group.nights > 0
      ? form.fixedCosts.accommodationTaxPerRoomNight * form.group.nights
      : 0

  const accommodationTaxTriple =
    form.group.nights > 0
      ? (form.fixedCosts.accommodationTaxPerRoomNight / 3) * form.group.nights
      : 0

  pushIfMeaningful(items, {
    id: 'accommodation-tax',
    section: 'FIXED',
    type: 'ACCOMMODATION_TAX',
    title: 'Accommodation Tax',
    calculationMethod: 'PER_OCCUPANCY_DIRECT',
    perPersonDoubleTwin: accommodationTaxDoubleTwin,
    perPersonSingle: accommodationTaxSingle,
    perPersonTriple: accommodationTaxTriple,
  })

  const climateTaxDoubleTwin =
    form.group.nights > 0
      ? (form.fixedCosts.climateTaxPerRoomNight / 2) * form.group.nights
      : 0

  const climateTaxSingle =
    form.group.nights > 0
      ? form.fixedCosts.climateTaxPerRoomNight * form.group.nights
      : 0

  const climateTaxTriple =
    form.group.nights > 0
      ? (form.fixedCosts.climateTaxPerRoomNight / 3) * form.group.nights
      : 0

  pushIfMeaningful(items, {
    id: 'climate-tax',
    section: 'FIXED',
    type: 'CLIMATE_TAX',
    title: 'Climate Tax',
    calculationMethod: 'PER_OCCUPANCY_DIRECT',
    perPersonDoubleTwin: climateTaxDoubleTwin,
    perPersonSingle: climateTaxSingle,
    perPersonTriple: climateTaxTriple,
  })

  // VARIABLE COSTS
  // Use supported VARIABLE section + supported type.
  // GUIDE is a safe default classification for generic shared service rows.
  // Later, if you add row categories in the UI, map them to BUS/TOLL/FERRY/etc.

  for (const row of form.variableCosts) {
    pushIfMeaningful(items, {
      id: row.id,
      section: 'VARIABLE',
      type: 'GUIDE',
      title: row.label,
      calculationMethod: 'SHARED_TOTAL',
      totalCost: row.amount,
      divisorBasis: 'TOTAL_PASSENGERS',
    })
  }

  // FLIGHT COSTS

  pushIfMeaningful(items, {
    id: 'passenger-flight',
    section: 'FLIGHT',
    type: 'PASSENGER_FLIGHT',
    title: 'Passenger Flight',
    calculationMethod: 'PER_PERSON',
    unitCost: form.flightCosts.passengerFlightPerPerson,
  })

  pushIfMeaningful(items, {
    id: 'guide-flight',
    section: 'FLIGHT',
    type: 'GUIDE_FLIGHT',
    title: 'Guide Flight',
    calculationMethod: 'SHARED_TOTAL',
    totalCost: form.flightCosts.guideFlightTotal,
    divisorBasis: 'TOTAL_PASSENGERS',
  })

  pushIfMeaningful(items, {
    id: 'tour-manager-flight',
    section: 'FLIGHT',
    type: 'TOUR_MANAGER_FLIGHT',
    title: 'Tour Manager Flight',
    calculationMethod: 'SHARED_TOTAL',
    totalCost: form.flightCosts.tourManagerFlightTotal,
    divisorBasis: 'TOTAL_PASSENGERS',
  })

  pushIfMeaningful(items, {
    id: 'staff-flight',
    section: 'FLIGHT',
    type: 'STAFF_FLIGHT',
    title: 'Staff Flight',
    calculationMethod: 'SHARED_TOTAL',
    totalCost: form.flightCosts.staffFlightTotal,
    divisorBasis: 'TOTAL_PASSENGERS',
  })

  return {
    totalPassengers: form.group.totalPassengers,
    payingPassengers: form.group.payingPassengers,
    freePassengers: form.group.freePassengers,
    doubleTwinPassengers: form.group.doubleTwinPassengers,
    singlePassengers: form.group.singlePassengers,
    triplePassengers: form.group.triplePassengers,
    nights: form.group.nights,
    durationDays: form.group.durationDays,
    pricingMode: form.group.pricingMode,
    freeEnabled: form.freePolicy.enabled,
    freeCalculationMethod: form.freePolicy.method,
    agencyCommissionPercent: form.pricing.agencyCommissionPercent,
    epochMarkupPercent: form.pricing.epochMarkupPercent,
    lineItems: items,
  }
}