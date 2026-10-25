/**
 * Read-only duplicate detection for quotation per-person rows.
 * This helper does NOT add prices, allocate COMPs, or change group-cost maths.
 */
export type ComparablePerPersonRow = {
  label: string;
  category: string;
  attractionRateSource?: { attractionId: string };
  standardRateSource?: { serviceId: string };
  supplierServiceRateSource?: { supplierServiceId: string; supplierRateId: string };
  entranceRateSource?: { supplierRateId: string };
};

export function normalizeServiceLabel(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Returns the existing row index, or -1 when the service is not already included. */
export function findDuplicatePerPersonRow<T extends ComparablePerPersonRow>(
  rows: readonly T[], candidate: T, excludedIndex = -1,
): number {
  const label = normalizeServiceLabel(candidate.label);
  if (!label) return -1;
  return rows.findIndex((row, index) => {
    if (index === excludedIndex || row.category !== candidate.category || !normalizeServiceLabel(row.label)) return false;
    if (candidate.attractionRateSource?.attractionId && row.attractionRateSource?.attractionId === candidate.attractionRateSource.attractionId) return true;
    if (candidate.standardRateSource?.serviceId && row.standardRateSource?.serviceId === candidate.standardRateSource.serviceId) return true;
    if (candidate.supplierServiceRateSource?.supplierRateId && row.supplierServiceRateSource?.supplierRateId === candidate.supplierServiceRateSource.supplierRateId) return true;
    if (candidate.entranceRateSource?.supplierRateId && row.entranceRateSource?.supplierRateId === candidate.entranceRateSource.supplierRateId) return true;
    return normalizeServiceLabel(row.label) === label;
  });
}
