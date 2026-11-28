import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAgentClientQuotePdfData } from "@/lib/pdf/buildAgentClientQuotePdfData";
import { POST } from "./route";

const {findUnique, adminAccess, getServerSession, provider} = vi.hoisted(() => ({
  findUnique: vi.fn(), adminAccess: vi.fn(), getServerSession: vi.fn(), provider: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({db: {tour: {findUnique}}}));
vi.mock("@/lib/authOptions", () => ({authOptions: {}}));
vi.mock("next-auth", () => ({getServerSession}));
vi.mock("@/lib/security/requireAdminApiAccess", () => ({requireAdminApiAccess: adminAccess}));
vi.mock("@/lib/rate-limit", () => ({checkRateLimit: () => ({allowed: true})}));

const savedTour = {
  id: "balkans",
  overviewItinerary: "A pilgrimage through the Balkans.",
  itinerary: [
    "### **Day 1: 7 May 2027 — Flight**",
    "Overnight flight.",
    "Day 2: Sarajevo",
    "Visit: Sacred Heart Cathedral; Baščaršija",
    "Optional visit: National Museum",
    "Day 3: Perast and Kotor",
    "Take a boat to Our Lady of the Rocks and visit Saint Tryphon Cathedral.",
  ].join("\n"),
};
const request = (origin = "https://epoch.example") => new Request("https://epoch.example/api/admin/epoch-ai/quote-brief-itinerary", {
  method: "POST", headers: {origin, "Content-Type": "application/json"},
  body: JSON.stringify({tourId: savedTour.id}),
});

describe("Client quote brief itinerary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    adminAccess.mockResolvedValue(null);
    getServerSession.mockResolvedValue({user: {id: "admin"}});
    findUnique.mockResolvedValue(savedTour);
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", provider);
  });
  afterEach(() => {vi.unstubAllEnvs(); vi.unstubAllGlobals();});

  it("uses site names from the correct day and preserves a flight-only day", async () => {
    provider.mockResolvedValue(Response.json({output_text: JSON.stringify({days: [
      {day: 1, sites: []},
      {day: 2, sites: ["Sacred Heart Cathedral", "Baščaršija", "National Museum", "Our Lady of the Rocks"]},
      {day: 3, sites: ["Our Lady of the Rocks", "Saint Tryphon Cathedral", "Made-up Shrine"]},
    ]})}));
    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      briefItinerary: "Day 1\nDay 2: Sacred Heart Cathedral, Baščaršija\nDay 3: Our Lady of the Rocks, Saint Tryphon Cathedral",
      warning: expect.stringContaining("could not be verified"),
    });
    const submitted = JSON.parse(provider.mock.calls[0][1].body);
    expect(submitted.store).toBe(false);
    expect(submitted.input[0].content).toContain("Take a boat to Our Lady of the Rocks");
    expect(submitted.input[0].content).not.toContain(savedTour.overviewItinerary);

    const pdf = buildAgentClientQuotePdfData({
      quoteNumber: 1, quoteReference: null, title: "Balkans", clientDocumentTitle: "Balkans Pilgrimage",
      recipientName: null, recipientEmail: null, currency: "EUR", validUntil: null,
      clientSinglePrice: null, clientDoubleTwinPrice: null, clientTriplePrice: null,
      clientIncludes: null, clientExcludes: null, paymentPolicy: null, cancellationPolicy: null,
      clientOfferNotes: null, termsAndNotes: null,
      quoteBuilderSummary: {briefItinerary: body.briefItinerary, startDate: "2027-05-07"},
    });
    expect(pdf.clientDocumentTitle).toBe("Balkans Pilgrimage");
    expect(pdf.briefItinerary.map(({dayNumber, details}) => [dayNumber, details])).toEqual([
      [1, ""], [2, "Sacred Heart Cathedral, Baščaršija"], [3, "Our Lady of the Rocks, Saint Tryphon Cathedral"],
    ]);
  });

  it("falls back to named visits when the extraction service is unavailable", async () => {
    provider.mockResolvedValue(new Response(null, {status: 503}));
    expect(await (await POST(request())).json()).toMatchObject({
      briefItinerary: "Day 1\nDay 2: Sacred Heart Cathedral, Baščaršija\nDay 3",
      warning: expect.stringContaining("explicitly labeled visits"),
    });
  });

  it("keeps an unnumbered overview out of the day-by-day fields", async () => {
    findUnique.mockResolvedValue({...savedTour, itinerary: null});
    expect(await (await POST(request())).json()).toMatchObject({briefItinerary: ""});
    expect(provider).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated and cross-origin requests before reading the tour", async () => {
    adminAccess.mockResolvedValueOnce(new Response(null, {status: 401}));
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("https://unrelated.example"))).status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
