import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { tour: { updateMany } } }));
vi.mock("@/lib/security/requireAdminApiAccess", () => ({ requireAdminApiAccess: async () => null }));
vi.mock("@/lib/security/requestBodyLimit", () => ({ isRequestWithinLimit: async () => true }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "admin" } }) }));

import { PUT } from "./route";

const url = "https://epoch.example/api/admin/epoch-ai/hotel-procurement/tour/schedule";
const stay = { city: "Sarajevo", checkIn: "2027-05-07", checkOut: "2027-05-08", rooms: 20, massRoom: false };
const revision = "7f37a124-da15-4cc4-a492-1474384c5817";

function save(body: object, origin = "https://epoch.example") {
  return PUT(new Request(url, {
    method: "PUT", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: "tour" }) });
}

describe("Save Hotel Procurement dates", () => {
  beforeEach(() => updateMany.mockReset());

  it("updates only the reviewed schedule revision and records the admin", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    const response = await save({ revision, stays: [stay] });
    expect(response.status).toBe(200);
    const { schedule } = await response.json();
    expect(schedule).toMatchObject({ updatedBy: "admin", stays: [stay] });
    expect(schedule.revision).not.toBe(revision);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "tour", hotelProcurementSchedule: { path: ["revision"], equals: revision } },
      data: { hotelProcurementSchedule: schedule },
    });
  });

  it("prevents a stale schedule from overwriting another admin's dates", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    expect((await save({ revision, stays: [stay] })).status).toBe(409);
  });

  it("rejects overlapping and cross-origin updates before writing", async () => {
    expect((await save({ revision, stays: [stay, stay] })).status).toBe(400);
    expect((await save({ revision, stays: [stay] }, "https://other.example")).status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
