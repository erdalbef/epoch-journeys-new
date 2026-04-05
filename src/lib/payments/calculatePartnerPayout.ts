import { PartnerType } from "@prisma/client";

type NullableNumber = number | null | undefined;

export type CalculatePartnerPayoutInput = {
  partnerType: PartnerType | null | undefined;

  // booking / revenue data
  grossAmount: number;
  numberOfGuests: number;
  estimatedPax?: NullableNumber;
  finalPax?: NullableNumber;

  // user-level defaults
  userCommissionRate?: NullableNumber;
  userPayoutPerPax?: NullableNumber;

  // per-tour overrides
  tourCommissionRate?: NullableNumber;
  tourPayoutPerPax?: NullableNumber;
};

export type CalculatePartnerPayoutResult = {
  partnerType: PartnerType | null;
  paxUsed: number;

  // snapshot-ready values
  commissionRateSnapshot: number | null;
  payoutPerPaxSnapshot: number | null;
  commissionAmount: number;

  // useful for UI/debug
  calculationMethod: "COMMISSION_RATE" | "PAYOUT_PER_PAX" | "NONE";
  calculationSource: "TOUR_OVERRIDE" | "USER_DEFAULT" | "NONE";
};

function isPositiveNumber(value: NullableNumber): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolvePaxCount(input: {
  finalPax?: NullableNumber;
  estimatedPax?: NullableNumber;
  numberOfGuests: number;
}): number {
  if (isPositiveNumber(input.finalPax)) return input.finalPax;
  if (isPositiveNumber(input.estimatedPax)) return input.estimatedPax;
  return Math.max(1, input.numberOfGuests);
}

export function calculatePartnerPayoutForBooking(
  input: CalculatePartnerPayoutInput
): CalculatePartnerPayoutResult {
  const paxUsed = resolvePaxCount({
    finalPax: input.finalPax,
    estimatedPax: input.estimatedPax,
    numberOfGuests: input.numberOfGuests,
  });

  const partnerType = input.partnerType ?? null;

  const hasTourCommissionRate = isPositiveNumber(input.tourCommissionRate);
  const hasTourPayoutPerPax = isPositiveNumber(input.tourPayoutPerPax);
  const hasUserCommissionRate = isPositiveNumber(input.userCommissionRate);
  const hasUserPayoutPerPax = isPositiveNumber(input.userPayoutPerPax);

  const resolvedTourOrUserCommissionRate = hasTourCommissionRate
    ? input.tourCommissionRate
    : hasUserCommissionRate
    ? input.userCommissionRate
    : null;

  const resolvedTourOrUserPayoutPerPax = hasTourPayoutPerPax
    ? input.tourPayoutPerPax
    : hasUserPayoutPerPax
    ? input.userPayoutPerPax
    : null;

  const calculationSource: CalculatePartnerPayoutResult["calculationSource"] =
    hasTourCommissionRate || hasTourPayoutPerPax
      ? "TOUR_OVERRIDE"
      : hasUserCommissionRate || hasUserPayoutPerPax
      ? "USER_DEFAULT"
      : "NONE";

  // GROUP LEADER:
  // Prefer payout per pax first.
  if (partnerType === PartnerType.GROUP_LEADER) {
    if (isPositiveNumber(resolvedTourOrUserPayoutPerPax)) {
      const commissionAmount = roundCurrency(
        paxUsed * resolvedTourOrUserPayoutPerPax
      );

      return {
        partnerType,
        paxUsed,
        commissionRateSnapshot: null,
        payoutPerPaxSnapshot: resolvedTourOrUserPayoutPerPax,
        commissionAmount,
        calculationMethod: "PAYOUT_PER_PAX",
        calculationSource,
      };
    }

    // Optional fallback: if no per-pax exists, allow commission rate.
    if (isPositiveNumber(resolvedTourOrUserCommissionRate)) {
      const commissionAmount = roundCurrency(
        input.grossAmount * (resolvedTourOrUserCommissionRate / 100)
      );

      return {
        partnerType,
        paxUsed,
        commissionRateSnapshot: resolvedTourOrUserCommissionRate,
        payoutPerPaxSnapshot: null,
        commissionAmount,
        calculationMethod: "COMMISSION_RATE",
        calculationSource,
      };
    }

    return {
      partnerType,
      paxUsed,
      commissionRateSnapshot: null,
      payoutPerPaxSnapshot: null,
      commissionAmount: 0,
      calculationMethod: "NONE",
      calculationSource: "NONE",
    };
  }

  // All other partner types:
  // Prefer commission rate first, then payout per pax.
  if (isPositiveNumber(resolvedTourOrUserCommissionRate)) {
    const commissionAmount = roundCurrency(
      input.grossAmount * (resolvedTourOrUserCommissionRate / 100)
    );

    return {
      partnerType,
      paxUsed,
      commissionRateSnapshot: resolvedTourOrUserCommissionRate,
      payoutPerPaxSnapshot: null,
      commissionAmount,
      calculationMethod: "COMMISSION_RATE",
      calculationSource,
    };
  }

  if (isPositiveNumber(resolvedTourOrUserPayoutPerPax)) {
    const commissionAmount = roundCurrency(
      paxUsed * resolvedTourOrUserPayoutPerPax
    );

    return {
      partnerType,
      paxUsed,
      commissionRateSnapshot: null,
      payoutPerPaxSnapshot: resolvedTourOrUserPayoutPerPax,
      commissionAmount,
      calculationMethod: "PAYOUT_PER_PAX",
      calculationSource,
    };
  }

  return {
    partnerType,
    paxUsed,
    commissionRateSnapshot: null,
    payoutPerPaxSnapshot: null,
    commissionAmount: 0,
    calculationMethod: "NONE",
    calculationSource: "NONE",
  };
}