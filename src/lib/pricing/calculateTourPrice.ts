import type { PricingType, RoomType } from "@prisma/client";

type PricingTierInput = {
  label?: string | null;
  minPax: number | null;
  maxPax: number | null;
  roomType: RoomType | null;
  pricePerPerson: number;
  currency?: string | null;
  isActive?: boolean | null;
};

type CalculateTourPriceInput = {
  pricingType: PricingType;
  basePrice: number | null;
  pricingTiers: PricingTierInput[];

  singleRooms: number;
  doubleRooms: number;
  twinRooms: number;
  tripleRooms: number;

  commissionRate: number;
};

type CalculateTourPriceResult = {
  totalPax: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  pricePerPerson: number;
};

function matchesPaxRange(
  totalPax: number,
  minPax: number | null,
  maxPax: number | null
): boolean {
  const minOk = minPax == null || totalPax >= minPax;
  const maxOk = maxPax == null || totalPax <= maxPax;
  return minOk && maxOk;
}

function sortBySpecificity(a: PricingTierInput, b: PricingTierInput): number {
  const aMin = a.minPax ?? 0;
  const bMin = b.minPax ?? 0;

  if (aMin !== bMin) {
    return bMin - aMin;
  }

  const aMax = a.maxPax ?? Number.MAX_SAFE_INTEGER;
  const bMax = b.maxPax ?? Number.MAX_SAFE_INTEGER;

  return aMax - bMax;
}

function findTierForRoomType(
  tiers: PricingTierInput[],
  totalPax: number,
  roomType: RoomType
): PricingTierInput | undefined {
  const activeTiers = tiers.filter(
    (tier) => tier.isActive !== false && tier.pricePerPerson > 0
  );

  const exactRoomMatch = activeTiers
    .filter((tier) => tier.roomType === roomType)
    .filter((tier) => matchesPaxRange(totalPax, tier.minPax, tier.maxPax))
    .sort(sortBySpecificity);

  const fallbackRoomAgnostic = activeTiers
    .filter((tier) => tier.roomType == null)
    .filter((tier) => matchesPaxRange(totalPax, tier.minPax, tier.maxPax))
    .sort(sortBySpecificity);

  return exactRoomMatch[0] ?? fallbackRoomAgnostic[0];
}

function validateNonNegativeInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
}

export function calculateTourPrice(
  input: CalculateTourPriceInput
): CalculateTourPriceResult {
  const {
    pricingType,
    basePrice,
    pricingTiers,
    singleRooms,
    doubleRooms,
    twinRooms,
    tripleRooms,
    commissionRate,
  } = input;

  validateNonNegativeInteger(singleRooms, "singleRooms");
  validateNonNegativeInteger(doubleRooms, "doubleRooms");
  validateNonNegativeInteger(twinRooms, "twinRooms");
  validateNonNegativeInteger(tripleRooms, "tripleRooms");

  if (!Number.isFinite(commissionRate) || commissionRate < 0) {
    throw new Error("commissionRate must be a valid non-negative number.");
  }

  const doubleTwinRooms = doubleRooms + twinRooms;
  const totalPax = singleRooms + doubleTwinRooms * 2 + tripleRooms * 3;

  if (totalPax <= 0) {
    throw new Error("At least one passenger is required.");
  }

  let grossAmount = 0;

  if (pricingType === "FIXED_GROUP" || pricingType === "FIT_FIXED") {
    if (basePrice == null || !Number.isFinite(basePrice) || basePrice < 0) {
      throw new Error("Base price is missing or invalid.");
    }

    grossAmount = totalPax * basePrice;
  } else if (pricingType === "GROUP_BASED" || pricingType === "FIT_TIERED") {
    let subtotal = 0;

    if (singleRooms > 0) {
      const singleTier = findTierForRoomType(
        pricingTiers,
        totalPax,
        "SINGLE"
      );

      if (!singleTier) {
        throw new Error("Missing SINGLE pricing tier for this passenger count.");
      }

      subtotal += singleRooms * singleTier.pricePerPerson;
    }

    if (doubleTwinRooms > 0) {
      const doubleTwinTier = findTierForRoomType(
        pricingTiers,
        totalPax,
        "DOUBLE_TWIN"
      );

      if (!doubleTwinTier) {
        throw new Error(
          "Missing DOUBLE_TWIN pricing tier for this passenger count."
        );
      }

      subtotal += doubleTwinRooms * 2 * doubleTwinTier.pricePerPerson;
    }

    if (tripleRooms > 0) {
      const tripleTier = findTierForRoomType(
        pricingTiers,
        totalPax,
        "TRIPLE"
      );

      if (!tripleTier) {
        throw new Error("Missing TRIPLE pricing tier for this passenger count.");
      }

      subtotal += tripleRooms * 3 * tripleTier.pricePerPerson;
    }

    grossAmount = subtotal;
  } else if (pricingType === "FIT_DYNAMIC") {
    throw new Error("FIT_DYNAMIC pricing is quote-based and not auto-priced.");
  } else {
    throw new Error("Unsupported pricing type.");
  }

  const commissionAmount = (grossAmount * commissionRate) / 100;
  const netAmount = grossAmount - commissionAmount;
  const pricePerPerson = grossAmount / totalPax;

  return {
    totalPax,
    grossAmount,
    commissionAmount,
    netAmount,
    pricePerPerson,
  };
}