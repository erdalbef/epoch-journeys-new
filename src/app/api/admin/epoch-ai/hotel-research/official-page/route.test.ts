import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  fetchPage: vi.fn(),
  extract: vi.fn()
}));

vi.mock("@/lib/security/requireAdminApiAccess", () => ({
  requireAdminApiAccess: mocks.admin
}));

vi.mock("@/lib/epoch-ai/hotelSecurePageFetch", () => ({
  fetchHotelPublicPage: mocks.fetchPage
}));

vi.mock("@/lib/epoch-ai/hotelOfficialPageExtraction", () => ({
  extractHotelOfficialPage: mocks.extract
}));

import { POST } from "./route";

const huma = "HUMA Kotor Bay Hotel and Villas";
const contactUrl = "https://www.humahotel.me/reservation-policy/";

function request(
  value: unknown,
  origin = "http://localhost:3000"
): Request {
  return new Request("http://localhost:3000/api/admin/epoch-ai/hotel-research/official-page", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin
    },
    body: JSON.stringify(value)
  });
}

describe("Admin official hotel webpage research endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.HOTEL_OFFICIAL_PAGE_RETRIEVAL_ENABLED = "true";

    mocks.admin.mockResolvedValue(null);

    mocks.fetchPage.mockResolvedValue({
      sourceUrl: contactUrl,
      html: "<html><a href='mailto:groups@humahotel.me'>Groups</a></html>",
      status: "retrieved-unverified",
      contentType: "text/html"
    });

    mocks.extract.mockReturnValue({
      contacts: [{
        email: "groups@humahotel.me",
        category: "groups",
        sourceUrl: contactUrl,
        status: "requires-admin-verification"
      }],
      phones: [],
      roomCounts: [],
      sourceUrl: contactUrl,
      sourceVerified: false
    });
  });

  afterEach(() => {
    delete process.env.HOTEL_OFFICIAL_PAGE_RETRIEVAL_ENABLED;
  });

  it("denies unauthenticated or unauthorized Admin access", async () => {
    mocks.admin.mockResolvedValue(
      new Response("Forbidden", { status: 403 })
    );

    const result = await POST(request({
      hotelName: huma,
      purpose: "contact"
    }));

    expect(result.status).toBe(403);
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests", async () => {
    const result = await POST(request({
      hotelName: huma,
      purpose: "contact"
    }, "https://untrusted.example"));

    expect(result.status).toBe(403);
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });

  it("rejects unapproved hotel identities", async () => {
    const result = await POST(request({
      hotelName: "Courtyard by Marriott Sarajevo",
      purpose: "contact"
    }));

    expect(result.status).toBe(403);
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied URLs", async () => {
    const result = await POST(request({
      hotelName: huma,
      purpose: "contact",
      url: "https://example.com/"
    }));

    expect(result.status).toBe(400);
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });

  it("remains disabled unless explicitly enabled", async () => {
    delete process.env.HOTEL_OFFICIAL_PAGE_RETRIEVAL_ENABLED;

    const result = await POST(request({
      hotelName: huma,
      purpose: "contact"
    }));

    expect(result.status).toBe(503);
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });

  it("fetches only the fixed HUMA URL and returns unverified evidence", async () => {
    const result = await POST(request({
      hotelName: huma,
      purpose: "contact"
    }));

    const body = await result.json();

    expect(result.status).toBe(200);
    expect(mocks.fetchPage).toHaveBeenCalledExactlyOnceWith(contactUrl);
    expect(body.hotelName).toBe(huma);
    expect(body.status).toBe("requires-admin-verification");
    expect(body.extraction.contacts[0].email).toBe(
      "groups@humahotel.me"
    );
    expect(body.extraction.sourceVerified).toBe(false);
    expect(body.html).toBeUndefined();
  });

  it("reports retrieval failure without exposing webpage content", async () => {
    mocks.fetchPage.mockRejectedValue(new Error("connection failed"));

    const result = await POST(request({
      hotelName: huma,
      purpose: "contact"
    }));

    const body = await result.json();

    expect(result.status).toBe(502);
    expect(body.error).toContain("no data changed");
  });
});