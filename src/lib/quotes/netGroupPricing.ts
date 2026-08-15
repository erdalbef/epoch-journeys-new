export type NetGroupPricingInput = {
  payingPassengers: number;
  freePassengers: number;
  hotelSinglePerPayingPax: number;
  hotelDoubleTwinPerPayingPax: number;
  hotelTriplePerPayingPax: number;
  otherPerPersonCost: number;
  groupOperationalCost: number;
  epochMarkupPercent: number;
  manualSingleNetRate?: number | null;
  manualDoubleTwinNetRate?: number | null;
  manualTripleNetRate?: number | null;
};

export type NetGroupPricingResult = {
  payingPassengers: number;
  freePassengers: number;
  totalTravelers: number;
  freeVariableCostTotal: number;
  groupOperationalCostPerPayingPax: number;
  freeCostPerPayingPax: number;
  costPerPayingPax: { single: number; doubleTwin: number; triple: number };
  calculatedNetRate: { single: number; doubleTwin: number; triple: number };
  finalNetRate: { single: number; doubleTwin: number; triple: number };
  group: { totalCost: number; netRevenue: number; profit: number; marginPercent: number };
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const nonNegative = (value: number) => Math.max(Number.isFinite(value) ? value : 0, 0);

export function calculateNetGroupPricing(input: NetGroupPricingInput): NetGroupPricingResult {
  const paying = Math.max(Math.trunc(nonNegative(input.payingPassengers)), 1);
  const free = Math.trunc(nonNegative(input.freePassengers));
  const totalTravelers = paying + free;
  const perPerson = nonNegative(input.otherPerPersonCost);
  const operations = nonNegative(input.groupOperationalCost);
  const markupRate = nonNegative(input.epochMarkupPercent) / 100;

  const hotel = {
    single: nonNegative(input.hotelSinglePerPayingPax),
    doubleTwin: nonNegative(input.hotelDoubleTwinPerPayingPax),
    triple: nonNegative(input.hotelTriplePerPayingPax),
  };

  // Complimentary travelers are costed at the double/twin basis by default.
  // They consume variable services but do not duplicate true group costs.
  const freeVariableCostTotal = free * (hotel.doubleTwin + perPerson);
  const freeCostPerPayingPax = freeVariableCostTotal / paying;
  const groupOperationalCostPerPayingPax = operations / paying;

  const costFor = (hotelCost: number) => round2(
    hotelCost + perPerson + groupOperationalCostPerPayingPax + freeCostPerPayingPax
  );
  const costPerPayingPax = {
    single: costFor(hotel.single),
    doubleTwin: costFor(hotel.doubleTwin),
    triple: costFor(hotel.triple),
  };

  const rateFor = (cost: number) => round2(cost * (1 + markupRate));
  const calculatedNetRate = {
    single: rateFor(costPerPayingPax.single),
    doubleTwin: rateFor(costPerPayingPax.doubleTwin),
    triple: rateFor(costPerPayingPax.triple),
  };

  const manualOrCalculated = (manual: number | null | undefined, calculated: number) =>
    manual != null && Number.isFinite(manual) && manual > 0 ? round2(manual) : calculated;
  const finalNetRate = {
    single: manualOrCalculated(input.manualSingleNetRate, calculatedNetRate.single),
    doubleTwin: manualOrCalculated(input.manualDoubleTwinNetRate, calculatedNetRate.doubleTwin),
    triple: manualOrCalculated(input.manualTripleNetRate, calculatedNetRate.triple),
  };

  // Profitability uses the double/twin basis because that is the standard advertised group basis.
  const totalCost = round2(costPerPayingPax.doubleTwin * paying);
  const netRevenue = round2(finalNetRate.doubleTwin * paying);
  const profit = round2(netRevenue - totalCost);
  const marginPercent = netRevenue > 0 ? round2((profit / netRevenue) * 100) : 0;

  return {
    payingPassengers: paying,
    freePassengers: free,
    totalTravelers,
    freeVariableCostTotal: round2(freeVariableCostTotal),
    groupOperationalCostPerPayingPax: round2(groupOperationalCostPerPayingPax),
    freeCostPerPayingPax: round2(freeCostPerPayingPax),
    costPerPayingPax,
    calculatedNetRate,
    finalNetRate,
    group: { totalCost, netRevenue, profit, marginPercent },
  };
}
