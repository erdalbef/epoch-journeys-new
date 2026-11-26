import {
  safePublicUrl,
  type WebHotelResult
} from "./hotelWebResearch";

export type HotelOfficialSiteCandidate = {
  hotelName: string;
  sourceUrl: string;
  sourceTitle: string;
  hostname: string;
  reason: string;
  status: "identity-review-required";
  retrievalAuthorized: false;
};

const excludedDomains = [
  "booking.com", "expedia.com", "hotels.com",
  "agoda.com", "tripadvisor.com", "trivago.com",
  "kayak.com", "google.com", "facebook.com",
  "instagram.com", "wikipedia.org"
];

const chainDomains: {
  domain: string;
  brands: RegExp;
}[] = [
  {
    domain: "marriott.com",
    brands: /\b(marriott|courtyard|sheraton|westin|ritz.carlton|aloft|moxy)\b/i
  },
  {
    domain: "hilton.com",
    brands: /\b(hilton|doubletree|hampton|conrad|waldorf)\b/i
  },
  {
    domain: "hyatt.com",
    brands: /\b(hyatt|andaz|grand hyatt|park hyatt)\b/i
  },
  {
    domain: "ihg.com",
    brands: /\b(holiday inn|crowne plaza|intercontinental|voco|indigo|kimpton)\b/i
  },
  {
    domain: "accor.com",
    brands: /\b(accor|ibis|novotel|mercure|movenpick|swissotel|sofitel|pullman)\b/i
  },
  {
    domain: "scandichotels.com",
    brands: /\bscandic\b/i
  },
  {
    domain: "thonhotels.com",
    brands: /^thon(?:\s+partner)?\s+hotell?\b/i
  }
];

// A reviewed domain can support source identification without granting page retrieval.
const reviewedPropertyDomains = new Map([
  ["rogner hotel tirana", "hotel-europapark.com"],
  ["ac hotel bella sky copenhagen", "bellagroup.dk"],
  ["hilton reykjavik", "islandshotel.is"],
]);

const generic = new Set([
  "hotel", "hotels", "resort", "resorts",
  "spa", "villas", "villa", "and", "the",
  "kotor", "bay", "sarajevo", "tirana",
  "ohrid", "pristina", "prishtina",
  "skopje", "belgrade", "montenegro",
  "albania", "serbia", "kosovo"
]);

function normalized(value: string): string {
  return value.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain);
}

export function officialHotelSearchDomain(name: string): string | undefined {
  return reviewedPropertyDomains.get(normalized(name)) ??
    chainDomains.find(chain => chain.brands.test(name))?.domain;
}

function distinguishingWords(name: string): string[] {
  return normalized(name).split(/\s+/)
    .filter(word => word.length >= 4 && !generic.has(word));
}

/**
 * Advisory site selection only.
 * No DNS, HTTP request, supplier approval or authorization occurs here.
 */
export function selectHotelOfficialSiteCandidates(
  hotelName: string,
  pages: WebHotelResult[],
  limit = 5
): HotelOfficialSiteCandidate[] {
  const words = distinguishingWords(hotelName);

  if (!words.length) return [];

  const reviewedDomain = reviewedPropertyDomains.get(normalized(hotelName));
  const candidates: HotelOfficialSiteCandidate[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    const sourceUrl = safePublicUrl(page.url);
    if (!sourceUrl) continue;

    const hostname = new URL(sourceUrl).hostname.toLowerCase();

    if (excludedDomains.some(domain =>
      matchesDomain(hostname, domain)
    )) {
      continue;
    }

    const titleWords = new Set(
      normalized(page.title).split(/\s+/)
    );

    // The property's distinctive name must appear in the page title.
    if (!titleWords.has(words[0])) continue;

    const matchingChain = chainDomains.find(chain =>
      chain.brands.test(hotelName)
    );

    let reason = "";

    if (reviewedDomain && matchesDomain(hostname, reviewedDomain)) {
      reason = "Reviewed hotel property domain";
    } else if (matchingChain) {
      // A chain-branded property requires its expected chain domain.
      if (!matchesDomain(hostname, matchingChain.domain)) continue;
      if (matchingChain.domain === "scandichotels.com" &&
          !words.slice(1).some(word => titleWords.has(word))) continue;

      reason = "Property name and hotel-chain domain are consistent";
    } else {
      // Conservative domain indication; not a domain ownership check.
      const labels = hostname.replace(/^www\./, "").split(".");
      if (labels.length < 2) continue;

      const domainLabel = labels[labels.length - 2];
      if (!domainLabel.includes(words[0])) continue;

      reason = "Distinctive hotel name appears in the domain and page title";
    }

    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);

    candidates.push({
      hotelName,
      sourceUrl,
      sourceTitle: page.title,
      hostname,
      reason,
      status: "identity-review-required",
      retrievalAuthorized: false
    });
    if (candidates.length >= limit) break;
  }

  return candidates;
}
