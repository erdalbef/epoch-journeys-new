export type SupplierHotelResult = {
  supplier: {
    id: string;
    name: string;
    code: string | null;
    preferred: boolean;
    rating: number | null;
    country: string | null;
    city: string | null;
    defaultCurrency: string;
  };

  service: {
    id: string;
    name: string;
    description: string | null;
    country: string | null;
    city: string | null;
    notes: string | null;
  };

  rate: {
    id: string;
    name: string;
    description: string | null;
    validFrom: string;
    validTo: string;
    currency: string;
    amount: number;
    unit: string;
    roomType: string | null;
    mealBasis: string | null;
    minPax: number | null;
    maxPax: number | null;
    breakfastIncluded: boolean | null;
    dinnerIncluded: boolean | null;
    dinnerAmount: number | null;
    dinnerUnit: string | null;
    dinnerNotes: string | null;
    cityTaxIncluded: boolean;
    cityTaxAmount: number | null;
    cityTaxCurrency: string | null;
    cityTaxUnit: string | null;
    porterageAvailable: boolean | null;
    porterageIncluded: boolean | null;
    porterageAmount: number | null;
    porterageUnit: string | null;
    beveragePackageIncluded: boolean | null;
    beveragePackageDescription: string | null;
    beveragePackageAmount: number | null;
    beveragePackageUnit: string | null;
    beverageNotes: string | null;
    freePlaces: string | null;
    freePlaceRatio: number | null;
    freePlaceMax: number | null;
    freePlaceNotes: string | null;
    minimumRooms: number | null;
    minimumNights: number | null;
    rateRestrictions: string | null;
    singleSupplement: number | null;
    tripleReduction: number | null;
    cancellationTerms: string | null;
    paymentTerms: string | null;
    supplierReference: string | null;
    lastVerifiedAt: string | null;
    staySpecific?: boolean;
    notes: string | null;
  };

  rateValidity:
    | "VALID_FOR_REQUEST"
    | "EXPIRED_ESTIMATE";
  requiresReconfirmation: boolean;
  cityTaxNeedsReview?: boolean;

  effectiveCost: {
    singlePerPersonPerNight: number | null;
    doubleTwinPerPersonPerNight: number | null;
    triplePerPersonPerNight: number | null;
    singleStatus: string;
    doubleTwinStatus: string;
    tripleStatus: string;
    currency: string;
  };
};

export function supplierHotelSnapshot({supplier, service, rate, effectiveCost, rateValidity, requiresReconfirmation}: SupplierHotelResult, destination: string) {
  const single = effectiveCost.singlePerPersonPerNight ?? 0;
  const doubleTwin = effectiveCost.doubleTwinPerPersonPerNight ?? 0;
  const triple = effectiveCost.triplePerPersonPerNight ?? 0;
  return {
    hotelName: supplier.name,
    destination: service.city || supplier.city || destination,
    singlePerPerson: single,
    doubleTwinPerPerson: doubleTwin,
    triplePerPerson: triple,
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierPreferred: supplier.preferred,
    supplierServiceId: service.id,
    supplierRateId: rate.id,
    supplierRateName: rate.name,
    supplierRateCurrency: rate.currency,
    supplierRateValidFrom: rate.validFrom,
    supplierRateValidTo: rate.validTo,
    supplierRateValidity: rateValidity,
    supplierRateRequiresReconfirmation: requiresReconfirmation,
    supplierMealBasis: rate.mealBasis,
    supplierSelectedMealBasis: /^(HB|HALF[ _-]?BOARD)$/i.test(rate.mealBasis || "") ? "HB" as const : "BB" as const,
    supplierBaseSinglePerNight: single,
    supplierBaseDoubleTwinPerNight: doubleTwin,
    supplierBaseTriplePerNight: triple,
    supplierDinnerIncluded: rate.dinnerIncluded,
    supplierDinnerAmount: rate.dinnerAmount,
    supplierDinnerUnit: rate.dinnerUnit,
    supplierCityTaxCurrency: rate.cityTaxCurrency,
    supplierCityTaxUnit: rate.cityTaxUnit,
    supplierCityTaxIncluded: rate.cityTaxIncluded,
    supplierCityTaxAmount: rate.cityTaxAmount,
    supplierPorterageIncluded: rate.porterageIncluded,
    supplierPorterageAvailable: rate.porterageAvailable,
    supplierPorterageAmount: rate.porterageAmount,
    supplierPorterageUnit: rate.porterageUnit,
    supplierBeveragePackageIncluded: rate.beveragePackageIncluded,
    supplierBeveragePackageAmount: rate.beveragePackageAmount,
    supplierBeveragePackageUnit: rate.beveragePackageUnit,
    supplierBeveragePackageDescription: rate.beveragePackageDescription,
    supplierDinnerSelected: false,
    supplierDinnerMeals: 0,
    supplierPorterageSelected: false,
    supplierBeverageSelected: false,
    supplierBeverageMeals: 0,
  };
}
