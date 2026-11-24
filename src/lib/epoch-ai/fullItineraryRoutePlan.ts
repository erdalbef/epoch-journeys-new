import type { ItineraryDay } from "./itineraryReview";

export type ProposedRouteDay = {
  day: number;
  title: string;
  dayType: ItineraryDay["dayType"];
  stops: string[];
  source: "overnight-transition" | "not-established";
  unresolved: string[];
};

/** Conservative draft only. A title/description is NOT a machine-readable stop list. */
export function proposeFullItineraryRoutes(days: ItineraryDay[]): ProposedRouteDay[] {
  return days.map((day, index) => {
    const previous = index > 0 ? days[index - 1].overnightCity.trim() : "";
    const next = day.overnightCity.trim();
    const noDrivingProven = day.dayType === "flight_only";
    const distinct = Boolean(previous && next && previous.toLocaleLowerCase() !== next.toLocaleLowerCase());
    const stops = !noDrivingProven && distinct ? [previous, next] : [];
    const unresolved = noDrivingProven ? ["Flight-only day; airport transfers, if any, are not assessed."] : [
      ...(previous ? [] : ["Starting road location is not established from the previous overnight."]),
      ...(next ? [] : ["Final road location is not established from this overnight."]),
      "Intermediate visits, local transfers and return journeys have NOT been extracted; review against the itinerary text.",
    ];
    return { day: day.day, title: day.title, dayType: day.dayType,
      stops, source: distinct ? "overnight-transition" : "not-established", unresolved };
  });
}

export function summarizeOperationalFindings(warnings: string[]): { category: string; count: number; examples: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const warning of warnings) {
    const category = /restriction reported|critical restriction|route mismatch/i.test(warning) ? "Critical routing restrictions" :
      /coach|vehicle|parking|road access|dimensions/i.test(warning) ? "Coach and access verification" :
      /break|comfort|stop facilities/i.test(warning) ? "Rest breaks and facilities" :
      /lunch|mass|appointment|visits|buffer|daily schedule|daily time/i.test(warning) ? "Daily scheduling" :
      /missing|unavailable|unknown|not established|unverified|not extracted|not supplied/i.test(warning) ? "Missing evidence" : "Other operational findings";
    const existing = groups.get(category) ?? [];
    if (!existing.includes(warning)) existing.push(warning);
    groups.set(category, existing);
  }
  return [...groups.entries()].map(([category, examples]) => ({ category, count: examples.length, examples: examples.slice(0, 2) }));
}
