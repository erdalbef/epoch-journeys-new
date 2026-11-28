import { publishedHotelVerification } from "./hotelPublicVerification";
import { hotelSourceMatch, type EvidenceFinding } from "./hotelEvidenceResearch";
import { categoryForEmail } from "./hotelOfficialPageExtraction";
import { officialHotelSearchDomain, type HotelOfficialSiteCandidate } from "./hotelOfficialSiteSelection";
import type { HotelContactCandidate } from "./hotelStructuredResearch";
import { safePublicUrl, type WebHotelResult } from "./hotelWebResearch";

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
    corroboratingSourceUrl?: string;
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
const internationalPhone = "\\+\\d[\\d ().-]{6,24}\\d";
const labeledPhone = new RegExp(
  `\\b(?:contact us|kontakta oss|telefon|telephone|phone|call|sími|tel\\.?|t:)\\s*:?\\s*(${internationalPhone})`, "i",
);
const phoneBeforeEmail = new RegExp(`(${internationalPhone})[\\s,;|–—.-]*(?:e-?mail\\s*:?\\s*)?$`, "i");
const phoneAfterEmail = new RegExp(`^[\\s,;|–—.-]*(?:tel\\.?\\s*:?\\s*)?(${internationalPhone})`, "i");

function normalizePhone(value?: string) {
  const number = value?.replace(/^(\+\d{1,3})\s*\(0\)\s*/, "$1 ");
  return number && number.replace(/\D/g, "").length <= 15 ? number : undefined;
}

function publishedContactPhone(description: string, email: string) {
  for (const excerpt of description.split(" … ")) {
    const start = excerpt.toLowerCase().indexOf(email.toLowerCase());
    if (start === -1) continue;
    const end = start + email.length;
    if (/[a-z0-9._%+-]/i.test(excerpt[start - 1] ?? "") ||
        /^(?:[a-z0-9_%+-]|\.[a-z0-9])/i.test(excerpt.slice(end))) continue;
    const before = excerpt.slice(Math.max(0, start - 72), start).match(phoneBeforeEmail)?.[1];
    const after = excerpt.slice(end, end + 72).match(phoneAfterEmail)?.[1];
    const phone = normalizePhone(before ?? after);
    if (phone) return phone;
  }
}

const locationWords = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .replace(/\bprishtin[ae]\b/g, "pristina")
  .trim();

function publisherLabel(host: string) {
  const labels = host.split(".");
  const last = labels.at(-1);
  const second = labels.at(-2);
  return last?.length === 2 && second && /^(?:ac|co|com|edu|gov|net|org)$/.test(second)
    ? labels.at(-3) : second;
}

function corroboratedDirectoryContacts(hotelName: string, cityKey: string, pages: WebHotelResult[]) {
  const matched = new Map<string, {contact: HotelSupplierResearch["contacts"][number]; host: string; dedicated: boolean}[]>();
  const emailPattern = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
  for (const page of pages) {
    const sourceUrl = safePublicUrl(page.url);
    if (!sourceUrl) continue;
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    const dedicated = hotelSourceMatch(hotelName, {...page, description: ""});
    const titleHasCity = ` ${locationWords(page.title + " " + page.url)} `.includes(` ${cityKey} `);
    for (const excerpt of page.description.split(" … ")) {
      if (!titleHasCity && !` ${locationWords(excerpt)} `.includes(` ${cityKey} `)) continue;
      if (!dedicated && !hotelSourceMatch(hotelName, {...page, description: excerpt})) continue;
      const emails = [...new Set((excerpt.match(emailPattern) ?? []).map(email => email.toLowerCase()))];
      if (emails.length !== 1) continue;
      const [email] = emails;
      const emailHost = email.split("@")[1];
      if (emailHost === host || host.endsWith("." + emailHost) || emailHost.endsWith("." + host)) continue;
      const number = dedicated ? publishedContactPhone(excerpt, email) ?? normalizePhone(excerpt.match(labeledPhone)?.[1]) : undefined;
      const contact = {
        email, sourceUrl, sourceTitle: page.title, category: categoryForEmail(email),
        status: "requires-admin-verification" as const,
        phone: number ? {number, sourceUrl} : undefined,
      };
      const sources = matched.get(email) ?? [];
      sources.push({contact, host, dedicated});
      matched.set(email, sources);
    }
  }

  // Require a property page and a second publisher. Two pages on the same
  // host (including its subdomains) are not independent evidence.
  return [...matched.values()].flatMap(sources => {
    const primary = sources.filter(source => source.dedicated)
      .sort((a, b) => Number(Boolean(b.contact.phone)) - Number(Boolean(a.contact.phone)))[0];
    if (!primary) return [];
    const other = sources.find(source =>
      publisherLabel(source.host) !== publisherLabel(primary.host) &&
      !source.host.endsWith("." + primary.host) && !primary.host.endsWith("." + source.host));
    return other ? [{...primary.contact, corroboratingSourceUrl: other.contact.sourceUrl}] : [];
  }).sort((a, b) => categoryRank[a.category] - categoryRank[b.category]);
}

