import { describe, expect, it } from "vitest";
import { publishedHotelVerification, SARAJEVO_PUBLIC_VERIFICATION } from "./hotelPublicVerification";
describe("Sarajevo published-source verification", () => {
  it("has four public contact profiles", () => expect(Object.keys(SARAJEVO_PUBLIC_VERIFICATION)).toHaveLength(4));
  it("uses a published address but never claims the group is booked", () => {
    for (const value of Object.values(SARAJEVO_PUBLIC_VERIFICATION)) {
      expect(value.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
      expect(value.source).toMatch(/^https:\/\//);
      expect(value.openQuestions.some(v => v.includes("20 rooms available"))).toBe(true);
      expect(value.publishedFacts.join(" ").toLowerCase()).not.toContain("confirmed availability");
    }
  });
  it("does not invent verification for other destinations", () => expect(publishedHotelVerification("Hyatt Regency Kotor Bay Resort")).toBeUndefined());
  it("finds case-insensitive hotel name", () => expect(publishedHotelVerification(" Movenpick Hotel Sarajevo ")?.contactType).toBe("reservations"));
});
