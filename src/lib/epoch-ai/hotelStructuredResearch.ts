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
  if (rooms >= 70) return "possible";
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

    if (!hotelSourceMatch(hotelName, { ...page, description: "" })) continue;

    const publishedTotals = new Set<number>();
    const explicitTotals = /\b(\d{1,4})\s+(?:(?:fully renovated|modern|spacious|well-appointed|newly renovated|beautifully appointed|thoughtfully designed)\s+)*(?:guest\s*rooms?|hotel rooms?|bedrooms?|rooms?\s+and\s+suites?)\b/gi;
    const statedInventory = /\b(?:has|offers|features|boasts|comprises|with|our|total of)\s+(\d{1,4})\s+(?:(?:fully renovated|modern|spacious|well-appointed|newly renovated)\s+)*rooms?\b/gi;

    const labeledInventory = /\b(?:total number of rooms|total rooms|guest rooms)\s*:\s*(\d{1,4})\b/gi;

    for (const pattern of [explicitTotals, statedInventory, labeledInventory]) {
      for (const match of excerpt.matchAll(pattern)) {
        const prefix = excerpt.slice(Math.max(0, match.index - 45), match.index);
        const suffix = excerpt.slice(match.index + match[0].length);
        if (/(?:[-–]\s*|\bto\s+|\b(?:book|reserve|block|up to)\s+)$/i.test(prefix) ||
            /^\s+(?:available|for (?:groups?|your group)|per floor)\b/i.test(suffix)) continue;

        const count = Number(match[1]);
        if (count >= 1 && count <= 3000) publishedTotals.add(count);
      }
    }

    for (const totalRooms of publishedTotals) {
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
