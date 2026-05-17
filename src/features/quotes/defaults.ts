import type { FormState } from './types'

export const initialFormState: FormState = {
  group: {
    groupSize: 20,
    payingPax: 20,
    singleCount: 2,
    doubleCount: 8,
    tripleCount: 0,
    pricingMode: 'LAND_ONLY',
  },

  fixedCosts: [],
  variableCosts: [],
  flightCosts: [],

  freePolicy: {
    enabled: false,
    freePer: 20,
    method: 'SPREAD_ACROSS_PAYING_PASSENGERS',
  },

  pricing: {
    markupPercent: 15,
    commissionPercent: 10,
    rounding: 'NEAREST_5',
  },

  // ✅ ADD THIS BLOCK
  details: {
    quoteTitle: '',
    agentName: '',
    clientName: '',
    destination: '',
    travelDates: '',
    validUntil: '',
    notes: '',
  },
}