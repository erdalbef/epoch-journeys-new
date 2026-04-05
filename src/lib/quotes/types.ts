export type PricingMode = 'LAND_ONLY' | 'LAND_AND_AIR' | 'BOTH';

export type FreeCalculationMethod =
  | 'SPREAD_ACROSS_PAYING_PASSENGERS'
  | 'ABSORBED_INTERNALLY';

export type QuoteCostSection =
  | 'FIXED'
  | 'VARIABLE'
  | 'FLIGHT'
  | 'TIPS'
  | 'CUSTOM';

export type QuoteLineType =
  | 'HOTEL'
  | 'ENTRANCE'
  | 'LUNCH'
  | 'DINNER'
  | 'WHISPER_SET'
  | 'CITY_TAX'
  | 'ACCOMMODATION_TAX'
  | 'CLIMATE_TAX'
  | 'CRUISE'
  | 'BOAT_TRIP'
  | 'BUS'
  | 'GUIDE'
  | 'GUIDE_ACCOMMODATION'
  | 'GUIDE_MEALS'
  | 'TOUR_MANAGER'
  | 'TOUR_MANAGER_ACCOMMODATION'
  | 'TOUR_MANAGER_MEALS'
  | 'DRIVER_ACCOMMODATION'
  | 'DRIVER_MEALS'
  | 'TOLL'
  | 'PARKING_FEES'
  | 'FERRY'
  | 'GROUP_TRANSFER'
  | 'UNEXPECTED_SERVICE'
  | 'PASSENGER_FLIGHT'
  | 'GUIDE_FLIGHT'
  | 'TOUR_MANAGER_FLIGHT'
  | 'STAFF_FLIGHT'
  | 'TIPS_GUIDE'
  | 'TIPS_DRIVER'
  | 'TIPS_TOUR_MANAGER'
  | 'TIPS_RESTAURANT'
  | 'TIPS_HOTEL'
  | 'TIPS_CHURCH'
  | 'TIPS_TRANSFERMAN'
  | 'CUSTOM';

export type QuoteLineCalculationMethod =
  | 'FLAT_TOTAL'
  | 'PER_PERSON'
  | 'PER_PERSON_X_QTY'
  | 'PER_PERSON_X_DAYS'
  | 'PER_PERSON_PER_NIGHT'
  | 'PER_ROOM_PER_NIGHT'
  | 'SHARED_TOTAL'
  | 'SHARED_DAILY'
  | 'PER_OCCUPANCY_DIRECT';

export type DivisorBasis =
  | 'PAYING_PASSENGERS'
  | 'TOTAL_PASSENGERS'
  | 'CUSTOM';

export type OccupancyValues = {
  doubleTwin: number | null;
  single: number | null;
  triple: number | null;
};

export type QuoteLineItemInput = {
  id: string;
  section: QuoteCostSection;
  type: QuoteLineType;
  title?: string | null;
  calculationMethod: QuoteLineCalculationMethod;

  unitCost?: number | null;
  totalCost?: number | null;

  quantity?: number | null;
  days?: number | null;
  nights?: number | null;

  divisorBasis?: DivisorBasis | null;
  customDivisor?: number | null;

  isPerPersonMode?: boolean | null; // useful for cruise/boat flexible mode
  isShared?: boolean | null;

  // direct occupancy costs when entered explicitly
  perPersonDoubleTwin?: number | null;
  perPersonSingle?: number | null;
  perPersonTriple?: number | null;

  // optional source metadata
  sourceTemplateId?: string | null;
};

export type QuoteInput = {
  totalPassengers?: number | null;
  payingPassengers?: number | null;
  freePassengers?: number | null;

  doubleTwinPassengers?: number | null;
  singlePassengers?: number | null;
  triplePassengers?: number | null;

  nights?: number | null;
  durationDays?: number | null;

  pricingMode?: PricingMode | null;

  freeEnabled?: boolean | null;
  freeCalculationMethod?: FreeCalculationMethod | null;

  agencyCommissionPercent?: number | null;
  epochMarkupPercent?: number | null;

  lineItems: QuoteLineItemInput[];
};

export type CalculationContext = {
  totalPassengers: number | null;
  payingPassengers: number | null;
  freePassengers: number | null;
  doubleTwinPassengers: number | null;
  singlePassengers: number | null;
  triplePassengers: number | null;
  nights: number | null;
  durationDays: number | null;
  pricingMode: PricingMode;
};

export type NormalizedRowBucket =
  | 'UNIFORM_FIXED'
  | 'OCCUPANCY_FIXED'
  | 'VARIABLE_SHARED'
  | 'INTERNAL_FLIGHT'
  | 'PASSENGER_FLIGHT'
  | 'TIP'
  | 'CUSTOM';

export type NormalizedRow = {
  id: string;
  sourceType: QuoteLineType;
  section: QuoteCostSection;
  bucket: NormalizedRowBucket;

  totalCost: number | null;
  uniformPerPerson: number | null;
  perPersonByOccupancy: OccupancyValues | null;
  divisorUsed: number | null;
};

export type TotalsResult = {
  totalFixedCost: number | null;
  totalVariableCost: number | null;
  totalFlightCost: number | null;
  totalTipsCost: number | null;
  totalCustomCost: number | null;
  totalTourCost: number | null;
};

export type PerPersonBucketsResult = {
  uniformPerPerson: number | null;
  occupancy: OccupancyValues;
  passengerFlightPerPerson: number | null;
};

export type FreeAdjustedResult = {
  doubleTwin: number | null;
  single: number | null;
  triple: number | null;
  freeCostImpact: number | null;
};

export type OccupancyPricingBreakdown = {
  net: number | null;
  commissionAmount: number | null;
  markupAmount: number | null;
  sellingPrice: number | null;
};

export type OccupancyPricingResult = {
  doubleTwin: OccupancyPricingBreakdown;
  single: OccupancyPricingBreakdown;
  triple: OccupancyPricingBreakdown;
};

export type QuoteCalculationResult = {
  totals: TotalsResult;
  baseCosts: {
    uniform: number | null;
    doubleTwin: number | null;
    single: number | null;
    triple: number | null;
  };
  freeAdjusted: FreeAdjustedResult;
  pricing: {
    landOnly: OccupancyPricingResult | null;
    landAndAir: OccupancyPricingResult | null;
  };
  normalizedRows: NormalizedRow[];
};