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
  | { city: string; country?: string; ferry?: never; massRoom?: boolean; massDate?: string; hotelName?: string; nightCount?: number }
  | { city: ""; country?: never; ferry: { day: number; label: string }; massRoom?: never; massDate?: never; hotelName?: never; nightCount?: never });

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

export function itineraryDays(itinerary: string | null | undefined, requestedStart?: string) {
  const text = (itinerary ?? "").replace(/\*\*/g, "");
  const headings = [...text.matchAll(/^[\t ]*Day\s+(\d{1,2})\b[^\r\n]*/gim)];
  const dates = itineraryNightDates(headings, requestedStart);
  return headings.map((match, index) => ({
    day: Number(match[1]),
    heading: match[0],
    block: text.slice(match.index + match[0].length, headings[index + 1]?.index),
    date: dates[index].checkIn,
    nextDate: dates[index].checkOut,
  }));
}

export function itineraryTravelDates(itinerary: string | null | undefined) {
  const days = itineraryDays(itinerary);
  const first = days[0];
  const last = days.at(-1);
  if (days.length < 2 || first.day !== 1 || !first.date || !last?.date ||
      days.some(({day, date, nextDate}, index) => day !== index + 1 || !date || !nextDate)) return null;
  return {startDate: first.date, endDate: last.date};
}

export function itineraryProcurementStays(itinerary: string | null | undefined, destinations: string[], requestedStart?: string): ItineraryStay[] {
  const stays: ItineraryStay[] = [];
  let previousDay = 0;

  for (const {day, heading, block, date: checkIn, nextDate: checkOut} of itineraryDays(itinerary, requestedStart)) {
    const labeled = block.match(/^[\t ]*Overnight:[\t ]*(.+)$/im)?.[1];
    const content = `${heading}\n${block}`;
    const locations = [...(labeled ?? block).matchAll(labeled
      ? /\b(?:overnight(?:\s+stay)?|hotel)\s+in\s+([^\r\n.!?;]+)/gi
      : /\bovernight(?:\s+stay)?\s+(?:at\s+(?:your |the )?hotel\s+)?in\s+([^\r\n.!?;]+)/gi)];
    const ferry = content.match(/\bovernight\s+(?:ferry|cruise)\b(?:\s+to\s+([^.!?;\r\n]+))?/i);
    const onboardFerry = /\b(?:ferry|cruise)\b/i.test(content) &&
      /\b(?:overnight (?:on\s*board|at sea)|overnight:\s*(?:on\s*board|(?:the )?ferry|(?:the )?cruise))/i.test(content);
    if (!locations.length && (ferry || onboardFerry)) {
      const port = ferry?.[1] && cityCountry(ferry[1].trim())?.city;
      const headingOrigin = heading.match(/(?:[–—:]\s*|^Day\s+\d+\s*-\s*)([\p{L}\p{M} .’']+?)\s+[–—-]\s+overnight\s+(?:ferry|cruise)/iu)?.[1];
      const from = headingOrigin && cityCountry(headingOrigin)?.city;
      const label = from && port ? `Ferry: ${from} → ${port}` : port ? `Ferry to ${port}` : `Overnight ferry · Day ${day}`;
      stays.push({ city: "", ferry: { day, label }, checkIn, checkOut });
      continue;
    }
    const location = locations.at(-1)?.[1] ?? labeled;
    if (!location || /\b(?:ferry|cruise|onboard|on board|flight|aircraft|train|departure|no hotel|at sea|to be confirmed)\b/i.test(location)) continue;

    const place = cityCountry(location);
    if (!place) continue;
    const hotelName = block.match(/^[\t ]*(?:Accommodation|Hotel):[\t ]*([^\r\n]+)$/im)?.[1]?.trim();
    const property = hotelName && /\b(?:hotel|inn|resort|hilton|scandic|marriott|thon|radisson)\b/i.test(hotelName) &&
      !/\bor similar\b|\bto be confirmed\b|\bTBC\b/i.test(hotelName) ? hotelName : undefined;
    const massLine = block.match(/^[\t ]*Mass:[\t ]*([^\r\n]+)/im)?.[1] ??
      block.match(/(?:^|[.!?\n])\s*((?:celebrate|we celebrate|celebration of) Mass\b[^.!?\n]*)/i)?.[1] ?? "";
    const massRoom = /\b(?:at|in|inside)\s+(?:the\s+|our\s+)?hotel\b|\bprivate (?:meeting |function )?room\b/i.test(massLine) &&
      !/\b(?:no mass|optional|backup|if|alternative|or)\b/i.test(massLine);
    const previous = stays.at(-1);
    if (day === previousDay + 1 && previous && placeKey(previous.city) === placeKey(place.city) && (!property || !previous.hotelName || previous.hotelName === property)) {
      if (property && !previous.hotelName) previous.hotelName = property;
      if (massRoom && !previous.massRoom) {
        previous.massRoom = true;
        previous.massDate = checkIn;
      }
      previous.nightCount = (previous.nightCount ?? 0) + 1;
      previous.checkOut = previous.checkOut === checkIn ? checkOut : undefined;
    } else {
      stays.push({ ...place, checkIn, checkOut, nightCount: 1, ...(property ? {hotelName: property} : {}), ...(massRoom ? {massRoom, massDate: checkIn} : {}) });
    }
    previousDay = day;
  }

  if (stays.length) return stays;

  return destinations.map(value => value.trim()).filter(value => value && !countryNames.has(placeKey(value)))
    .map(value => cityCountry(value) ?? { city: value, country: undefined });
}
