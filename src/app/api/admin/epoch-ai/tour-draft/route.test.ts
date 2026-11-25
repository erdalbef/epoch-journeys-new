import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findTour: vi.fn(),
  createTour: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/security/requireAdminApiAccess", () => ({ requireAdminApiAccess: mocks.authorize }));
vi.mock("@/lib/security/requestBodyLimit", () => ({ isRequestWithinLimit: async () => true }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/lib/codes/generateTourCode", () => ({ generateTourCode: async () => "SCSE1" }));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: (run: (tx: unknown) => unknown) => run({
      tour: { findFirst: mocks.findTour, create: mocks.createTour },
      epochTourDraftSave: { create: mocks.audit },
    }),
  },
}));

import { POST } from "./route";

function save(overrides: Record<string, unknown> = {}, origin = "https://www.epochjourneys.com") {
  return POST(new Request("https://www.epochjourneys.com/api/admin/epoch-ai/tour-draft", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      confirmation: "SAVE_TOUR_DRAFT",
      title: "Scandinavia September 2027",
      duration: 12,
      destinations: "Finland, Sweden",
      arrivalCity: "Helsinki",
      departureCity: "Reykjavik",
      itinerary: "Day 1, September 2, 2027 – Thursday Departure\nDay 2: Arrive in Helsinki.",
      overview: "Helsinki to Reykjavik",
      ...overrides,
    }),
  }));
}

describe("Epoch AI tour draft approval", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authorize.mockResolvedValue(null);
    mocks.findTour.mockResolvedValue(null);
    mocks.createTour.mockResolvedValue({ id: "tour-1" });
  });

  it("creates an unpublished record and logs the approved snapshot", async () => {
    const response = await save();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ tourId: "tour-1" });
    expect(mocks.createTour).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isPublished: false, overviewItinerary: "Helsinki to Reykjavik", destinations: ["Finland", "Sweden"] }),
    }));
    expect(mocks.audit).toHaveBeenCalledWith({
      data: { tourId: "tour-1", actorId: "admin-1", snapshot: expect.objectContaining({ isPublished: false, title: "Scandinavia September 2027" }) },
    });
  });

  it("returns the existing tour without writing a duplicate", async () => {
    mocks.findTour.mockResolvedValue({ id: "already-saved", isPublished: true });
    const response = await save();
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ tourId: "already-saved" });
    expect(mocks.createTour).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("rejects missing confirmation, publishing instructions, and untrusted origins", async () => {
    expect((await save({ confirmation: undefined })).status).toBe(400);
    expect((await save({ isPublished: true })).status).toBe(400);
    expect((await save({}, "https://outside.example")).status).toBe(403);
    expect(mocks.createTour).not.toHaveBeenCalled();
  });
});
