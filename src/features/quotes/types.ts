// ================================
// CORE ENUM-LIKE TYPES
// ================================

export type PricingMode = 'LAND_ONLY' | 'LAND_AND_AIR' | 'BOTH'

export type FreeCalculationMethod =
  | 'SPREAD_ACROSS_PAYING_PASSENGERS'
  | 'ABSORBED_INTERNALLY'

export type QuoteCostSection =
  | 'FIXED'
  | 'VARIABLE'
  | 'FLIGHT'
  | 'CUSTOM'

export type QuoteLineType =
  | 'HOTEL'
  | 'ENTRANCE'
  | 'LUNCH'
  | 'DINNER'
  | 'WHISPER_SET'
  | 'CITY_TAX'
  | 'ACCOMMODATION_TAX'
  | 'GUIDE'
  | 'TRANSPORT'
  | 'FLIGHT'
  | 'CUSTOM'

// ================================
// GROUP SETUP
// ================================

export type GroupSetup = {
  groupSize: number
  payingPax: number
  singleCount: number
  doubleCount: number
  tripleCount: number
  pricingMode: PricingMode
}

// ================================
// FIXED COSTS
// ================================

export type FixedCostItem = {
  id: string
  type: QuoteLineType
  description?: string
  totalCost: number
  perPersonByOccupancy?: {
    single?: number | null
    doubleTwin?: number | null
    triple?: number | null
  }
}

// ================================
// VARIABLE COSTS
// ================================

export type VariableCostItem = {
  id: string
  type: QuoteLineType
  description?: string
  costPerPerson: number
  appliesTo: 'ALL' | 'PAYING_ONLY'
}

// ================================
// FLIGHT COSTS
// ================================

export type FlightCostItem = {
  id: string
  description?: string
  costPerPerson: number
}

// ================================
// FREE POLICY
// ================================

export type FreePolicy = {
  enabled: boolean
  freePer: number
  method: FreeCalculationMethod
}

// ================================
// PRICING
// ================================

export type PricingSettings = {
  markupPercent: number
  commissionPercent: number
  rounding: 'NONE' | 'NEAREST_1' | 'NEAREST_5' | 'NEAREST_10'
}

// ================================
// QUOTE DETAILS
// ================================

export type QuoteDetails = {
  quoteTitle: string
  agentName: string
  clientName: string
  destination: string
  travelDates: string
  validUntil: string
  notes: string
}

// ================================
// MAIN FORM STATE
// ================================

export type FormState = {
  group: GroupSetup

  fixedCosts: FixedCostItem[]
  variableCosts: VariableCostItem[]
  flightCosts: FlightCostItem[]

  freePolicy: FreePolicy
  pricing: PricingSettings
  details: QuoteDetails
}

// ================================
// NORMALIZED INPUT FOR CALCULATION
// ================================

export type QuoteInput = {
  group: GroupSetup

  fixedCosts: FixedCostItem[]
  variableCosts: VariableCostItem[]
  flightCosts: FlightCostItem[]

  freePolicy: FreePolicy
  pricing: PricingSettings
}

// ================================
// CALCULATION OUTPUT
// ================================

export type QuoteSummary = {
  totals: {
    totalFixedCost: number
    totalVariableCost: number
    totalFlightCost: number
    totalTourCost: number
  }

  baseCosts: {
    single: number
    doubleTwin: number
    triple: number
  }

  freeAdjusted: {
    single: number
    doubleTwin: number
    triple: number
  }

  pricing: {
    landOnly?: {
      single: { sellingPrice: number }
      doubleTwin: { sellingPrice: number }
      triple: { sellingPrice: number }
    }

    landAndAir?: {
      single: { sellingPrice: number }
      doubleTwin: { sellingPrice: number }
      triple: { sellingPrice: number }
    }
  }
}