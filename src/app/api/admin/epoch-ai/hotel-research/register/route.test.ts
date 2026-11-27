import {beforeEach, describe, expect, it, vi} from "vitest";

import { PENDING_HOTEL_CONTACT_NOTE } from "@/lib/epoch-ai/hotelResearchRegistration";

const {query, findHotels, createHotel, updateHotel, createContacts} = vi.hoisted(() => ({
  query: vi.fn(async () => [{locked: true}]),
  findHotels: vi.fn(async (): Promise<unknown[]> => []),
  createHotel: vi.fn(async () => ({id: "hotel-1"})),
  updateHotel: vi.fn(async () => ({count:1})),
  createContacts: vi.fn(async () => ({count:1}))
}));

vi.mock("@/lib/security/requireAdminApiAccess", () => ({requireAdminApiAccess: async () => null}));
vi.mock("next-auth", () => ({getServerSession: async () => ({user: {role: "ADMIN", id: "admin-1"}})}));
vi.mock("@/lib/authOptions", () => ({authOptions: {}}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: (callback: (tx: unknown) => unknown) => callback({
      $queryRaw: query,
      supplier: {findMany: findHotels, create: createHotel, updateMany: updateHotel},
      supplierContact: {createMany: createContacts}
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

  const identity = {name:"ホテル京都", city:"Kyoto", country:"Japan"};
  const pending = {...identity,mode:"pending-contact",confirmation:"REGISTER LEAD WITH CONTACT PENDING",
    email:undefined,phone:undefined,source:undefined,adminVerification:undefined};

  it("creates an inactive lead without recipient details and distinguishes non-Latin names", async () => {
    findHotels.mockResolvedValueOnce([{...identity,id:"other",name:"ホテル大阪"}]);
    expect((await register(pending)).status).toBe(201);
    expect(createHotel).toHaveBeenCalledWith({data:expect.objectContaining({
      ...identity,status:"INACTIVE",notes:expect.stringContaining(PENDING_HOTEL_CONTACT_NOTE),
    })});
    expect(createHotel).not.toHaveBeenCalledWith({data:expect.objectContaining({email:expect.anything()})});
    expect(createContacts).not.toHaveBeenCalled();
  });

  it("requires approval and rejects contact details through the pending path", async () => {
    expect((await register({...pending,confirmation:undefined})).status).toBe(400);
    expect((await register({...pending,email:"groups@hotel.example"})).status).toBe(400);
    expect(createHotel).not.toHaveBeenCalled();
  });

  it("reuses a pending supplier when the Admin approves its contact", async () => {
    const existing = {...identity,id:"hotel-1",status:"INACTIVE",email:null,
      notes:PENDING_HOTEL_CONTACT_NOTE,contacts:[]};
    findHotels.mockResolvedValueOnce([existing]).mockResolvedValueOnce([existing]);
    expect((await register(pending)).status).toBe(200);

    const response = await register(identity);
    expect(await response.json()).toMatchObject({supplierId:"hotel-1",alreadyExists:true,contactCompleted:true});
    expect(updateHotel).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({email:"groups@hotel.example",
        notes:expect.stringContaining("Public contact evidence: https://hotel.example/contact")}),
    }));
    expect(createContacts).toHaveBeenCalledWith({data:[expect.objectContaining({supplierId:"hotel-1"})]});
    expect(createHotel).not.toHaveBeenCalled();
  });
});
