const regionNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
const countryNames = new Set(["kosovo", "czech republic", "turkey", "united states of america", "usa", "uk"]);

function placeKey(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

for (const first of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  for (const second of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const name = regionNames.of(first + second);
    if (name) countryNames.add(placeKey(name));
  }
}

const knownCountries: Record<string, string> = {
  helsinki: "Finland", stockholm: "Sweden", jonkoping: "Sweden",
  copenhagen: "Denmark", oslo: "Norway", reykjavik: "Iceland",
};

export function hotelStayCountry(city: string) {
  return knownCountries[placeKey(city)];
}

function cityCountry(value: string) {
  const [city = "", country] = value.trim().split(/\s*[,(/]\s*/, 2);
  if (!city || countryNames.has(placeKey(city))) return null;
  if (!/^[\p{L}][\p{L}\p{M} .’'\-]{0,79}$/u.test(city)) return null;
  const countryText = country?.replace(/\)$/, "").trim();
  return { city: city.trim(), country: countryText && countryNames.has(placeKey(countryText))
    ? countryText : hotelStayCountry(city) };
}

type StayDates = { checkIn?: string; checkOut?: string };
type ItineraryStay = StayDates & (
  | { city: string; country?: string; ferry?: never }
  | { city: ""; country?: never; ferry: { day: number; label: string } });

const dayMilliseconds = 86_400_000;
const shortMonths = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
const monthPattern = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const namedDate = new RegExp(
  `\\b(?:(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?|(?:([0-9]{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})))\\s*,?\\s+(\\d{4})\\b`,
  "i",
);

function headingDate(heading: string): number | null | undefined {
  const iso = heading.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const named = heading.match(namedDate);
  if (!iso && !named) return undefined;

  const year = Number(iso?.[1] ?? named?.[5]);
  const month = iso ? Number(iso[2]) - 1 : shortMonths.indexOf((named![1] || named![4]).slice(0, 3).toLowerCase());
  const day = Number(iso?.[3] ?? (named![2] || named![3]));
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day
    ? date.getTime() : null;
}

function itineraryNightDates(headings: RegExpMatchArray[], requestedStart?: string): StayDates[] {
  const days = headings.map(match => Number(match[1]));
  const dates = headings.map(match => headingDate(match[0]));
  const anchor = dates.findIndex(date => typeof date === "number");
  if (requestedStart !== undefined) {
    const start = headingDate(requestedStart);
    if (typeof start !== "number") return days.map(() => ({}));
    if (days.some((day, index) => day < 1 || (index > 0 && day !== days[index - 1] + 1))) {
      return days.map(() => ({}));
    }
    const toDate = (time: number) => new Date(time).toISOString().slice(0, 10);
    return days.map(day => ({
      checkIn: toDate(start + (day - 1) * dayMilliseconds),
      checkOut: toDate(start + day * dayMilliseconds),
    }));
  }
  const start = anchor === -1 ? undefined : dates[anchor]! - (days[anchor] - 1) * dayMilliseconds;
  const consistent = start !== undefined && days.every((day, index) =>
    day >= 1 && (index === 0 || day === days[index - 1] + 1) &&
    (dates[index] === undefined || dates[index] === start + (day - 1) * dayMilliseconds)
  );
  const iso = (time: number) => new Date(time).toISOString().slice(0, 10);

  return days.map((day, index) => {
    const date = dates[index];
    const next = dates[index + 1];
    if (consistent) {
      const checkIn = start + (day - 1) * dayMilliseconds;
      return { checkIn: iso(checkIn), checkOut: iso(checkIn + dayMilliseconds) };
    }
    if (typeof date === "number" && days[index + 1] === day + 1 && next === date + dayMilliseconds) {
      return { checkIn: iso(date), checkOut: iso(next) };
    }
    return {};
  });
}

export function itineraryProcurementStays(itinerary: string | null | undefined, destinations: string[], requestedStart?: string): ItineraryStay[] {
  const text = (itinerary ?? "").replace(/\*\*/g, "");
  const headings = [...text.matchAll(/^[\t ]*Day\s+(\d{1,2})\b[^\r\n]*/gim)];
  const dates = itineraryNightDates(headings, requestedStart);
  const stays: ItineraryStay[] = [];
  let previousDay = 0;

  for (const [index, heading] of headings.entries()) {
    const day = Number(heading[1]);
    const block = text.slice(heading.index + heading[0].length, headings[index + 1]?.index);
    const labeled = block.match(/^[\t ]*Overnight:[\t ]*(.+)$/im)?.[1];
    const content = `${heading[0]}\n${block}`;
    const locations = [...(labeled ?? block).matchAll(labeled
      ? /\b(?:overnight(?:\s+stay)?|hotel)\s+in\s+([^\r\n.!?;]+)/gi
      : /\bovernight(?:\s+stay)?\s+(?:at\s+(?:your |the )?hotel\s+)?in\s+([^\r\n.!?;]+)/gi)];
    const ferry = content.match(/\bovernight\s+(?:ferry|cruise)\b(?:\s+to\s+([^.!?;\r\n]+))?/i);
    const onboardFerry = /\b(?:ferry|cruise)\b/i.test(content) &&
      /\b(?:overnight (?:on\s*board|at sea)|overnight:\s*(?:on\s*board|(?:the )?ferry|(?:the )?cruise))/i.test(content);
    if (!locations.length && (ferry || onboardFerry)) {
      const port = ferry?.[1] && cityCountry(ferry[1].trim())?.city;
      const headingOrigin = heading[0].match(/(?:[–—:]\s*|^Day\s+\d+\s*-\s*)([\p{L}\p{M} .’']+?)\s+[–—-]\s+overnight\s+(?:ferry|cruise)/iu)?.[1];
      const from = headingOrigin && cityCountry(headingOrigin)?.city;
      const label = from && port ? `Ferry: ${from} → ${port}` : port ? `Ferry to ${port}` : `Overnight ferry · Day ${day}`;
      stays.push({ city: "", ferry: { day, label }, ...dates[index] });
      continue;
    }
    const location = locations.at(-1)?.[1] ?? labeled;
    if (!location || /\b(?:ferry|cruise|onboard|on board|flight|aircraft|train|departure|no hotel|at sea|to be confirmed)\b/i.test(location)) continue;

    const place = cityCountry(location);
    if (!place) continue;
    const previous = stays.at(-1);
    if (day === previousDay + 1 && previous && placeKey(previous.city) === placeKey(place.city)) {
      previous.checkOut = previous.checkOut === dates[index].checkIn ? dates[index].checkOut : undefined;
    } else {
      stays.push({ ...place, ...dates[index] });
    }
    previousDay = day;
  }

  if (stays.length) return stays;

  return destinations.map(value => value.trim()).filter(value => value && !countryNames.has(placeKey(value)))
    .map(value => cityCountry(value) ?? { city: value, country: undefined });
}