function hotelDirectoryContacts(hotelName: string, cityKey: string, pages: WebHotelResult[], propertyMatched: boolean) {
  const domain = officialHotelSearchDomain(hotelName);
  if (!domain) return [];
  const name = hotelName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const row = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${name}\\s*[:|–—-]?\\s*(?:tel(?:ephone)?\\.?|tlf\\.?|phone)?\\s*:?\\s*` +
    `(${internationalPhone})\\s*[/|,;–—-]?\\s*(?:e-?mail\\s*:?\\s*)?([a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,})`, "iu",
  );
  return pages.flatMap(source => {
    const sourceUrl = safePublicUrl(source.url);
    if (!sourceUrl) return [];
    const host = new URL(sourceUrl).hostname;
    if (host !== domain && !host.endsWith("." + domain)) return [];
    if (!propertyMatched && !` ${locationWords(source.title + " " + source.description)} `.includes(` ${cityKey} `)) return [];
    const match = source.description.split(" … ").map(excerpt => row.exec(excerpt)).find(Boolean);
    const number = normalizePhone(match?.[1]);
    if (!match || !number) return [];
    const email = match[2].toLowerCase();
    return [{
      email, category: categoryForEmail(email), sourceUrl, sourceTitle: source.title,
      phone: {number, sourceUrl}, status: "requires-admin-verification" as const,
    }];
  });
}

export function buildHotelSupplierResearch(
  hotelName: string,
  city: string,
  pages: WebHotelResult[],
  officialCandidates: HotelOfficialSiteCandidate[],
  contacts: HotelContactCandidate[],
  findings: EvidenceFinding[],
  country?: string,
): HotelSupplierResearch {
  const officialUrls = new Set(officialCandidates.map(candidate => candidate.sourceUrl));
  const cityKey = locationWords(city);
  const sources = pages.filter(page => officialUrls.has(page.url) &&
    hotelSourceMatch(hotelName, {...page, description: ""}) &&
    ` ${locationWords(`${page.title} ${page.url} ${page.description}`)} `.includes(` ${cityKey} `));
  const phones = new Map<string, PhoneEvidence>();
  const sourceByUrl = new Map(sources.map(page => [page.url, page]));

  for (const page of sources) {
    const phone = normalizePhone(page.description.match(labeledPhone)?.[1]);
    if (phone) {
      phones.set(page.url, {number: phone, sourceUrl: page.url});
    }
  }

  const ranked = contacts
    .flatMap(contact => {
      const source = sourceByUrl.get(contact.sourceUrl);
      if (!source) return [];
      const number = publishedContactPhone(source.description, contact.email);
      const phone = number ? {number, sourceUrl: contact.sourceUrl} : phones.get(contact.sourceUrl);
      return [{...contact, category: categoryForEmail(contact.email), phone}];
    }).concat(hotelDirectoryContacts(hotelName, cityKey, pages, sources.length > 0))
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

  const uniqueContacts = new Map<string, HotelSupplierResearch["contacts"][number]>();
  const suggestedContacts = ranked.length || !cityKey ? ranked : corroboratedDirectoryContacts(hotelName, cityKey, pages);
  for (const contact of suggestedContacts) {
    if (!uniqueContacts.has(contact.email)) uniqueContacts.set(contact.email, contact);
  }

  const orderedContacts = [...uniqueContacts.values()];
  const reviewed = country && publishedHotelVerification(hotelName, city, country);
  const published = reviewed && orderedContacts.every(contact => contact.corroboratingSourceUrl)
    ? {
      email: reviewed.email, sourceUrl: reviewed.source, sourceTitle: `${hotelName} published contact`,
      status: "requires-admin-verification" as const, category: reviewed.contactType,
      phone: {number: reviewed.phone, sourceUrl: reviewed.source},
    } : undefined;

  return {
    contacts: (published ? [published, ...orderedContacts.filter(contact => contact.email !== published.email)] : orderedContacts).slice(0, 3),
    phone: published?.phone ?? phones.values().next().value,
    suggestedFacilitiesSource: publishedFacilities.find(item => item.evidence)?.evidence?.sourceUrl ??
      findings.find(item => (item.topic === "facilities" || item.topic === "accessibility") &&
        sourceByUrl.has(item.sourceUrl))?.sourceUrl,
    facilities: publishedFacilities
  };
}
