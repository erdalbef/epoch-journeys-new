import { hotelSourceMatch, type EvidenceFinding } from "./hotelEvidenceResearch";
import { categoryForEmail } from "./hotelOfficialPageExtraction";
import type { HotelOfficialSiteCandidate } from "./hotelOfficialSiteSelection";
import type { HotelContactCandidate } from "./hotelStructuredResearch";
import type { WebHotelResult } from "./hotelWebResearch";

const facilities = [
  { id: "showers", label: "Walk-in showers", pattern: /\b(?:walk.in|roll.in) showers?\b/i },
  { id: "lifts", label: "Lifts or elevators", pattern: /\b(?:lifts?|elevators?)\b/i },
  { id: "coach", label: "Coach access and luggage drop-off", pattern: /\b(?:coach|motorcoach|tour bus|bus)\s+(?:parking|access|drop.off)\b|\b(?:luggage|baggage)\s+(?:drop.off|unloading)\b/i },
  { id: "porterage", label: "Porterage", pattern: /\b(?:porterage|bellhop|bell\s+(?:desk|service)|luggage assistance)\b/i },
  { id: "mass", label: "Private room for Mass", pattern: /\b(?:meeting rooms?|private function rooms?|conference rooms?|chapel)\b/i }
] as const;

type PhoneEvidence = { number: string; sourceUrl: string };

export type HotelSupplierResearch = {
  contacts: (HotelContactCandidate & {
    category: ReturnType<typeof categoryForEmail>;
    phone?: PhoneEvidence;
  })[];
  phone?: PhoneEvidence;
  suggestedFacilitiesSource?: string;
  facilities: {
    id: typeof facilities[number]["id"];
    label: string;
    evidence?: { excerpt: string; sourceUrl: string };
  }[];
};

const categoryRank = {groups: 0, sales: 1, reservations: 2, general: 3};

const locationWords = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

export function buildHotelSupplierResearch(
  hotelName: string,
  city: string,
  pages: WebHotelResult[],
  officialCandidates: HotelOfficialSiteCandidate[],
  contacts: HotelContactCandidate[],
  findings: EvidenceFinding[]
): HotelSupplierResearch {
  const officialUrls = new Set(officialCandidates.map(candidate => candidate.sourceUrl));
  const cityKey = locationWords(city);
  const sources = pages.filter(page => officialUrls.has(page.url) &&
    hotelSourceMatch(hotelName, {...page, description: ""}) &&
    ` ${locationWords(`${page.title} ${page.url} ${page.description}`)} `.includes(` ${cityKey} `));
  const phones = new Map<string, PhoneEvidence>();

  for (const page of sources) {
    const phone = page.description.match(/\b(?:contact us|kontakta oss|telefon|telephone|phone|tel\.?|t:)\s*:?\s*(\+\d[\d ().-]{6,24}\d)/i)?.[1];
    if (phone && phone.replace(/\D/g, "").length <= 15) {
      phones.set(page.url, {number: phone, sourceUrl: page.url});
    }
  }

  const sourceUrls = new Set(sources.map(page => page.url));
  const ranked = contacts
    .filter(contact => sourceUrls.has(contact.sourceUrl))
    .map(contact => ({...contact, category: categoryForEmail(contact.email), phone: phones.get(contact.sourceUrl)}))
    .sort((a, b) => categoryRank[a.category] - categoryRank[b.category] ||
      Number(Boolean(b.phone)) - Number(Boolean(a.phone)));

  const publishedFacilities = facilities.map(({id, label, pattern}) => {
    for (const page of sources) {
      for (const excerpt of page.description.split(" … ")) {
        const match = pattern.exec(excerpt);
        if (!match) continue;
        return {
          id,
          label,
          evidence: {excerpt: excerpt.slice(Math.max(0, match.index - 65), match.index + match[0].length + 100), sourceUrl: page.url}
        };
      }
    }
    return {id, label};
  });

  const uniqueContacts = new Map<string, typeof ranked[number]>();
  for (const contact of ranked) {
    if (!uniqueContacts.has(contact.email)) uniqueContacts.set(contact.email, contact);
  }

  return {
    contacts: [...uniqueContacts.values()].slice(0, 3),
    phone: phones.values().next().value,
    suggestedFacilitiesSource: publishedFacilities.find(item => item.evidence)?.evidence?.sourceUrl ??
      findings.find(item => (item.topic === "facilities" || item.topic === "accessibility") &&
        sourceUrls.has(item.sourceUrl))?.sourceUrl,
    facilities: publishedFacilities
  };
}
