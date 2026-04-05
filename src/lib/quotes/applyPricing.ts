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

  const commissionRate = (agencyCommissionPercent ?? 0) / 100;
  const markupRate = (epochMarkupPercent ?? 0) / 100;

  const commissionAmount = round2(net * commissionRate);
  const markupAmount = round2(net * markupRate);
  const sellingPrice = round2(net + commissionAmount + markupAmount);

  return {
    net,
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