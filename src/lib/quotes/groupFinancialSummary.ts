/**
 * Read-only reconciliation of a quotation's EXISTING Double/Twin costs.
 * IMPORTANT: This is a reporting adapter, not a new pricing engine.
 * It does not change COMP or group-cost allocation, master rates or selling prices.
 */
export type GroupFinancialSummaryInput = {
  payingPassengers: number;
  freePassengers: number;
  hotelPerPayingPax: number;
  otherPerPayingPax: number;
  coreOperationalGroupTotal: number;
  groupLeaderAllowanceTotal: number;
  complimentaryExpenseTotal: number;
  costPerPayingPax: number;
  netSellingPerPayingPax: number;
};

export type GroupFinancialLine = {
  key: "HOTELS" | "SERVICES" | "OPERATIONS" | "LEADER" | "COMPS";
  label: string;
  groupTotal: number;
  perPayingPax: number;
};

export type GroupFinancialSummary = {
  payingPassengers: number;
  freePassengers: number;
  totalTravelers: number;
  lines: GroupFinancialLine[];
  itemizedGroupTotal: number;
  reconciliationDifference: number;
  totalGroupCost: number;
  sellingPerPayingPax: number;
  costPerPayingPax: number;
  expectedRevenue: number;
  projectedProfit: number;
  marginPercent: number;
  reconciles: boolean;
};

const cents = (number: number) => Math.round((number + Number.EPSILON) * 100) / 100;
const validMoney = (number: number) => Number.isFinite(number) ? Math.max(0, number) : 0;

export function buildGroupFinancialSummary(input: GroupFinancialSummaryInput): GroupFinancialSummary {
  const paying = Number.isFinite(input.payingPassengers) ? Math.max(0, Math.trunc(input.payingPassengers)) : 0;
  const free = Number.isFinite(input.freePassengers) ? Math.max(0, Math.trunc(input.freePassengers)) : 0;
  const rate = validMoney(input.netSellingPerPayingPax);
  const costRate = validMoney(input.costPerPayingPax);
  const groupEntries = [
    { key: "HOTELS" as const, label: "Hotels - paying travelers (Double/Twin basis)", total: validMoney(input.hotelPerPayingPax) * paying },
    { key: "SERVICES" as const, label: "Per-person services - paying travelers", total: validMoney(input.otherPerPayingPax) * paying },
    { key: "OPERATIONS" as const, label: "Fixed group operations and staff", total: validMoney(input.coreOperationalGroupTotal) },
    { key: "LEADER" as const, label: "Group leader allowance", total: validMoney(input.groupLeaderAllowanceTotal) },
    { key: "COMPS" as const, label: "Complimentary travelers - hotel and personal costs", total: validMoney(input.complimentaryExpenseTotal) },
  ];
  const lines: GroupFinancialLine[] = groupEntries.map(({key, label, total}) => ({
    key,
    label,
    groupTotal: cents(total),
    perPayingPax: paying > 0 ? cents(total / paying) : 0,
  }));
  const itemizedGroupTotal = cents(lines.reduce((sum, line) => sum + line.groupTotal, 0));
  // Exact same definition used by the current QuoteCreateForm: rounded NET cost/payer * paying pax.
  const totalGroupCost = cents(costRate * paying);
  const reconciliationDifference = cents(totalGroupCost - itemizedGroupTotal);
  const expectedRevenue = cents(rate * paying);
  const projectedProfit = cents(expectedRevenue - totalGroupCost);
  const marginPercent = expectedRevenue > 0 ? cents(projectedProfit / expectedRevenue * 100) : 0;
  // Rounding per-payer and then multiplying can create up to EUR 0.005 * paying differences.
  // Anything larger is an actual inconsistency that should be investigated.
  const roundingTolerance = paying * 0.005 + 0.02;
  return {
    payingPassengers: paying,
    freePassengers: free,
    totalTravelers: paying + free,
    lines,
    itemizedGroupTotal,
    reconciliationDifference,
    totalGroupCost,
    sellingPerPayingPax: cents(rate),
    costPerPayingPax: cents(costRate),
    expectedRevenue,
    projectedProfit,
    marginPercent,
    reconciles: Math.abs(reconciliationDifference) <= roundingTolerance,
  };
}
