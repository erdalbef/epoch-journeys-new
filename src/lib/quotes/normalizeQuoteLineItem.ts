import {
  CalculationContext,
  DivisorBasis,
  NormalizedRow,
  OccupancyValues,
  QuoteLineItemInput,
} from './types';

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveDivisor(
  basis: DivisorBasis | null | undefined,
  context: CalculationContext,
  customDivisor?: number | null
): number | null {
  if (basis === 'PAYING_PASSENGERS') return context.payingPassengers;
  if (basis === 'TOTAL_PASSENGERS') return context.totalPassengers;
  if (basis === 'CUSTOM') return customDivisor ?? null;
  return context.payingPassengers;
}

function safeOccupancy(values: Partial<OccupancyValues>): OccupancyValues {
  return {
    doubleTwin: values.doubleTwin ?? null,
    single: values.single ?? null,
    triple: values.triple ?? null,
  };
}

export function normalizeQuoteLineItem(
  row: QuoteLineItemInput,
  context: CalculationContext
): NormalizedRow | null {
  const unitCost = row.unitCost ?? null;
  const totalCostInput = row.totalCost ?? null;
  const quantity = row.quantity ?? null;
  const days = row.days ?? null;
  const nights = row.nights ?? context.nights ?? null;

  // Ignore completely empty rows
  const isEmpty =
    isNil(unitCost) &&
    isNil(totalCostInput) &&
    isNil(quantity) &&
    isNil(days) &&
    isNil(nights) &&
    isNil(row.perPersonDoubleTwin) &&
    isNil(row.perPersonSingle) &&
    isNil(row.perPersonTriple);

  if (isEmpty) return null;

  // FIXED: per person x quantity (Lunch, Dinner)
  if (row.calculationMethod === 'PER_PERSON_X_QTY') {
    if (isNil(unitCost) || isNil(quantity)) {
      return {
        id: row.id,
        sourceType: row.type,
        section: row.section,
        bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'UNIFORM_FIXED',
        totalCost: null,
        uniformPerPerson: null,
        perPersonByOccupancy: null,
        divisorUsed: null,
      };
    }

    const passengerBasis = context.totalPassengers ?? context.payingPassengers;
    const uniformPerPerson = round2(unitCost * quantity);
    const totalCost = passengerBasis ? round2(uniformPerPerson * passengerBasis) : null;

    return {
      id: row.id,
      sourceType: row.type,
      section: row.section,
      bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'UNIFORM_FIXED',
      totalCost,
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: passengerBasis ?? null,
    };
  }

  // FIXED: per person x days (Whisper Set)
  if (row.calculationMethod === 'PER_PERSON_X_DAYS') {
    if (isNil(unitCost) || isNil(days)) {
      return {
        id: row.id,
        sourceType: row.type,
        section: row.section,
        bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'UNIFORM_FIXED',
        totalCost: null,
        uniformPerPerson: null,
        perPersonByOccupancy: null,
        divisorUsed: null,
      };
    }

    const passengerBasis = context.totalPassengers ?? context.payingPassengers;
    const uniformPerPerson = round2(unitCost * days);
    const totalCost = passengerBasis ? round2(uniformPerPerson * passengerBasis) : null;

    return {
      id: row.id,
      sourceType: row.type,
      section: row.section,
      bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'UNIFORM_FIXED',
      totalCost,
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: passengerBasis ?? null,
    };
  }

  // FIXED: per person per night (City Tax)
  if (row.calculationMethod === 'PER_PERSON_PER_NIGHT') {
    if (isNil(unitCost) || isNil(nights)) {
      return {
        id: row.id,
        sourceType: row.type,
        section: row.section,
        bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'UNIFORM_FIXED',
        totalCost: null,
        uniformPerPerson: null,
        perPersonByOccupancy: null,
        divisorUsed: null,
      };
    }

    const passengerBasis = context.totalPassengers ?? context.payingPassengers;
    const uniformPerPerson = round2(unitCost * nights);
    const totalCost = passengerBasis ? round2(uniformPerPerson * passengerBasis) : null;

    return {
      id: row.id,
      sourceType: row.type,
      section: row.section,
      bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'UNIFORM_FIXED',
      totalCost,
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: passengerBasis ?? null,
    };
  }

  // FIXED: per room per night (Accommodation Tax / Climate Tax / possible Hotel)
  if (row.calculationMethod === 'PER_ROOM_PER_NIGHT') {
    if (isNil(unitCost) || isNil(nights)) {
      return {
        id: row.id,
        sourceType: row.type,
        section: row.section,
        bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'OCCUPANCY_FIXED',
        totalCost: null,
        uniformPerPerson: null,
        perPersonByOccupancy: null,
        divisorUsed: null,
      };
    }

    const perPersonByOccupancy = safeOccupancy({
      doubleTwin: round2((unitCost / 2) * nights),
      single: round2((unitCost / 1) * nights),
      triple: round2((unitCost / 3) * nights),
    });

    const totalCost = round2(
      (perPersonByOccupancy.doubleTwin ?? 0) * (context.doubleTwinPassengers ?? 0) +
        (perPersonByOccupancy.single ?? 0) * (context.singlePassengers ?? 0) +
        (perPersonByOccupancy.triple ?? 0) * (context.triplePassengers ?? 0)
    );

    return {
      id: row.id,
      sourceType: row.type,
      section: row.section,
      bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'OCCUPANCY_FIXED',
      totalCost,
      uniformPerPerson: null,
      perPersonByOccupancy,
      divisorUsed: null,
    };
  }

  // Direct occupancy entry
  if (row.calculationMethod === 'PER_OCCUPANCY_DIRECT') {
    const perPersonByOccupancy = safeOccupancy({
      doubleTwin: row.perPersonDoubleTwin ?? null,
      single: row.perPersonSingle ?? null,
      triple: row.perPersonTriple ?? null,
    });

    const hasAny =
      perPersonByOccupancy.doubleTwin !== null ||
      perPersonByOccupancy.single !== null ||
      perPersonByOccupancy.triple !== null;

    if (!hasAny) {
      return {
        id: row.id,
        sourceType: row.type,
        section: row.section,
        bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'OCCUPANCY_FIXED',
        totalCost: null,
        uniformPerPerson: null,
        perPersonByOccupancy: null,
        divisorUsed: null,
      };
    }

    const totalCost = round2(
      (perPersonByOccupancy.doubleTwin ?? 0) * (context.doubleTwinPassengers ?? 0) +
        (perPersonByOccupancy.single ?? 0) * (context.singlePassengers ?? 0) +
        (perPersonByOccupancy.triple ?? 0) * (context.triplePassengers ?? 0)
    );

    return {
      id: row.id,
      sourceType: row.type,
      section: row.section,
      bucket: row.section === 'CUSTOM' ? 'CUSTOM' : 'OCCUPANCY_FIXED',
      totalCost,
      uniformPerPerson: null,
      perPersonByOccupancy,
      divisorUsed: null,
    };
  }

  // Shared total / shared daily / flat total
  if (
    row.calculationMethod === 'SHARED_TOTAL' ||
    row.calculationMethod === 'SHARED_DAILY' ||
    row.calculationMethod === 'FLAT_TOTAL'
  ) {
    let totalCost: number | null = totalCostInput;

    if (row.calculationMethod === 'SHARED_DAILY') {
      if (isNil(unitCost) || isNil(days)) {
        totalCost = null;
      } else {
        totalCost = round2(unitCost * days * (quantity ?? 1));
      }
    }

    const divisor = resolveDivisor(row.divisorBasis, context, row.customDivisor);
    const uniformPerPerson =
      totalCost !== null && divisor && divisor > 0 ? round2(totalCost / divisor) : null;

    const isPassengerFlight = row.type === 'PASSENGER_FLIGHT';
    const isInternalFlight =
      row.type === 'GUIDE_FLIGHT' ||
      row.type === 'TOUR_MANAGER_FLIGHT' ||
      row.type === 'STAFF_FLIGHT';
    const isTip = row.section === 'TIPS';

    let bucket: NormalizedRow['bucket'] = 'VARIABLE_SHARED';
    if (isPassengerFlight) bucket = 'PASSENGER_FLIGHT';
    else if (isInternalFlight) bucket = 'INTERNAL_FLIGHT';
    else if (isTip) bucket = 'TIP';
    else if (row.section === 'CUSTOM') bucket = 'CUSTOM';

    return {
      id: row.id,
      sourceType: row.type,
      section: row.section,
      bucket,
      totalCost,
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: divisor ?? null,
    };
  }

  // Plain per-person
  if (row.calculationMethod === 'PER_PERSON') {
    const isPassengerFlight = row.type === 'PASSENGER_FLIGHT';
    const isInternalFlight =
      row.type === 'GUIDE_FLIGHT' ||
      row.type === 'TOUR_MANAGER_FLIGHT' ||
      row.type === 'STAFF_FLIGHT';
    const isTip = row.section === 'TIPS';

    let bucket: NormalizedRow['bucket'] = 'UNIFORM_FIXED';
    if (isPassengerFlight) bucket = 'PASSENGER_FLIGHT';
    else if (isInternalFlight) bucket = 'INTERNAL_FLIGHT';
    else if (isTip) bucket = 'TIP';
    else if (row.section === 'CUSTOM') bucket = 'CUSTOM';

    if (isNil(unitCost)) {
      return {
        id: row.id,
        sourceType: row.type,
        section: row.section,
        bucket,
        totalCost: null,
        uniformPerPerson: null,
        perPersonByOccupancy: null,
        divisorUsed: null,
      };
    }

    const passengerBasis = context.totalPassengers ?? context.payingPassengers;
    const uniformPerPerson = round2(unitCost);
    const totalCost = passengerBasis ? round2(unitCost * passengerBasis) : null;

    return {
      id: row.id,
      sourceType: row.type,
      section: row.section,
      bucket,
      totalCost,
      uniformPerPerson,
      perPersonByOccupancy: null,
      divisorUsed: passengerBasis ?? null,
    };
  }

  return null;
}