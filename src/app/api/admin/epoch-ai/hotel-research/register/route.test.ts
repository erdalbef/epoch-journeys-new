import {beforeEach, describe, expect, it, vi} from "vitest";

const {query, findHotels, createHotel} = vi.hoisted(() => ({
  query: vi.fn(async () => [{locked: true}]),
  findHotels: vi.fn(async () => []),
  createHotel: vi.fn(async () => ({id: "hotel-1"}))
}));

vi.mock("@/lib/security/requireAdminApiAccess", () => ({requireAdminApiAccess: async () => null}));
vi.mock("next-auth", () => ({getServerSession: async () => ({user: {role: "ADMIN", id: "admin-1"}})}));
vi.mock("@/lib/authOptions", () => ({authOptions: {}}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: (callback: (tx: unknown) => unknown) => callback({
      $queryRaw: query,
      supplier: {findMany: findHotels, create: createHotel}
    })
  }
}));

import {POST} from "./route";

const adminVerification = {
  confirmation: "REGISTER VERIFIED RESEARCH LEAD",
  contactChecked: true,
  facilitiesChecked: false
};

function register(overrides: Record<string, unknown> = {}) {
  return POST(new Request("https://epoch.example/api/admin/epoch-ai/hotel-research/register", {
    method: "POST",
    headers: {origin: "https://epoch.example", "content-type": "application/json"},
    body: JSON.stringify({
      name: "Example Hotel Tirana",
      city: "Tirana",
      country: "Albania",
      email: "groups@hotel.example",
      phone: "+355 4 2235035",
      source: "https://hotel.example/contact",
      adminVerification,
      hotelStay: {checkIn: "2027-05-10", checkOut: "2027-05-12", rooms: 20},
      ...overrides
    })
  }));
}

describe("Hotel research CRM registration", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([undefined, ""])("saves a contact-reviewed candidate with facilities source %s", async facilitiesSource => {
    const response = await register({facilitiesSource});

    expect(response.status).toBe(201);
    expect(createHotel).toHaveBeenCalledWith({data: expect.objectContaining({
      status: "INACTIVE",
      notes: expect.stringContaining("Facilities evidence: pending hotel follow-up")
    })});
    expect(createHotel).toHaveBeenCalledWith({data: expect.objectContaining({
      notes: expect.stringContaining("20 rooms REQUESTED, NOT CONFIRMED")
    })});
  });

  it("requires contact review even when no facilities source is supplied", async () => {
    const response = await register({adminVerification: {...adminVerification, contactChecked: false}});
    expect(response.status).toBe(400);
    expect(createHotel).not.toHaveBeenCalled();
  });

  it("requires review of a supplied facilities source", async () => {
    const response = await register({facilitiesSource: "https://hotel.example/facilities"});
    expect(response.status).toBe(400);
    expect(createHotel).not.toHaveBeenCalled();
  });

  it("validates and retains reviewed facilities evidence", async () => {
    const reviewed = {...adminVerification, facilitiesChecked: true};
    const invalid = await register({facilitiesSource: "http://hotel.example/facilities", adminVerification: reviewed});
    expect(invalid.status).toBe(400);
    expect(createHotel).not.toHaveBeenCalled();

    const response = await register({facilitiesSource: "https://hotel.example/facilities", adminVerification: reviewed});
    expect(response.status).toBe(201);
    expect(createHotel).toHaveBeenCalledWith({data: expect.objectContaining({
      notes: expect.stringContaining("Facilities evidence: https://hotel.example/facilities")
    })});
  });
});
