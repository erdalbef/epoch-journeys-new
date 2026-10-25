/**
 * Epoch Journeys - read-only meal quantity checks.
 * These results are UI/approval-readiness signals, NOT a second cost engine.
 * The pricing engine and saved quotation monetary snapshots are unchanged.
 */

export type MealServiceRow = {
  category: string;
  quantity: number;
  label?: string;
};

export type MealHotelRow = {
  stayType: "CORE" | "PRE" | "POST";
  nights: number;
  hotelName?: string;
  destination?: string;
  supplierId?: string;
  supplierServiceId?: string;
  supplierRateId?: string;
  singlePerPerson?: number;
  doubleTwinPerPerson?: number;
  triplePerPerson?: number;
  supplierDinnerSelected?: boolean;
  supplierDinnerMeals?: number;
  supplierMealBasis?: string | null;
  supplierSelectedMealBasis?: "BB" | "HB";
  supplierDinnerIncluded?: boolean | null;
};

export type MealQuantityResult = {
  coreNights: number;
  eligibleLunchDays: number | null;
  dinnerLimit: number | null;
  lunchCount: number;
  restaurantDinnerCount: number;
  hotelDinnerCount: number;
  purchasedDinnerCount: number;
  includedHbDinners: number;
  lunchBasis: "HOTEL_NIGHTS" | "TRAVEL_DATES" | "UNAVAILABLE";
  errors: string[];
  warnings: string[];
};

