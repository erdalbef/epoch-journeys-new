import type { FormState } from './types'

export const initialFormState: FormState = {
  group: {
    totalPassengers: 20,
    payingPassengers: 19,
    freePassengers: 1,
    doubleTwinPassengers: 14,
    singlePassengers: 2,
    triplePassengers: 4,
    nights: 8,
    durationDays: 9,
    pricingMode: 'BOTH',
  },

  fixedCosts: {
    entranceFees: 0,
    lunchUnitCost: 20,
    lunchQty: 4,
    dinnerUnitCost: 25,
    dinnerQty: 3,
    whisperUnitCost: 3,
    whisperDays: 8,
    cityTaxUnitCost: 0,
    hotelDoubleTwinPerPerson: 500,
    hotelSinglePerPerson: 700,
    hotelTriplePerPerson: 450,
    accommodationTaxPerRoomNight: 10,
    climateTaxPerRoomNight: 0,
  },

  variableCosts: [
    { id: 'bus', label: 'Bus Total', amount: 2000 },
    { id: 'guide-service', label: 'Guide Service', amount: 600 },
    { id: 'guide-accommodation', label: 'Guide Accommodation', amount: 300 },
    { id: 'guide-meals', label: 'Guide Meals', amount: 150 },
    { id: 'tm-service', label: 'Tour Manager Service', amount: 700 },
    { id: 'tm-accommodation', label: 'TM Accommodation', amount: 320 },
    { id: 'tm-meals', label: 'TM Meals', amount: 160 },
    { id: 'driver-accommodation', label: 'Driver Accommodation', amount: 250 },
    { id: 'driver-meals', label: 'Driver Meals', amount: 120 },
    { id: 'toll', label: 'Toll', amount: 250 },
    { id: 'parking', label: 'Parking Fees', amount: 100 },
    { id: 'ferry', label: 'Ferry', amount: 0 },
    { id: 'group-transfer', label: 'Group Transfer', amount: 0 },
    { id: 'cruise', label: 'Cruise', amount: 0 },
    { id: 'boat-trip', label: 'Boat Trip', amount: 0 },
    { id: 'unexpected', label: 'Unexpected Services', amount: 0 },
  ],

  flightCosts: {
    passengerFlightPerPerson: 200,
    guideFlightTotal: 0,
    tourManagerFlightTotal: 0,
    staffFlightTotal: 0,
  },

  freePolicy: {
    enabled: true,
    method: 'SPREAD_ACROSS_PAYING_PASSENGERS',
  },

  pricing: {
    agencyCommissionPercent: 10,
    epochMarkupPercent: 20,
  },
}