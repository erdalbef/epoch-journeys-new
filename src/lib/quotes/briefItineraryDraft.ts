import { itineraryDays } from "@/lib/epoch-ai/hotelStayCities";

type BriefItineraryTour = {id: string; itinerary: string | null; overviewItinerary: string | null};
export type QuoteBriefItinerary = {briefItinerary: string; warning?: string};
type SiteDay = {day: number; sites: string[]};

function readDays(itinerary: string | null) {
  return itineraryDays(itinerary?.replace(/^[\t ]*#{1,6}[\t ]+(?=(?:\*\*)?Day\s+\d)/gim, ""));
}

export function quoteItineraryDays(tour: BriefItineraryTour) {
  const detailed = readDays(tour.itinerary);
  const days = detailed.length ? detailed : readDays(tour.overviewItinerary);
  return new Set(days.map(day => day.day)).size === days.length ? days : [];
}

const optionalVisit = /\b(?:optional|if time permits|if available|subject to|to be confirmed|not included|tbc|tbd)\b/i;
const optionalLine = /^[\t ]*(?:[-*][\t ]*)?optional(?:[\t ]+[^\r\n:]*)?:[^\r\n]*/gim;
const explicitVisits = /^[\t ]*[-*]?[\t ]*(?:pilgrimage visit|shrine visit|visits?|sites? visited|sites|sightseeing):[\t ]*([^\r\n]+)/gim;

function siteName(value: string) {
  const name = value.trim().replace(/[.;]+$/, "");
  if (!/^[\p{L}\d][\p{L}\p{M}\d .,’'&()/\-–—]{1,119}$/u.test(name) ||
      /^(?:no (?:site|visit)s?|none|n\/?a|free time|airport transfer|panoramic (?:city )?tour)$/i.test(name) ||
      optionalVisit.test(name) || /^(?:visit|explore|continue|drive|walk|transfer)\s/i.test(name)) return "";
  return name;
}

const comparableText = (value: string) => value.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

function distinctNames(values: string[]): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    const name = siteName(value);
    const key = comparableText(name);
    if (key && !unique.has(key)) unique.set(key, name);
  }
  return [...unique.values()];
}

function formatDays(days: SiteDay[]) {
  return days.some(({sites}) => sites.length)
    ? days.map(({day, sites}) => sites.length ? `Day ${day}: ${sites.join(", ")}` : `Day ${day}`).join("\n")
    : "";
}

export function labeledQuoteBriefItinerary(tour: BriefItineraryTour): QuoteBriefItinerary {
  const days = quoteItineraryDays(tour);
  const briefItinerary = formatDays(days.map(({day, block}) => ({
    day, sites: distinctNames([...block.matchAll(explicitVisits)].flatMap(([, names]) => names.split(/\s*[;|,]\s*/))),
  })));
  const warning = !days.length ? "The tour needs distinct numbered day headings to prepare a day-by-day itinerary."
    : briefItinerary ? "Only explicitly labeled visits could be filled. Check the detailed itinerary for any remaining sites."
    : "Site names could not be filled from the saved tour. Review the detailed itinerary and enter the visit names.";
  return {briefItinerary, warning};
}

export function readQuoteBriefItinerary(
  days: ReturnType<typeof quoteItineraryDays>,
  output: unknown,
): QuoteBriefItinerary | null {
  if (!output || typeof output !== "object" || !("days" in output) || !Array.isArray(output.days)) return null;
  const proposed = new Map<number, string[]>();
  for (const row of output.days) {
    if (!row || typeof row !== "object" || !Number.isInteger(row.day) ||
        !Array.isArray(row.sites) || !row.sites.every((value: unknown) => typeof value === "string") ||
        proposed.has(row.day)) return null;
    proposed.set(row.day, row.sites);
  }
  let omittedUnsupportedNames = proposed.size !== days.length;
  const briefItinerary = formatDays(days.map(({day, heading, block}) => {
    const source = comparableText(`${heading}\n${block.replace(optionalLine, "")}`);
    const names = proposed.get(day) ?? [];
    const supported = names.filter(name => {
      const escaped = comparableText(siteName(name)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return escaped && new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "u").test(source);
    });
    if (supported.length < names.length || !proposed.has(day)) omittedUnsupportedNames = true;
    return {day, sites: distinctNames(supported)};
  }));
  if (!briefItinerary) return null;
  return {
    briefItinerary,
    ...(omittedUnsupportedNames ? {warning: "Check the stored itinerary for any visit names that could not be verified."} : {}),
  };
}

export async function fetchQuoteBriefItinerary(tour: BriefItineraryTour, signal: AbortSignal): Promise<QuoteBriefItinerary> {
  try {
    const response = await fetch("/api/admin/epoch-ai/quote-brief-itinerary", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({tourId: tour.id}), signal, cache: "no-store",
    });
    const data = await response.json() as QuoteBriefItinerary;
    if (response.ok && typeof data.briefItinerary === "string") return data;
  } catch (error) {
    if (signal.aborted) throw error;
  }
  return labeledQuoteBriefItinerary(tour);
}