function wholeNonnegative(input: unknown): number {
  const number = typeof input === "number" ? input : NaN;
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function countMeals(input: unknown): number {
  return typeof input === "number" && Number.isFinite(input) && input > 0 ? input : 0;
}

function inclusiveTravelDays(start?: string, end?: string): number | null {
  // Strict date-only parsing avoids timezone/locale DST differences.
  if (!start || !end) return null;
  const parse = (value: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const d = new Date(timestamp);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return null;
    return timestamp;
  };
  const first = parse(start);
  const last = parse(end);
  if (first === null || last === null || last < first) return null;
  return Math.floor((last - first) / 86_400_000) + 1;
}

function isHb(hotel: MealHotelRow): boolean {
  return hotel.supplierDinnerIncluded === true ||
    hotel.supplierSelectedMealBasis === "HB" ||
    /^(HB|HALF[ _-]?BOARD)$/i.test(hotel.supplierMealBasis?.trim() || "");
}

/**
 * New quotation forms start with an empty hotel row whose default nights=1.
 * An untouched placeholder is not an actual booked or planned hotel stay.
 * Count a stay only after it contains identifying or rate information.
 */
function isConfiguredHotelStay(hotel: MealHotelRow): boolean {
  const hasHotelDetails = [
    hotel.hotelName,
    hotel.destination,
    hotel.supplierId,
    hotel.supplierServiceId,
    hotel.supplierRateId,
    hotel.supplierMealBasis,
  ].some(value => typeof value === "string" && value.trim().length > 0);
  const hasAccommodationRate = [
    hotel.singlePerPerson,
    hotel.doubleTwinPerPerson,
    hotel.triplePerPerson,
  ].some(value => typeof value === "number" && Number.isFinite(value) && value > 0);
  return hasHotelDetails || hasAccommodationRate ||
    hotel.supplierSelectedMealBasis === "BB" ||
    hotel.supplierSelectedMealBasis === "HB" ||
    hotel.supplierDinnerSelected === true ||
    hotel.supplierDinnerIncluded === true;
}

export function validateMealQuantities(input: {
  services: readonly MealServiceRow[];
  hotels: readonly MealHotelRow[];
  startDate?: string;
  endDate?: string;
}): MealQuantityResult {
  const coreHotels = input.hotels.filter(hotel =>
    hotel.stayType === "CORE" && wholeNonnegative(hotel.nights) > 0 && isConfiguredHotelStay(hotel)
  );
  const coreNights = coreHotels.reduce((total, hotel) => total + wholeNonnegative(hotel.nights), 0);
  const span = inclusiveTravelDays(input.startDate, input.endDate);
  // Authoritative meal limits are based ONLY on real CORE hotel stays.
  // Flight-only first days and destination dates cannot affect meal quantities.
  // No hotel nights means no guessed allowance, even when travel dates exist.
  const eligibleLunchDays = coreNights > 0 ? Math.max(0, coreNights - 1) : null;
  const dinnerLimit = coreNights > 0 ? coreNights : null;
  const lunchBasis: MealQuantityResult["lunchBasis"] = coreNights > 0 ? "HOTEL_NIGHTS" : "UNAVAILABLE";

  const lunchCount = input.services.filter(row => row.category === "LUNCH")
    .reduce((total, row) => total + countMeals(row.quantity), 0);
  const restaurantDinnerCount = input.services.filter(row => row.category === "DINNER")
    .reduce((total, row) => total + countMeals(row.quantity), 0);
  const hotelDinnerCount = coreHotels.filter(row => row.supplierDinnerSelected)
    .reduce((total, row) => total + countMeals(row.supplierDinnerMeals), 0);
  const purchasedDinnerCount = restaurantDinnerCount + hotelDinnerCount;
  const includedHbDinners = coreHotels.filter(isHb)
    .reduce((total, row) => total + wholeNonnegative(row.nights), 0);

  const errors: string[] = [];
  const warnings: string[] = [];
  if (eligibleLunchDays !== null && lunchCount > eligibleLunchDays) {
    errors.push(`Lunches: ${lunchCount} entered; maximum ${eligibleLunchDays} eligible on-ground lunch days (arrival and departure excluded).`);
  }
  if (dinnerLimit !== null && purchasedDinnerCount > dinnerLimit) {
    errors.push(`Dinners: ${purchasedDinnerCount} paid meals entered (${restaurantDinnerCount} separate + ${hotelDinnerCount} hotel); maximum ${dinnerLimit} core-tour nights.`);
  }
  coreHotels.forEach(hotel => {
    if (hotel.supplierDinnerSelected && countMeals(hotel.supplierDinnerMeals) > wholeNonnegative(hotel.nights)) {
      errors.push(`Hotel dinners at ${hotel.hotelName?.trim() || "unnamed hotel"}: ${hotel.supplierDinnerMeals} selected for ${hotel.nights} nights.`);
    }
  });
  const fractionalMeal = input.services.some(row => (row.category === "LUNCH" || row.category === "DINNER") && row.quantity > 0 && !Number.isInteger(row.quantity)) ||
    coreHotels.some(row => row.supplierDinnerSelected && (row.supplierDinnerMeals ?? 0) > 0 && !Number.isInteger(row.supplierDinnerMeals));
  if (fractionalMeal) errors.push("Meal quantities must be whole numbers.");

  // HB is included in accommodation. User may intentionally book a restaurant
  // on an HB night; warn, but do not reduce the purchased-dinner allowance.
  if (coreNights > 0 && purchasedDinnerCount > 0 && includedHbDinners > 0 &&
    purchasedDinnerCount + includedHbDinners > coreNights) {
    warnings.push(`${includedHbDinners} HB dinner(s) are included in hotel rates; ${purchasedDinnerCount} separately purchased dinner(s) may overlap an HB evening. Confirm the actual itinerary dates before approval.`);
  }
  if ((lunchCount > 0 || purchasedDinnerCount > 0) && coreNights === 0) {
    warnings.push("Enter actual core hotel stays and nights to verify meal quantities. Travel dates do not set meal limits.");
  }
  // Travel dates are a cross-check ONLY, never a meal-allowance input.
  // Example: 29 Oct - 6 Nov spans eight overnight slots; seven hotel
  // nights are valid when the first night is spent on an outbound flight.
  if (span !== null && coreNights > 0) {
    const maximumCalendarNights = span - 1;
    if (coreNights > maximumCalendarNights) {
      errors.push(`Core hotel nights (${coreNights}) exceed the ${maximumCalendarNights} nights between the tour start and end dates. Check hotel stays and travel dates.`);
    } else if (maximumCalendarNights - coreNights >= 2) {
      warnings.push(`Travel dates allow ${maximumCalendarNights} overnight slots, but only ${coreNights} core hotel nights are entered. Verify any flight-only, transit or unentered hotel nights.`);
    }
  }

  return {
    coreNights, eligibleLunchDays, dinnerLimit, lunchCount,
    restaurantDinnerCount, hotelDinnerCount, purchasedDinnerCount,
    includedHbDinners, lunchBasis, errors, warnings,
  };
}
