/**
 * Epoch Journeys - read-only hotel extras breakdown.
 * This mirrors the quotation's existing supplier extras rule. Supplier base
 * nightly rates already include the contracted meal plan and city tax.
 * Never charge included services a second time.
 */
export type HotelExtrasInput = {
  supplierRateId?: string;
  supplierSelectedMealBasis?: "BB" | "HB";
  supplierMealBasis?: string | null;
  supplierDinnerIncluded?: boolean | null;
  supplierDinnerSelected?: boolean;
  supplierDinnerAmount?: number | null;
  supplierDinnerUnit?: string | null;
  supplierDinnerMeals?: number;
  supplierPorterageAvailable?: boolean | null;
  supplierPorterageIncluded?: boolean | null;
  supplierPorterageSelected?: boolean;
  supplierPorterageAmount?: number | null;
  supplierPorterageUnit?: string | null;
  supplierBeveragePackageIncluded?: boolean | null;
  supplierBeverageSelected?: boolean;
  supplierBeveragePackageAmount?: number | null;
  supplierBeveragePackageUnit?: string | null;
  supplierBeverageMeals?: number;
  nights: number;
};

export type HotelExtraKey = "dinner" | "porterage" | "beverages";
export type HotelExtraLine = {
  key: HotelExtraKey;
  label: string;
  amountPerPerson: number;
};
export type HotelExtrasBreakdown = {
  lines: HotelExtraLine[];
  totalPerPerson: number;
  warnings: string[];
};

function safeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function chargePerPerson(
  rawAmount: number | null | undefined,
  rawUnit: string | null | undefined,
  count: number,
  occupancy: 1 | 2 | 3,
): number | null {
  const amount = Math.max(0, safeNumber(rawAmount));
  switch ((rawUnit || "").toUpperCase()) {
    case "PER_PERSON":
    case "PER_PERSON_PER_STAY":
      return amount;
    case "PER_ROOM":
    case "PER_ROOM_PER_STAY":
      return amount / occupancy;
    case "PER_PERSON_PER_NIGHT":
      return amount * count;
    case "PER_ROOM_PER_NIGHT":
      return (amount * count) / occupancy;
    case "PER_MEAL":
    case "PER_PERSON_PER_MEAL":
      return amount * count;
    case "PER_ROOM_PER_MEAL":
      return (amount * count) / occupancy;
    default:
      return null;
  }
}

export function getHotelExtrasBreakdown(
  hotel: HotelExtrasInput,
  occupancy: 1 | 2 | 3,
): HotelExtrasBreakdown {
  const lines: HotelExtraLine[] = [];
  const warnings: string[] = [];
  if (!hotel.supplierRateId) return { lines, totalPerPerson: 0, warnings };

  const nights = Math.max(0, safeNumber(hotel.nights));
  const dinnerMeals = Math.max(0, Math.floor(safeNumber(hotel.supplierDinnerMeals)));
  const beverageMeals = Math.max(0, Math.floor(safeNumber(hotel.supplierBeverageMeals)));
  const isHalfBoard = /^(HB|HALF[ _-]?BOARD)$/i.test(
    hotel.supplierSelectedMealBasis || hotel.supplierMealBasis || "",
  );

  function add(
    key: HotelExtraKey,
    label: string,
    selected: boolean,
    price: number | null | undefined,
    unit: string | null | undefined,
    quantity: number,
  ) {
    if (!selected) return;
    if (price == null || !unit) {
      warnings.push(`${label}: selected service has no confirmed supplier price/unit.`);
      return;
    }
    const charge = chargePerPerson(price, unit, quantity, occupancy);
    if (charge === null) {
      warnings.push(`${label}: unsupported supplier unit ${unit}; confirm manually.`);
      return;
    }
    lines.push({ key, label, amountPerPerson: charge });
  }

  if (!isHalfBoard && hotel.supplierDinnerIncluded !== true) {
    add(
      "dinner",
      `Dinner (${dinnerMeals} meal${dinnerMeals === 1 ? "" : "s"})`,
      Boolean(hotel.supplierDinnerSelected),
      hotel.supplierDinnerAmount,
      hotel.supplierDinnerUnit,
      dinnerMeals,
    );
  }
  if (hotel.supplierPorterageAvailable !== false && hotel.supplierPorterageIncluded !== true) {
    add(
      "porterage",
      "Porterage",
      Boolean(hotel.supplierPorterageSelected),
      hotel.supplierPorterageAmount,
      hotel.supplierPorterageUnit,
      nights,
    );
  }
  if (hotel.supplierBeveragePackageIncluded !== true) {
    add(
      "beverages",
      `Beverage package (${beverageMeals} meal${beverageMeals === 1 ? "" : "s"})`,
      Boolean(hotel.supplierBeverageSelected),
      hotel.supplierBeveragePackageAmount,
      hotel.supplierBeveragePackageUnit,
      beverageMeals,
    );
  }

  return {
    lines,
    totalPerPerson: lines.reduce((sum, line) => sum + line.amountPerPerson, 0),
    warnings,
  };
}

/** Used directly by the quote pricing engine and the hotel display. */
export function optionalHotelExtrasPerPerson(
  hotel: HotelExtrasInput,
  occupancy: 1 | 2 | 3,
): number {
  return getHotelExtrasBreakdown(hotel, occupancy).totalPerPerson;
}
