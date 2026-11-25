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

type ItineraryStay =
  | { city: string; country?: string; ferry?: never }
  | { city: ""; country?: never; ferry: { day: number; label: string } };

export function itineraryProcurementStays(itinerary: string | null | undefined, destinations: string[]): ItineraryStay[] {
  const text = (itinerary ?? "").replace(/\*\*/g, "");
  const headings = [...text.matchAll(/^[\t ]*Day\s+(\d{1,2})\b[^\r\n]*/gim)];
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
      stays.push({ city: "", ferry: { day, label } });
      continue;
    }
    const location = locations.at(-1)?.[1] ?? labeled;
    if (!location || /\b(?:ferry|cruise|onboard|on board|flight|aircraft|train|departure|no hotel|at sea|to be confirmed)\b/i.test(location)) continue;

    const place = cityCountry(location);
    if (!place) continue;
    if (day !== previousDay + 1 || placeKey(stays.at(-1)?.city ?? "") !== placeKey(place.city)) {
      stays.push(place);
    }
    previousDay = day;
  }

  if (stays.length) return stays;

  return destinations.map(value => value.trim()).filter(value => value && !countryNames.has(placeKey(value)))
    .map(value => cityCountry(value) ?? { city: value, country: undefined });
}
