/**
 * HERE Search v7 route-corridor facility discovery (read-only).
 * This module NEVER confirms coach parking, detour, toilet access, opening
 * hours, group capacity, or reservation availability from POI search alone.
 * The route string must originate from a real routing provider geometry.
 */
export type FacilitySearchKind = "comfort" | "lunch";
export type FacilityListing = {
  providerId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  kind: FacilitySearchKind;
  source: "HERE Search v7";
  routeCorridorSearch: true;
  suitability: "unverified";
  evidenceReference: string;
};
export type FacilitySearchResult = {
  facilities: FacilityListing[];
  warnings: string[];
  requiresManualReview: true;
};
export type HereFacilitySearchInput = {
  apiKey: string;
  route: string; // HERE Search along-route geometry parameter from a real route
  at: { lat: number; lng: number };
  kind: FacilitySearchKind;
  limit?: number;
  fetcher?: typeof fetch;
};

type HerePlace = {
  id?: unknown;
  title?: unknown;
  resultType?: unknown;
  position?: { lat?: unknown; lng?: unknown };
  address?: { label?: unknown };
  contacts?: Array<{
    phone?: Array<{ value?: unknown }>;
    www?: Array<{ value?: unknown }>;
  }>;
};

function validLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
function firstText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Calls only HERE's public POI search endpoint, never a supplier. */
export async function searchHereFacilitiesAlongRoute(
  input: HereFacilitySearchInput
): Promise<FacilitySearchResult> {
  if (!input.apiKey?.trim()) throw new Error("HERE API key is not configured.");
  if (!input.route?.trim()) throw new Error("Real route geometry is required; no city-only fallback.");
  if (!validLatLng(input.at?.lat, input.at?.lng)) {
    throw new Error("Invalid real route search coordinates.");
  }
  if (input.kind !== "comfort" && input.kind !== "lunch") {
    throw new Error("Invalid facility search category.");
  }
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) {
    throw new Error("Facility search limit must be 1 to 30.");
  }

  const url = new URL("https://browse.search.hereapi.com/v1/browse");
  url.searchParams.set("at", `${input.at.lat},${input.at.lng}`);
  url.searchParams.set("route", input.route);
  url.searchParams.set("categories", input.kind === "comfort"
    ? "700-7600-0116" : "100-1000");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("apiKey", input.apiKey);

  const requester = input.fetcher ?? fetch;
  const response = await requester(url.toString(), { method: "GET" });
  if (!response.ok) {
    // Never include URL in errors: it contains the HERE API key.
    throw new Error(`HERE facility search failed (HTTP ${response.status}).`);
  }
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" ||
      !Array.isArray((body as { items?: unknown }).items)) {
    throw new Error("HERE facility response is malformed.");
  }
  const items = (body as { items: HerePlace[] }).items;
  const seen = new Set<string>();
  const facilities: FacilityListing[] = [];
  for (const item of items) {
    if (item.resultType !== "place") continue;
    const id = firstText(item.id);
    const name = firstText(item.title);
    const lat = item.position?.lat;
    const lng = item.position?.lng;
    if (!id || !name || typeof lat !== "number" ||
        typeof lng !== "number" || !validLatLng(lat, lng) || seen.has(id)) continue;
    seen.add(id);
    const contacts = Array.isArray(item.contacts) ? item.contacts : [];
    const phone = contacts.map(c => firstText(c.phone?.[0]?.value)).find(Boolean) ?? null;
    const website = contacts.map(c => firstText(c.www?.[0]?.value)).find(Boolean) ?? null;
    facilities.push({
      providerId: id,
      name,
      address: firstText(item.address?.label),
      latitude: lat,
      longitude: lng,
      phone,
      website,
      kind: input.kind,
      source: "HERE Search v7",
      routeCorridorSearch: true,
      suitability: "unverified",
      evidenceReference: `HERE Search v7 place ${id}`,
    });
  }
  return {
    facilities,
    warnings: [
      "Search is constrained to the provided route corridor, but road-side access and detour are NOT verified.",
      "Confirm full-size coach parking, accessible toilets, hours, capacity, telephone and lunch arrangements directly before use.",
      ...(facilities.length === 0 ? ["No named facilities returned for this route/category."] : []),
    ],
    requiresManualReview: true,
  };
}
