import type { FreeMethod } from '@/components/shared/form/sections/FreePolicySection'
import type { GroupFormValues } from '@/components/shared/form/sections/GroupSetupSection'
import type { VariableCostItem } from '@/components/shared/form/sections/VariableCostsSection'

export type { GroupFormValues, VariableCostItem, FreeMethod }

export type FixedCostsValues = {
  entranceFees: number
  lunchUnitCost: number
  lunchQty: number
  dinnerUnitCost: number
  dinnerQty: number
  whisperUnitCost: number
  whisperDays: number
  cityTaxUnitCost: number
  hotelDoubleTwinPerPerson: number
  hotelSinglePerPerson: number
  hotelTriplePerPerson: number
  accommodationTaxPerRoomNight: number
  climateTaxPerRoomNight: number
}

export type FlightCostsValues = {
  passengerFlightPerPerson: number
  guideFlightTotal: number
  tourManagerFlightTotal: number
  staffFlightTotal: number
}

export type PricingValues = {
  agencyCommissionPercent: number
  epochMarkupPercent: number
}

export type FormState = {
  group: GroupFormValues
  fixedCosts: FixedCostsValues
  variableCosts: VariableCostItem[]
  flightCosts: FlightCostsValues
  freePolicy: {
    enabled: boolean
    method: FreeMethod
  }
  pricing: PricingValues
}