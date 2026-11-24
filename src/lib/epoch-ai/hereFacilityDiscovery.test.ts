import { describe, expect, it } from "vitest";
import { searchHereFacilitiesAlongRoute } from "./hereFacilityDiscovery";

const base = {
  apiKey: "synthetic-test-key",
  route: "synthetic-route-geometry",
  at: { lat: 38.72, lng: -9.14 },
  kind: "comfort" as const,
};
const response = (body: unknown, status = 200) =>
  (async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })) as unknown as typeof fetch;

const listing = {
  id: "here:place:demo-1",
  title: "Example only - not real",
  resultType: "place",
  position: { lat: 39, lng: -9 },
  address: { label: "Example address" },
  contacts: [{ phone: [{ value: "+351 000 000 000" }], www: [{ value: "https://example.invalid" }] }],
};

describe("HERE route facility discovery adapter", () => {
  it("queries the actual route corridor, never a city-only search", async () => {
    let captured = "";
    const fetcher = (async (url: string | URL | Request) => {
      captured = String(url);
      return { ok: true, status: 200, json: async () => ({ items: [listing] }) } as Response;
    }) as unknown as typeof fetch;
    const result = await searchHereFacilitiesAlongRoute({ ...base, fetcher });
    const url = new URL(captured);
    expect(url.hostname).toBe("browse.search.hereapi.com");
    expect(url.searchParams.get("route")).toBe(base.route);
    expect(url.searchParams.get("categories")).toBe("700-7600-0116");
    expect(result.facilities[0].name).toBe(listing.title);
    expect(result.facilities[0].phone).toBe("+351 000 000 000");
    expect(result.facilities[0].website).toBe("https://example.invalid");
    expect(result.facilities[0].suitability).toBe("unverified");
  });
  it("requires real route data", async () => {
    await expect(searchHereFacilitiesAlongRoute({ ...base, route: "" }))
      .rejects.toThrow("Real route geometry");
  });
  it("searches restaurants for lunch", async () => {
    let captured = "";
    const fetcher = (async (url: string | URL | Request) => {
      captured = String(url);
      return { ok: true, status: 200, json: async () => ({ items: [] }) } as Response;
    }) as unknown as typeof fetch;
    await searchHereFacilitiesAlongRoute({ ...base, kind: "lunch", fetcher });
    expect(new URL(captured).searchParams.get("categories")).toBe("100-1000");
  });
  it("does not invent missing contact details", async () => {
    const result = await searchHereFacilitiesAlongRoute({
      ...base, fetcher: response({ items: [{ ...listing, contacts: undefined, address: undefined }] }),
    });
    expect(result.facilities[0].phone).toBeNull();
    expect(result.facilities[0].website).toBeNull();
    expect(result.facilities[0].address).toBeNull();
  });
  it("filters nonplaces and duplicate provider IDs", async () => {
    const result = await searchHereFacilitiesAlongRoute({
      ...base, fetcher: response({ items: [listing, listing, { ...listing, id: "street", resultType: "street" }] }),
    });
    expect(result.facilities).toHaveLength(1);
  });
  it("does not leak API keys in provider errors", async () => {
    await expect(searchHereFacilitiesAlongRoute({
      ...base, fetcher: response({}, 401),
    })).rejects.toThrow("HTTP 401");
  });
  it("rejects malformed provider responses", async () => {
    await expect(searchHereFacilitiesAlongRoute({ ...base, fetcher: response({ result: [] }) }))
      .rejects.toThrow("malformed");
  });
  it("never treats published listings as coach suitability confirmation", async () => {
    const result = await searchHereFacilitiesAlongRoute({ ...base, fetcher: response({ items: [listing] }) });
    expect(result.requiresManualReview).toBe(true);
    expect(result.facilities[0].routeCorridorSearch).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/NOT verified/);
  });
});
