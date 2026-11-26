import { categoryForEmail } from "./hotelOfficialPageExtraction";
import { hotelSourceMatch } from "./hotelEvidenceResearch";
import type { HotelOfficialSiteCandidate } from "./hotelOfficialSiteSelection";
import type { HotelCapacityCandidate } from "./hotelStructuredResearch";
import type { HotelSupplierResearch } from "./hotelSupplierResearch";
import { safePublicUrl, type WebHotelResult } from "./hotelWebResearch";

export const hotelCrmFieldLabels = {
  website: "Hotel website",
  address: "Street address",
  postalCode: "Postal code",
  email: "Supplier email",
  phone: "Supplier phone",
  contact: "Contacts tab",
  fact: "Public research note",
} as const;

export type HotelCrmEntry = {
  kind: keyof typeof hotelCrmFieldLabels;
  value: string;
  sourceUrl: string;
};

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\bprishtin[ae]\b/g, "pristina").trim();

export function hotelCrmEntryKey(entry: HotelCrmEntry) {
  return JSON.stringify([entry.kind, entry.value, entry.sourceUrl]);
}

export function parseHotelCrmEntries(input: unknown): HotelCrmEntry[] {
  if (!Array.isArray(input) || input.length > 14) throw new Error("Invalid CRM profile entries.");
  const singleFields = new Set<string>();
  const entries = input.map((raw: unknown): HotelCrmEntry => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid CRM profile entry.");
    const {kind, value, sourceUrl} = raw as Partial<HotelCrmEntry>;
    if (typeof kind !== "string" || !Object.hasOwn(hotelCrmFieldLabels, kind) ||
        typeof value !== "string" || !value.trim() || /[\r\n]/.test(value) ||
        value.length > (kind === "website" ? 1500 : 400) ||
        typeof sourceUrl !== "string" || sourceUrl.length > 1500 || !safePublicUrl(sourceUrl)) {
      throw new Error("Invalid CRM field or public HTTPS source.");
    }
    const clean = value.trim();
    if ((kind === "email" || kind === "contact") && (clean.length > 254 || !validEmail(clean))) {
      throw new Error("Invalid supplier email.");
    }
    if (kind === "phone" && (!/^[+\d ().-]{7,60}$/.test(clean) || clean.replace(/\D/g, "").length < 6)) {
      throw new Error("Invalid supplier phone.");
    }
    if (kind === "website" && safePublicUrl(clean) !== safePublicUrl(sourceUrl)) {
      throw new Error("Invalid hotel website source.");
    }
    if (!["fact", "contact"].includes(kind)) {
      if (singleFields.has(kind)) throw new Error("Invalid duplicate CRM field.");
      singleFields.add(kind);
    }
    return {kind, value: clean, sourceUrl: safePublicUrl(sourceUrl)};
  });
  return [...new Map(entries.map(entry => [hotelCrmEntryKey(entry), entry])).values()];
}

export function buildHotelCrmEntries(
  city: string,
  pages: WebHotelResult[],
  official: HotelOfficialSiteCandidate[],
  research: HotelSupplierResearch,
  capacities: HotelCapacityCandidate[],
): HotelCrmEntry[] {
  const entries: HotelCrmEntry[] = [];
  const cityKey = normalize(city);
  const officialPage = official.find(site => {
    const page = pages.find(item => item.url === site.sourceUrl);
    return page && hotelSourceMatch(site.hotelName, {...page, description: ""}) &&
      ` ${normalize(`${page.title} ${page.url} ${page.description}`)} `.includes(` ${cityKey} `) &&
      !/\.(?:pdf|docx?)(?:$|[?#])/i.test(page.url);
  });
  const website = officialPage?.sourceUrl;
  if (website) entries.push({kind: "website", value: website, sourceUrl: website});

  const [firstContact] = research.contacts;
  if (firstContact && (!firstContact.corroboratingSourceUrl || research.contacts.length === 1)) {
    entries.push({kind: "email", value: firstContact.email, sourceUrl: firstContact.sourceUrl});
    const phone = firstContact.phone ?? research.phone;
    if (phone) entries.push({kind: "phone", value: phone.number, sourceUrl: phone.sourceUrl});
  }
  for (const contact of research.contacts) {
    entries.push({kind: "contact", value: contact.email, sourceUrl: contact.sourceUrl});
  }

  // Use address labels on the selected property's page or on its sourced contact listing.
  for (const url of new Set([website, ...research.contacts.map(contact => contact.sourceUrl)])) {
    if (!url) continue;
    const page = pages.find(item => item.url === url);
    const found = page?.description.match(/\b(?:street address|address)\s*:\s*(.{5,170}?)(?=\s*(?:[|•…]|\b(?:phone|telephone|tel|fax|email|postal code|post code|zip code|website)\s*[:.]|$))/i);
    if (!found || /[@<>]|https?:/i.test(found[1])) continue;
    entries.push({kind: "address", value: found[1].trim(), sourceUrl: url});
    const postal = page?.description.match(/\b(?:postal code|post code|zip code)\s*:\s*([a-z\d][a-z\d -]{1,9}?)(?=\s*(?:[|•,.;…]|$))/i)?.[1];
    if (postal && /\d/.test(postal)) entries.push({kind: "postalCode", value: postal.trim(), sourceUrl: url});
    break;
  }
  const capacity = capacities.find(item => item.sourceUrl === website ||
    research.contacts.some(contact => contact.sourceUrl === item.sourceUrl));
  if (capacity) entries.push({kind: "fact", value: `${capacity.totalRooms} published guest rooms`, sourceUrl: capacity.sourceUrl});
  if (website) {
    const page = pages.find(item => item.url === website);
    const stars = new Set([...(page?.description ?? "").matchAll(/\b([1-5])[-\s]stars?\s+hotel\b/gi)].map(match => match[1]));
    if (stars.size === 1) entries.push({kind: "fact", value: `Advertises a ${[...stars][0]}-star hotel classification`, sourceUrl: website});
  }
  for (const item of research.facilities) {
    if (item.evidence) entries.push({kind: "fact", value: `${item.label} — ${item.evidence.excerpt}`, sourceUrl: item.evidence.sourceUrl});
  }
  return entries;
}

export function hotelCrmContactName(email: string) {
  return {
    groups: "Group enquiries",
    reservations: "Reservations",
    sales: "Hotel sales",
    general: "Hotel enquiries",
  }[categoryForEmail(email)];
}

export function hotelCrmNotes(entries: HotelCrmEntry[], admin: string) {
  if (!entries.length) return "";
  return [
    `Hotel research reviewed by ${admin} on ${new Date().toISOString()}`,
    ...entries.map(entry => `${hotelCrmFieldLabels[entry.kind]}: ${entry.value} | Public source: ${entry.sourceUrl}`),
  ].join("\n");
}
