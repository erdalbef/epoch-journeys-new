import { aggregatePerPersonBuckets } from './aggregatePerPersonBuckets';
import { aggregateTotals } from './aggregateTotals';
import { applyFreePolicy } from './applyFreePolicy';
import { applyPricing } from './applyPricing';
import { normalizeQuoteLineItem } from './normalizeQuoteLineItem';
import {
  CalculationContext,
  PricingMode,
  QuoteCalculationResult,
  QuoteInput,
} from './types';

function buildContext(input: QuoteInput): CalculationContext {
  return {
    totalPassengers: input.totalPassengers ?? null,
    payingPassengers: input.payingPassengers ?? null,
    freePassengers: input.freePassengers ?? null,
    doubleTwinPassengers: input.doubleTwinPassengers ?? null,
    singlePassengers: input.singlePassengers ?? null,
    triplePassengers: input.triplePassengers ?? null,
    nights: input.nights ?? null,
    durationDays: input.durationDays ?? null,
    pricingMode: (input.pricingMode ?? 'LAND_ONLY') as PricingMode,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasOccupancy(
  passengerCount: number | null,
  occupancyCost: number | null
): boolean {
  return (passengerCount ?? 0) > 0 || occupancyCost !== null;
}

export function calculateQuote(input: QuoteInput): QuoteCalculationResult {
  const context = buildContext(input);

  const normalizedRows = input.lineItems
    .map((row) => normalizeQuoteLineItem(row, context))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const totals = aggregateTotals(normalizedRows);
  const buckets = aggregatePerPersonBuckets(normalizedRows);

  const baseUniformPerPerson = buckets.uniformPerPerson;

  const doubleTwinAvailable = hasOccupancy(
    context.doubleTwinPassengers,
    buckets.occupancy.doubleTwin
  );

  const singleAvailable = hasOccupancy(
    context.singlePassengers,
    buckets.occupancy.single
  );

  const tripleAvailable = hasOccupancy(
    context.triplePassengers,
    buckets.occupancy.triple
  );

  const baseDoubleTwinPerPerson =
    doubleTwinAvailable && baseUniformPerPerson !== null
      ? round2(baseUniformPerPerson + (buckets.occupancy.doubleTwin ?? 0))
      : null;

  const baseSinglePerPerson =
    singleAvailable && baseUniformPerPerson !== null
      ? round2(baseUniformPerPerson + (buckets.occupancy.single ?? 0))
      : null;

  const baseTriplePerPerson =
    tripleAvailable && baseUniformPerPerson !== null
      ? round2(baseUniformPerPerson + (buckets.occupancy.triple ?? 0))
      : null;

  const freeAdjustedRaw = applyFreePolicy({
    baseUniformPerPerson,
    occupancy: buckets.occupancy,
    totalPassengers: context.totalPassengers,
    payingPassengers: context.payingPassengers,
    freeEnabled: input.freeEnabled ?? false,
    freeCalculationMethod: input.freeCalculationMethod ?? null,
  });

  const freeAdjusted = {
    doubleTwin: doubleTwinAvailable ? freeAdjustedRaw.doubleTwin : null,
    single: singleAvailable ? freeAdjustedRaw.single : null,
    triple: tripleAvailable ? freeAdjustedRaw.triple : null,
    freeCostImpact: freeAdjustedRaw.freeCostImpact,
  };

  const landOnly = applyPricing({
    doubleTwinNet: freeAdjusted.doubleTwin,
    singleNet: freeAdjusted.single,
    tripleNet: freeAdjusted.triple,
    agencyCommissionPercent: input.agencyCommissionPercent ?? 0,
    epochMarkupPercent: input.epochMarkupPercent ?? 0,
  });

  const passengerFlightPerPerson = buckets.passengerFlightPerPerson ?? 0;

  const landAndAir = applyPricing({
    doubleTwinNet:
      freeAdjusted.doubleTwin !== null
        ? round2(freeAdjusted.doubleTwin + passengerFlightPerPerson)
        : null,
    singleNet:
      freeAdjusted.single !== null
        ? round2(freeAdjusted.single + passengerFlightPerPerson)
        : null,
    tripleNet:
      freeAdjusted.triple !== null
        ? round2(freeAdjusted.triple + passengerFlightPerPerson)
        : null,
    agencyCommissionPercent: input.agencyCommissionPercent ?? 0,
    epochMarkupPercent: input.epochMarkupPercent ?? 0,
  });

  return {
    totals,
    baseCosts: {
      uniform: baseUniformPerPerson,
      doubleTwin: baseDoubleTwinPerPerson,
      single: baseSinglePerPerson,
      triple: baseTriplePerPerson,
    },
    freeAdjusted,
    pricing: {
      landOnly: context.pricingMode === 'LAND_AND_AIR' ? null : landOnly,
      landAndAir: context.pricingMode === 'LAND_ONLY' ? null : landAndAir,
    },
    normalizedRows,
  };
}