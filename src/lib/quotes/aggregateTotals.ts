import { NormalizedRow, TotalsResult } from './types';

function sum(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === 'number');
  if (present.length === 0) return null;
  return Math.round(present.reduce((a, b) => a + b, 0) * 100) / 100;
}

export function aggregateTotals(rows: NormalizedRow[]): TotalsResult {
  const totalFixedCost = sum(
    rows
      .filter((r) => r.section === 'FIXED')
      .map((r) => r.totalCost)
  );

  const totalVariableCost = sum(
    rows
      .filter((r) => r.section === 'VARIABLE')
      .map((r) => r.totalCost)
  );

  const totalFlightCost = sum(
    rows
      .filter((r) => r.section === 'FLIGHT')
      .map((r) => r.totalCost)
  );

  const totalTipsCost = sum(
    rows
      .filter((r) => r.section === 'TIPS')
      .map((r) => r.totalCost)
  );

  const totalCustomCost = sum(
    rows
      .filter((r) => r.section === 'CUSTOM')
      .map((r) => r.totalCost)
  );

  const totalTourCost = sum([
    totalFixedCost,
    totalVariableCost,
    totalFlightCost,
    totalTipsCost,
    totalCustomCost,
  ]);

  return {
    totalFixedCost,
    totalVariableCost,
    totalFlightCost,
    totalTipsCost,
    totalCustomCost,
    totalTourCost,
  };
}