import { NormalizedRow, OccupancyValues, PerPersonBucketsResult } from './types';

function sum(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === 'number');
  if (present.length === 0) return null;
  return Math.round(present.reduce((a, b) => a + b, 0) * 100) / 100;
}

function sumOccupancy(rows: NormalizedRow[], key: keyof OccupancyValues): number | null {
  return sum(
    rows.map((r) => r.perPersonByOccupancy?.[key] ?? null)
  );
}

export function aggregatePerPersonBuckets(
  rows: NormalizedRow[]
): PerPersonBucketsResult {
  const uniformPerPerson = sum(
    rows
      .filter((r) =>
        r.bucket === 'UNIFORM_FIXED' ||
        r.bucket === 'VARIABLE_SHARED' ||
        r.bucket === 'INTERNAL_FLIGHT' ||
        r.bucket === 'TIP' ||
        r.bucket === 'CUSTOM'
      )
      .map((r) => r.uniformPerPerson)
  );

  const occupancyRows = rows.filter(
    (r) => r.bucket === 'OCCUPANCY_FIXED' || r.bucket === 'CUSTOM'
  );

  const occupancy = {
    doubleTwin: sumOccupancy(occupancyRows, 'doubleTwin'),
    single: sumOccupancy(occupancyRows, 'single'),
    triple: sumOccupancy(occupancyRows, 'triple'),
  };

  const passengerFlightPerPerson = sum(
    rows
      .filter((r) => r.bucket === 'PASSENGER_FLIGHT')
      .map((r) => r.uniformPerPerson)
  );

  return {
    uniformPerPerson,
    occupancy,
    passengerFlightPerPerson,
  };
}