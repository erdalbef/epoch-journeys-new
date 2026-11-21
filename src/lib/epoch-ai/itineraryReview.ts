/** Deterministic, client- and server-safe review of an AI itinerary draft.
 * Not a geospatial or travel-time validator. No remote data access.
 */
export type FlightConvention = "usa_outbound" | "arrival_day1";
export type ItineraryDayType = "flight_only" | "arrival" | "touring" | "transfer" | "departure";

export type ItineraryDay = {
  day: number;
  dayType: ItineraryDayType;
  title: string;
  description: string;
  overnightCity: string;
  overnight: string;
  massPlan: string;
  lunchPlan: string;
  comfortBreakPlan: string;
  logistics: string;
};

export type ItineraryDraft = {
  journeyOverview: string;
  days: ItineraryDay[];
  reviewNotes: string[];
};

export type ItineraryReview = {
  blocking: string[];
  cautions: string[];
  hotelNights: number;
  expectedHotelNights: number;
};

/** Detect explicit stated total such as '12-day tour' or '12 days'. */
export function explicitDaysFromBrief(text: string): number | null {
  const match = text.match(/\b(\d{1,2})\s*(?:-|\s)\s*days?\b/i);
  return match ? Number(match[1]) : null;
}

function normalized(text: string) {
  return text.trim().toLocaleLowerCase("en-US").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function reviewItinerary(draft: ItineraryDraft, duration: number, convention: FlightConvention, arrivalCity = "", departureCity = "", destinations = ""): ItineraryReview {
  const blocking: string[] = [];
  const cautions: string[] = [];
  const expectedHotelNights = duration - (convention === "usa_outbound" ? 2 : 1);
  if (draft.days.length !== duration) {
    blocking.push(`Requested ${duration} days but AI returned ${draft.days.length}.`);
  }
  if (draft.days.some((day, index) => day.day !== index + 1)) blocking.push("Day numbering is not consecutive from Day 1.");
  const first = draft.days[0];
  const last = draft.days[draft.days.length - 1];
  if (first && convention === "usa_outbound" && first.dayType !== "flight_only") blocking.push("Day 1 must be the USA overnight outbound flight.");
  if (first && convention === "arrival_day1" && first.dayType !== "arrival") blocking.push("Day 1 must be the arrival day (no outbound flight day selected).");
  if (last && last.dayType !== "departure") blocking.push(`Day ${duration} must be the departure day.`);
  const nightDays = draft.days.filter((day) => Boolean(day.overnightCity.trim()));
  const hotelNights = nightDays.length;
  if (hotelNights !== expectedHotelNights) blocking.push(`Hotel-night count is ${hotelNights}; expected ${expectedHotelNights} for the selected travel-day convention.`);
  if (first && convention === "usa_outbound" && first.overnightCity.trim()) blocking.push("Outbound flight-only day must not have a hotel overnight.");
  if (last?.overnightCity.trim()) blocking.push("Final departure day must not have a hotel overnight.");

  const arrivalDayIndex = convention === "usa_outbound" ? 1 : 0;
  const arrivalDay = draft.days[arrivalDayIndex];
  if (arrivalDay && arrivalCity.trim() && !normalized(`${arrivalDay.title} ${arrivalDay.description} ${arrivalDay.overnightCity}`).includes(normalized(arrivalCity))) {
    cautions.push(`Arrival city (${arrivalCity}) does not clearly appear on Day ${arrivalDayIndex + 1}. Check the route.`);
  }
  if (last && departureCity.trim() && !normalized(`${last.title} ${last.description} ${last.logistics}`).includes(normalized(departureCity))) {
    cautions.push(`Departure city (${departureCity}) does not clearly appear on the last day. Check the airport transfer.`);
  }

  const allDayText = normalized(draft.days.map((day) => `${day.title} ${day.description} ${day.overnightCity}`).join(" "));
  const stopNames = destinations.split(/[,;]+/).map((part) => part.trim()).filter((part) => part.length >= 3);
  const absentStops = stopNames.filter((name) => !allDayText.includes(normalized(name)));
  if (absentStops.length) cautions.push(`Tour Identity destinations not explicitly mentioned in the day program: ${absentStops.join(", ")}. Verify they are covered (country-only labels may be implied).`);

  const bases: { city: string; nights: number }[] = [];
  for (const day of nightDays) {
    const city = normalized(day.overnightCity);
    const previous = bases[bases.length - 1];
    if (previous?.city === city) previous.nights += 1;
    else bases.push({ city, nights: 1 });
  }
  const oneNightStops = bases.filter((stop) => stop.nights === 1).length;
  if (oneNightStops >= 3) cautions.push(`${oneNightStops} one-night hotel stays; review whether any can be combined into two-night bases without creating detours.`);
  for (const day of draft.days) {
    if (day.dayType === "flight_only" || day.dayType === "departure") continue;
    if (!day.massPlan.trim()) cautions.push(`Day ${day.day}: no Mass plan provided.`);
    const massMentions = (day.massPlan.match(/\bmass\b/gi) ?? []).length;
    if (massMentions >= 2 && !/\bor\b/i.test(day.massPlan)) cautions.push(`Day ${day.day}: Mass plan may include more than one Mass; one per day is sufficient.`);
    if (day.dayType !== "arrival" && !/\b90\s*(?:min|minute)|\b1[.,]5\s*h|\bone\s+and\s+a\s+half\s+hour|\b1\s*h(?:our)?\s*30\s*min/i.test(day.lunchPlan)) {
      cautions.push(`Day ${day.day}: lunch plan does not clearly allow at least 90 minutes.`);
    }
    if (day.dayType === "transfer" && !day.comfortBreakPlan.trim()) cautions.push(`Day ${day.day}: coach comfort-break plan missing.`);
  }
  return { blocking, cautions, hotelNights, expectedHotelNights };
}
