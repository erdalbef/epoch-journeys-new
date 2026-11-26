import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishHotelDeadlineReminders } from "./hotelDeadlineReminders";
import { hotelOfferFields } from "./receivedHotelOffer";

const {findMany, createMany} = vi.hoisted(() => ({findMany: vi.fn(), createMany: vi.fn()}));
vi.mock("@/lib/db", () => ({db: {
  supplierCommercialEvidence: {findMany}, epochAdminAlert: {createMany},
}}));

const offer = {
  id: "offer-1",
  sourceDate: new Date("2026-11-25T00:00:00Z"),
  reviewedTerms: {...Object.fromEntries(Object.keys(hotelOfferFields).map(key => [key, ""])),
    validity: "Offer valid for 10 days from receipt."},
  acceptanceStatus: "NOT_ESTABLISHED",
  hotelInquiry: null,
  manualHotelTour: {title: "Balkans"},
  manualHotelStayKey: '["Belgrade","2027-05-17","2027-05-19"]',
  supplier: {id: "hotel-1", name: "Mama Shelter"},
  events: [{newStatus: "ENABLED"}],
};

describe("Hotel deadline Admin alerts", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates one deduplicated alert on the local reminder date", async () => {
    findMany.mockResolvedValue([offer]);
    createMany.mockResolvedValue({count: 1});
    expect(await publishHotelDeadlineReminders(new Date("2026-11-27T21:10:00Z"))).toBe(1);
    expect(createMany).toHaveBeenCalledWith({skipDuplicates: true, data: [expect.objectContaining({
      title: "Mama Shelter · Deadline in 7 days",
      href: "/admin/suppliers/hotel-1?tab=policies#supplier-workspace",
      eventKey: expect.stringContaining("hotel-deadline:offer-1:2026-12-05:"),
    })]});
  });

  it("skips disabled offers and accepted offer expiries", async () => {
    findMany.mockResolvedValue([
      {...offer, events: [{newStatus: "DISABLED"}]},
      {...offer, id: "offer-2", acceptanceStatus: "RECORDED_ACCEPTED"},
    ]);
    expect(await publishHotelDeadlineReminders(new Date("2026-11-28T09:00:00Z"))).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });
});
