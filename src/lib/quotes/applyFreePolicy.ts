import { FreeAdjustedResult, FreeCalculationMethod, OccupancyValues } from './types';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function add(uniformValue: number | null, occupancyValue: number | null): number | null {
  if (uniformValue === null && occupancyValue === null) return null;
  return round2((uniformValue ?? 0) + (occupancyValue ?? 0));
}

export function applyFreePolicy(params: {
  baseUniformPerPerson: number | null;
  occupancy: OccupancyValues;
  totalPassengers: number | null;
  payingPassengers: number | null;
  freeEnabled?: boolean | null;
  freeCalculationMethod?: FreeCalculationMethod | null;
}): FreeAdjustedResult {
  const {
    baseUniformPerPerson,
    occupancy,
    totalPassengers,
    payingPassengers,
    freeEnabled,
    freeCalculationMethod,
  } = params;

  const uniform = baseUniformPerPerson ?? null;

  const build = (uniformValue: number | null, freeCostImpact = 0): FreeAdjustedResult => ({
    doubleTwin: add(uniformValue, occupancy.doubleTwin),
    single: add(uniformValue, occupancy.single),
    triple: add(uniformValue, occupancy.triple),
    freeCostImpact,
  });

  // No free logic applied
  if (!freeEnabled || !freeCalculationMethod) {
    return build(uniform);
  }

  // Free absorbed internally, so selling basis unchanged
  if (freeCalculationMethod === 'ABSORBED_INTERNALLY') {
    return build(uniform);
  }

  // Free spread only affects the uniform/shared portion
  if (
    freeCalculationMethod === 'SPREAD_ACROSS_PAYING_PASSENGERS' &&
    uniform !== null &&
    totalPassengers &&
    payingPassengers &&
    payingPassengers > 0
  ) {
    const factor = totalPassengers / payingPassengers;
    const adjustedUniform = round2(uniform * factor);
    const freeCostImpact = round2(adjustedUniform - uniform);

    return build(adjustedUniform, freeCostImpact);
  }

  return build(uniform);
}