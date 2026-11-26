import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@/lib/security/requireAdminApiAccess", () => ({
  requireAdminApiAccess: vi.fn(async () => null)
}));

import {POST} from "./route";

const url = "https://www.hotel-europapark.com/en/contact-info.html";

function request(hotelName = "Rogner Hotel Tirana", city = "Tirana", country = "Albania") {
  return new Request("https://epoch.example/api/admin/epoch-ai/hotel-research/evidence", {
    method: "POST",
    headers: {origin: "https://epoch.example", "content-type": "application/json"},
    body: JSON.stringify({hotelName, city, country})
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

  it("retries within a recognized official domain and uses only the selected hotel's directory row", async () => {
    const directory = "https://www.thonhotels.com/information/contact-information-hotels/";
    const unrelated = "https://travel-example.com/thon";
    const fetch = vi.fn(async (searchUrl: URL) => {
      if (!searchUrl.searchParams.get("q")?.startsWith("site:thonhotels.com ")) return searchResults([]);
      return searchResults([
        {
          title: "Oslo contact directory", url: unrelated,
          description: "Thon Hotel Opera Tel: +47 23 33 00 00 / fake@example.com",
        },
        {
          title: "Contact information | Thon Hotels", url: directory,
          description: "Oslo: Thon Hotel Astoria Tel: +47 24145550 / astoria@thon.no Thon Hotel Opera Tel: +47 24103000 / opera@thon.no",
        },
      ]);
    });
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request("Thon Hotel Opera", "Oslo", "Norway"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(body.supplierResearch.contacts.map((contact: {email: string}) => contact.email)).toEqual(["opera@thon.no"]);
    expect(body.supplierResearch.contacts[0]).toMatchObject({
      sourceUrl: directory, phone: {number: "+47 24103000", sourceUrl: directory},
      status: "requires-admin-verification",
    });
  });

  it("searches the new property name and accepts the operator's Reykjavík property page", async () => {
    const source = "https://www.islandshotel.is/is/hotelin/hilton-reykjavik/";
    const fetch = vi.fn(async (searchUrl: URL) => {
      const query = searchUrl.searchParams.get("q") ?? "";
      return searchResults(query.includes('"Hilton Reykjavik"') ? [{
        title: "Hilton Reykjavík - Íslandshótel", url: source,
        description: "Reykjavík. Hópar: groups@islandshotel.is. Sími +354 510 5130",
      }] : []);
    });
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request("Hilton Reykjavik Nordica", "Reykjavik", "Iceland"));
    expect(response.status).toBe(200);
    expect((await response.json()).supplierResearch.contacts[0]).toMatchObject({
      email: "groups@islandshotel.is", sourceUrl: source,
      phone: {number: "+354 510 5130", sourceUrl: source},
    });
  });

  it("retries public contact research when the official site has no indexed contact", async () => {
    const source = "https://venue-directory.example/hotels/sirius-pristina";
    const secondSource = "https://conference.example/hotel-guide";
    vi.stubGlobal("fetch", vi.fn(async (searchUrl: URL) => {
      const query = searchUrl.searchParams.get("q") ?? "";
      if (query.endsWith("hotel reservations email telephone")) {
        return searchResults([
          {title: "Hotel Sirius Pristina", url: source, description: "Tel: +383 38 222 280 | info@hotelsirius.net"},
          {title: "Conference hotel guide", url: secondSource, description: "Hotel Sirius, Prishtinë | info@hotelsirius.net"},
        ]);
      }
      return searchResults([{title: "Hotel Sirius", url: "https://hotelsirius.com/", description: "In the heart of Prishtinë."}]);
    }));
    const response = await POST(request("Hotel Sirius", "Pristina", "Kosovo"));
    expect(response.status).toBe(200);
    expect((await response.json()).supplierResearch.contacts).toMatchObject([{
      email: "info@hotelsirius.net", sourceUrl: source, corroboratingSourceUrl: secondSource,
      phone: {number: "+383 38 222 280", sourceUrl: source},
    }]);
  });

  it("proposes sourced CRM fields, contact and research notes from a property page", async () => {
    const source = "https://www.hotel-sirius.example/contact";
    vi.stubGlobal("fetch", vi.fn(async () => searchResults([{
      title: "Hotel Sirius, Prishtina",
      url: source,
      description: "Address: Agim Ramadani 22 | Postal code: 10000 | Phone: +383 38 222 280 | Email: groups@sirius.example.com | Total number of rooms: 52. The 4-star hotel provides meeting rooms.",
    }])));
    const response = await POST(request("Hotel Sirius", "Pristina", "Kosovo"));
    expect(response.status).toBe(200);
    expect((await response.json()).crmEntries).toEqual(expect.arrayContaining([
      {kind: "website", value: source, sourceUrl: source},
      {kind: "address", value: "Agim Ramadani 22", sourceUrl: source},
      {kind: "postalCode", value: "10000", sourceUrl: source},
      {kind: "phone", value: "+383 38 222 280", sourceUrl: source},
      {kind: "contact", value: "groups@sirius.example.com", sourceUrl: source},
      {kind: "fact", value: "52 published guest rooms", sourceUrl: source},
      {kind: "fact", value: "Advertises a 4-star hotel classification", sourceUrl: source},
    ]));
  });
});
