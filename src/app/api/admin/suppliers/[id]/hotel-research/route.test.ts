import { Role, SupplierType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  update: vi.fn(),
  createContacts: vi.fn(),
}));
vi.mock("next-auth", () => ({getServerSession: async () => ({user: {role: Role.ADMIN, id: "admin"}})}));
vi.mock("@/lib/authOptions", () => ({authOptions: {}}));
vi.mock("@/lib/security/requireAdminApiAccess", () => ({requireAdminApiAccess: async () => null}));
vi.mock("@/lib/db", () => ({db: {
  $transaction: (callback: (tx: unknown) => unknown) => callback({
    supplier: {findFirst: mocks.find, update: mocks.update},
    supplierContact: {createMany: mocks.createContacts},
  }),
}}));

import { POST } from "./route";

const source = "https://hotel.example.com/contact";
const entries = [
  {kind: "email", value: "groups@hotel.example.com", sourceUrl: source},
  {kind: "website", value: source, sourceUrl: source},
  {kind: "contact", value: "reception@hotel.example.com", sourceUrl: source},
  {kind: "contact", value: "groups@hotel.example.com", sourceUrl: source},
  {kind: "fact", value: "52 published guest rooms", sourceUrl: source},
];

function save(approved: boolean, draft: unknown = entries) {
  return POST(new Request("https://epoch.example/api/admin/suppliers/hotel-1/hotel-research", {
    method: "POST",
    headers: {origin: "https://epoch.example", "content-type": "application/json"},
    body: JSON.stringify({entries: draft, approved}),
  }), {params: Promise.resolve({id: "hotel-1"})});
}

describe("Hotel CRM research approval", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.find.mockResolvedValue({
      email: "reception@hotel.example.com", phone: null, website: null, address: null, postalCode: null,
      notes: "Existing operations notes", contacts: [{email: "Reception@Hotel.Example.com"}],
    });
  });

  it("fills blanks, keeps the original recipient, and adds only missing contact rows", async () => {
    const response = await save(true);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({saved: 3});
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({where: {id: "hotel-1", type: SupplierType.HOTEL}}));
    const {data} = mocks.update.mock.calls[0][0];
    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("status");
    expect(data.website).toBe(source);
    expect(data.notes).toContain("Existing operations notes");
    expect(data.notes).toContain(`52 published guest rooms | Public source: ${source}`);
    expect(mocks.createContacts).toHaveBeenCalledWith({data: [{
      supplierId: "hotel-1", firstName: "Group enquiries", email: "groups@hotel.example.com", notes: `Public source: ${source}`,
    }]});
  });

  it("rejects unapproved and unsupported entries before querying CRM", async () => {
    expect((await save(false)).status).toBe(400);
    expect((await save(true, [{kind: "paymentTerms", value: "Net 30", sourceUrl: source}])).status).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("does not add a duplicate contact or note on retry", async () => {
    mocks.find.mockResolvedValue({
      email: "reception@hotel.example.com", website: source,
      notes: `Public research note: 52 published guest rooms | Public source: ${source}`,
      contacts: [{email: "reception@hotel.example.com"}, {email: "groups@hotel.example.com"}],
    });
    expect(await (await save(true)).json()).toEqual({saved: 0});
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.createContacts).not.toHaveBeenCalled();
  });
});
