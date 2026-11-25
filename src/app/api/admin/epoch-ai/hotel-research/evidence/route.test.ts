import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@/lib/security/requireAdminApiAccess", () => ({
  requireAdminApiAccess: vi.fn(async () => null)
}));

import {POST} from "./route";

const url = "https://www.hotel-europapark.com/en/contact-info.html";

function request() {
  return new Request("https://epoch.example/api/admin/epoch-ai/hotel-research/evidence", {
    method: "POST",
    headers: {origin: "https://epoch.example", "content-type": "application/json"},
    body: JSON.stringify({hotelName: "Rogner Hotel Tirana", city: "Tirana", country: "Albania"})
  });
}

function searchResults(results: unknown[]) {
  return Response.json({web: {results}});
}

describe("Selected hotel contact and facilities", () => {
  beforeEach(() => vi.stubEnv("BRAVE_SEARCH_API_KEY", "test-token"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns source-linked contacts and facilities and keeps gaps open", async () => {
    vi.stubGlobal("fetch", vi.fn(async (searchUrl: URL) => {
      const contactSearch = searchUrl.searchParams.get("q")?.includes("group reservations");
      return searchResults(contactSearch ? [
        {
          title: "Contact us at the Rogner Hotel Tirana",
          url,
          description: "T: +355 4 2235035 • E: info.tirana@rogner.com"
        },
        {
          title: "Rogner Hotel Tirana travel directory",
          url: "https://www.booking.com/hotel/al/rogner.html",
          description: "Send your group enquiry to groups@directory.example"
        }
      ] : [
        {
          title: "Contact us at the Rogner Hotel Tirana",
          url,
          description: "Example fixture: no coach parking on site.",
          extra_snippets: ["The meeting room is available on request."]
        }
      ]);
    }));

    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.supplierResearch.contacts).toMatchObject([
      {
        email: "info.tirana@rogner.com", category: "general", sourceUrl: url,
        phone: {number: "+355 4 2235035", sourceUrl: url},
        status: "requires-admin-verification"
      }
    ]);
    expect(body.supplierResearch.facilities).toEqual(expect.arrayContaining([
      expect.objectContaining({id: "coach", evidence: expect.objectContaining({sourceUrl: url, excerpt: expect.stringContaining("no coach parking")})}),
      {id: "showers", label: "Walk-in showers"},
      expect.objectContaining({id: "mass", evidence: expect.objectContaining({sourceUrl: url})})
    ]));
    expect(body.supplierResearch.suggestedFacilitiesSource).toBe(url);
  });

  it("suggests a property facilities page even when it has no specific group amenity", async () => {
    const facilitiesUrl = "https://www.hotel-europapark.com/en/restaurant.html";
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(searchResults([
        {title: "Contact us at the Rogner Hotel Tirana", url, description: "E: info.tirana@rogner.com"}
      ]))
      .mockResolvedValueOnce(searchResults([
        {
          title: "Rogner Hotel Tirana travel directory",
          url: "https://www.booking.com/hotel/al/rogner.html",
          description: "Coach parking and walk-in shower at the hotel."
        },
        {
          title: "Rogner Hotel Tirana restaurant",
          url: facilitiesUrl,
          description: "The restaurant offers breakfast and a garden terrace."
        }
      ])));

    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.supplierResearch.suggestedFacilitiesSource).toBe(facilitiesUrl);
    expect(body.supplierResearch.facilities.every((item: {evidence?: unknown}) => !item.evidence)).toBe(true);
  });

  it("keeps contact information when the facilities search fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(searchResults([
        {title: "Contact us at the Rogner Hotel Tirana", url, description: "E: info.tirana@rogner.com"}
      ]))
      .mockResolvedValueOnce(new Response(null, {status: 429})));

    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.partial).toBe(true);
    expect(body.supplierResearch.contacts[0].email).toBe("info.tirana@rogner.com");
    expect(body.supplierResearch.suggestedFacilitiesSource).toBeUndefined();
  });
});
