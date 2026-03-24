import type { PricingType, RoomType } from "@prisma/client";

type PricingTierInput = {
  minPax: number;
  maxPax: number;
  roomType: RoomType;
  price: number;
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

function findTierForRoomType(
  tiers: PricingTierInput[],
  totalPax: number,
  roomType: RoomType
) {
  return tiers.find(
    (tier) =>
      tier.roomType === roomType &&
      totalPax >= tier.minPax &&
      totalPax <= tier.maxPax
  );
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

  const doubleTwinRooms = doubleRooms + twinRooms;

  const totalPax =
    singleRooms + doubleTwinRooms * 2 + tripleRooms * 3;

  if (totalPax <= 0) {
    throw new Error("At least one passenger is required.");
  }

  let grossAmount = 0;

  if (pricingType === "FIXED_GROUP" || pricingType === "FIT_FIXED") {
    if (basePrice == null || !Number.isFinite(basePrice) || basePrice < 0) {
      throw new Error("Base price is missing or invalid.");
    }

    grossAmount = totalPax * basePrice;
  } else if (
    pricingType === "GROUP_BASED" ||
    pricingType === "FIT_TIERED"
  ) {
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

      subtotal += singleRooms * singleTier.price;
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

      subtotal += doubleTwinRooms * 2 * doubleTwinTier.price;
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

      subtotal += tripleRooms * 3 * tripleTier.price;
    }

    grossAmount = subtotal;
  } else if (pricingType === "FIT_DYNAMIC") {
    throw new Error("FIT_DYNAMIC pricing is not implemented yet.");
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