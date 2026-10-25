/**
 * Read-only selection checks for a Supplier CRM admission rate.
 * The quotation calculator still owns all per-person and COMP allocations.
 */
export type EntranceRateCandidate = {
  amount: number | null;
  currency: string;
  unit: string;
  taxIncluded: boolean;
  validFrom: string;
  validTo: string;
  validity: string;
  dateMatches: boolean; // API metadata, retained for compatibility with earlier snapshots.
  paxMatches: boolean;
  minPax?: number | null;
  maxPax?: number | null;
};

export type EntranceRateSnapshot = {
  supplierId: string;
  supplierName: string;
  supplierServiceId: string;
  supplierServiceName: string;
  supplierRateId: string;
  supplierRateName: string;
  supplierRateAmount: number;
  supplierRateCurrency: string;
  supplierRateUnit: string;
  supplierRateValidFrom: string;
  supplierRateValidTo: string;
  supplierRateVerifiedAt: string | null;
  visitDate: string;
};

/**
 * Returns null when an active Supplier CRM entrance rate can populate a
 * per-person admission cost. The Admin maintains the current price in CRM;
 * no tour or attraction date is needed for rate lookup.
 */
export function entranceRateSelectionIssue(
  rate: EntranceRateCandidate,
  quoteCurrency: string,
  totalTravelers = 0,
): string | null {
  if (rate.unit !== "PER_PERSON" && rate.unit !== "PER_TICKET") {
    return `Unit ${rate.unit} requires a separate cost calculation.`;
  }
  if (rate.currency.toUpperCase() !== quoteCurrency.toUpperCase()) {
    return `Currency ${rate.currency} differs from quotation ${quoteCurrency}; conversion is required.`;
  }
  if (rate.amount === null || !Number.isFinite(rate.amount) || rate.amount < 0) {
    return "Rate amount is missing or invalid.";
  }
  if (rate.taxIncluded !== true) {
    return "Tax is not included; confirm the tax-inclusive cost before manual entry.";
  }
  // Without group details we can use an unrestricted per-person rate, but
  // a rate with group-size limits cannot be verified until pax is known.
  if (totalTravelers < 1 && (rate.minPax != null || rate.maxPax != null)) {
    return "Enter group size to verify this passenger-restricted rate.";
  }
  if (!rate.paxMatches) {
    return "Rate is outside the supplier's passenger limits.";
  }
  return null;
}
