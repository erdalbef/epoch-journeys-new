import { safePublicUrl } from "./hotelWebResearch";

export type OfficialPageContact = {
  email: string;
  category: "groups" | "reservations" | "sales" | "general";
  sourceUrl: string;
  status: "requires-admin-verification";
};

export type OfficialPageExtraction = {
  contacts: OfficialPageContact[];
  phones: string[];
  roomCounts: number[];
  sourceUrl: string;
  sourceVerified: false;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, raw: string) => {
      const hex = raw.toLowerCase().startsWith("x");
      const n = Number.parseInt(hex ? raw.slice(1) : raw, hex ? 16 : 10);
      return n >= 32 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
        ? String.fromCodePoint(n) : " ";
    })
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (_match, entity: string) => {
      const values: Record<string, string> = {
        amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " "
      };
      return values[entity.toLowerCase()] || " ";
    });
}

export function categoryForEmail(email: string): OfficialPageContact["category"] {
  const local = email.split("@")[0].toLowerCase();

  if (/group|mice|event/.test(local)) return "groups";
  if (/reserv|booking/.test(local)) return "reservations";
  if (/sales|commercial/.test(local)) return "sales";
  return "general";
}

/**
 * Extracts candidate data from supplied HTML.
 * Does not fetch URLs, verify hotel identity or approve contacts.
 */
export function extractHotelOfficialPage(
  html: string,
  sourceUrl: string
): OfficialPageExtraction {
  const safeUrl = safePublicUrl(sourceUrl);

  if (!safeUrl || typeof html !== "string" || html.length > 1_000_000) {
    throw new Error("Invalid hotel page input");
  }

  const cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ");

  const text = decodeEntities(cleaned.replace(/<[^>]+>/g, " "));

  const emails = new Set<string>();

  for (const match of cleaned.matchAll(
    /mailto:([^"'<>\s?]+)/gi
  )) {
    let value = decodeEntities(match[1]);

    try {
      value = decodeURIComponent(value);
    } catch {
      continue;
    }

    emails.add(value.toLowerCase());
  }

  for (const match of text.matchAll(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  )) {
    emails.add(match[0].toLowerCase());
  }

  const contacts = [...emails]
    .filter(email =>
      /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) &&
      email.length <= 254
    )
    .map(email => ({
      email,
      category: categoryForEmail(email),
      sourceUrl: safeUrl,
      status: "requires-admin-verification" as const
    }))
    .sort((a, b) => {
      const rank = {
        groups: 0, reservations: 1, sales: 2, general: 3
      };
      return rank[a.category] - rank[b.category];
    })
    .slice(0, 15);

  const phones = [...new Set(
    [...cleaned.matchAll(/tel:([+\d ()-]{7,25})/gi)]
      .map(match => match[1].trim())
  )].slice(0, 10);

  const roomCounts = [...new Set(
    [...text.matchAll(
      /\b(\d{1,4})\s+(?:guest\s*rooms?|guestrooms?|hotel rooms?|bedrooms)\b/gi
    )]
      .map(match => Number(match[1]))
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 3000)
  )].slice(0, 10);

  return {
    contacts,
    phones,
    roomCounts,
    sourceUrl: safeUrl,
    sourceVerified: false
  };
}