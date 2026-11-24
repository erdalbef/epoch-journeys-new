import {
  hotelSourceMatch,
} from "./hotelEvidenceResearch";
import {
  safePublicUrl,
  type WebHotelResult,
} from "./hotelWebResearch";

export type HotelContactCandidate = {
  email: string;
  sourceUrl: string;
  sourceTitle: string;
  status: "requires-admin-verification";
};

export type HotelCapacityCandidate = {
  totalRooms: number;
  sourceUrl: string;
  sourceTitle: string;
  suitability: "preferred" | "possible" | "caution" | "too-small";
  status: "published-indication";
};

export type StructuredHotelResearch = {
  contacts: HotelContactCandidate[];
  capacities: HotelCapacityCandidate[];
  capacityStatus: "unverified";
};

export function capacityBand(rooms: number):
  HotelCapacityCandidate["suitability"] {
  if (rooms >= 120) return "preferred";
  if (rooms >= 80) return "possible";
  if (rooms >= 50) return "caution";
  return "too-small";
}

export function extractStructuredHotelResearch(
  hotelName: string,
  pages: WebHotelResult[],
): StructuredHotelResearch {
  const contacts: HotelContactCandidate[] = [];
  const capacities: HotelCapacityCandidate[] = [];
  const seenContacts = new Set<string>();
  const seenCapacities = new Set<string>();

  for (const page of pages.slice(0, 24)) {
    const sourceUrl = safePublicUrl(page.url);

    if (!sourceUrl || !hotelSourceMatch(hotelName, page)) {
      continue;
    }

    const excerpt = page.description || "";

    const emails = excerpt.match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    ) || [];

    for (const value of emails) {
      const email = value.toLowerCase();
      const key = `${email}|${sourceUrl}`;

      if (seenContacts.has(key)) continue;
      seenContacts.add(key);

      contacts.push({
        email,
        sourceUrl,
        sourceTitle: page.title,
        status: "requires-admin-verification",
      });
    }

    const roomMatches = excerpt.matchAll(
      /\b(\d{1,4})\s+(?:guest\s+)?(?:rooms|guestrooms|bedrooms)\b/gi,
    );

    for (const match of roomMatches) {
      const totalRooms = Number(match[1]);

      if (!Number.isInteger(totalRooms) ||
          totalRooms < 1 ||
          totalRooms > 3000) {
        continue;
      }

      const key = `${totalRooms}|${sourceUrl}`;

      if (seenCapacities.has(key)) continue;
      seenCapacities.add(key);

      capacities.push({
        totalRooms,
        sourceUrl,
        sourceTitle: page.title,
        suitability: capacityBand(totalRooms),
        status: "published-indication",
      });
    }
  }

  return {
    contacts: contacts.slice(0, 10),
    capacities: capacities.slice(0, 10),
    capacityStatus: "unverified",
  };
}