import { OccupancyPricingBreakdown, OccupancyPricingResult } from './types';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateOne(
  net: number | null,
  agencyCommissionPercent?: number | null,
  epochMarkupPercent?: number | null
): OccupancyPricingBreakdown {
  if (net === null) {
    return {
      net: null,
      commissionAmount: null,
      markupAmount: null,
      sellingPrice: null,
    };
  }

  const markupRate = Math.max(epochMarkupPercent ?? 0, 0) / 100;
  // B2B NET policy: agencyCommissionPercent is retained only for backward
  // compatibility with older saved quotes. New quotes do not use commission.
  void agencyCommissionPercent;
  const sellingPrice = round2(net * (1 + markupRate));
  const commissionAmount = 0;
  const markupAmount = round2(sellingPrice - net);

  return {
    net: round2(net),
    commissionAmount,
    markupAmount,
    sellingPrice,
  };
}

export function applyPricing(params: {
  doubleTwinNet: number | null;
  singleNet: number | null;
  tripleNet: number | null;
  agencyCommissionPercent?: number | null;
  epochMarkupPercent?: number | null;
}): OccupancyPricingResult {
  return {
    doubleTwin: calculateOne(
      params.doubleTwinNet,
      params.agencyCommissionPercent,
      params.epochMarkupPercent
    ),
    single: calculateOne(
      params.singleNet,
      params.agencyCommissionPercent,
      params.epochMarkupPercent
    ),
    triple: calculateOne(
      params.tripleNet,
      params.agencyCommissionPercent,
      params.epochMarkupPercent
    ),
  };
}
