/**
 * Read-only presentation and overlap checks for supplier hotel extras.
 * This helper never calculates or modifies quotation costs.
 */
export type HotelExtraFacts = {
  hotelName?: string;
  destination?: string;
  supplierMealBasis?: string | null;
  supplierSelectedMealBasis?: "BB" | "HB";
  supplierDinnerIncluded?: boolean | null;
  supplierDinnerAmount?: number | null;
  supplierDinnerUnit?: string | null;
  supplierDinnerSelected?: boolean;
  supplierDinnerMeals?: number;
  supplierPorterageAvailable?: boolean | null;
  supplierPorterageIncluded?: boolean | null;
  supplierPorterageAmount?: number | null;
  supplierPorterageUnit?: string | null;
  supplierPorterageSelected?: boolean;
  supplierBeveragePackageIncluded?: boolean | null;
  supplierBeveragePackageAmount?: number | null;
  supplierBeveragePackageUnit?: string | null;
  supplierBeverageSelected?: boolean;
  supplierBeverageMeals?: number;
};

export type HotelExtraService = { label: string; category: string };

const offered = (amount?: number | null, unit?: string | null) =>
  amount != null && Number.isFinite(amount) && amount > 0 && Boolean(unit?.trim());

export function hotelExtraDisplay(hotel: HotelExtraFacts) {
  const hb = hotel.supplierSelectedMealBasis === "HB" ||
    (hotel.supplierSelectedMealBasis == null && /^(HB|HALF[ _-]?BOARD)$/i.test(hotel.supplierMealBasis || "")) ||
    hotel.supplierDinnerIncluded === true;
  return {
    hb,
    dinner: !hb && offered(hotel.supplierDinnerAmount, hotel.supplierDinnerUnit),
    porterage: hotel.supplierPorterageAvailable !== false &&
      hotel.supplierPorterageIncluded !== true &&
      offered(hotel.supplierPorterageAmount, hotel.supplierPorterageUnit),
    drinks: hotel.supplierBeveragePackageIncluded !== true &&
      offered(hotel.supplierBeveragePackageAmount, hotel.supplierBeveragePackageUnit),
    porterageIncluded: hotel.supplierPorterageIncluded === true,
    drinksIncluded: hotel.supplierBeveragePackageIncluded === true,
  };
}

const normalize = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function sameService(service: HotelExtraService, kind: "dinner" | "porterage" | "drinks") {
  const c = service.category.toUpperCase();
  const name = normalize(service.label);
  if (kind === "dinner") return c === "DINNER" || /\bdinner\b|\bevening meal\b/.test(name);
  if (kind === "porterage") return c === "PORTERAGE" || /\bporterage\b|\bluggage handling\b/.test(name);
  return c === "DRINKS" || /\bdrinks?\b|\bbeverages?\b/.test(name);
}

function namesThisHotel(service: HotelExtraService, hotel: HotelExtraFacts) {
  const label = ` ${normalize(service.label)} `;
  const names = [hotel.destination, hotel.hotelName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalize).filter(value => value.length >= 4);
  return names.some(name => label.includes(` ${name} `));
}

/**
 * Potential overlaps only, never proof of duplicate charges. A generic dinner
 * row is not considered a duplicate of an HB hotel: it may be for another city.
 */
export function hotelExtraOverlapWarnings(
  hotel: HotelExtraFacts,
  perPersonServices: HotelExtraService[] = [],
): string[] {
  const display = hotelExtraDisplay(hotel);
  const warnings: string[] = [];
  const place = hotel.hotelName || hotel.destination || "this hotel";

  const checks: Array<{
    kind: "dinner" | "porterage" | "drinks";
    active: boolean;
    included: boolean;
  }> = [
    { kind: "dinner", active: display.dinner && Boolean(hotel.supplierDinnerSelected) && Number(hotel.supplierDinnerMeals || 0) > 0, included: display.hb },
    { kind: "porterage", active: display.porterage && Boolean(hotel.supplierPorterageSelected), included: display.porterageIncluded },
    { kind: "drinks", active: display.drinks && Boolean(hotel.supplierBeverageSelected) && Number(hotel.supplierBeverageMeals || 0) > 0, included: display.drinksIncluded },
  ];

  for (const check of checks) {
    if (!check.active && !check.included) continue;
    const matches = perPersonServices.filter(service => sameService(service, check.kind));
    if (!matches.length) continue;
    // Generic dinners or drinks may be at a restaurant or different stop.
    // Porterage, however, often covers an entire hotel stay; flag a potential
    // overlap even when its generic catalogue label omits the hotel's name.
    const atThisHotel = matches.filter(service => namesThisHotel(service, hotel));
    if (check.included && !check.active && !atThisHotel.length && check.kind !== "porterage") continue;
    const names = (atThisHotel.length ? atThisHotel : matches).map(x => x.label).join(", ");
    warnings.push(`Possible overlap at ${place}: ${check.kind} ${check.active ? "is selected at this hotel" : "is included in this hotel's rate"} and also appears in Per-Person Services (${names}). This may be a legitimate restaurant or other-hotel service; verify its location and dates. No charge was removed.`);
  }

  // Do not silently hide historical selected extras that no longer have a
  // usable supplier price. The saved snapshot should be reviewed by Admin.
  if (hotel.supplierDinnerSelected && !display.dinner && !display.hb) {
    warnings.push(`Selected hotel dinner at ${place} has no usable priced supplier offering. Review the saved rate and extras.`);
  }
  if (hotel.supplierPorterageSelected && !display.porterage && !display.porterageIncluded) {
    warnings.push(`Selected hotel porterage at ${place} has no usable priced supplier offering. Review the saved rate and extras.`);
  }
  if (hotel.supplierBeverageSelected && !display.drinks && !display.drinksIncluded) {
    warnings.push(`Selected hotel drinks at ${place} have no usable priced supplier offering. Review the saved rate and extras.`);
  }
  return warnings;
}
