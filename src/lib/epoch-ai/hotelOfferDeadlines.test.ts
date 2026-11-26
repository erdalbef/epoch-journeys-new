import { describe, expect, it } from "vitest";
import { hotelOfferDeadlines } from "./hotelOfferDeadlines";
import { hotelOfferFields, type HotelOfferTerms } from "./receivedHotelOffer";

const terms = {
  ...Object.fromEntries(Object.keys(hotelOfferFields).map(key => [key, ""])),
  validity: "Offer valid for 10 days from receipt to confirm preliminary reservation.",
  cancellation: "Cancellation of entire room block: 60+ days prior arrival - no fee; 59–30 days - 25% of total contracted room nights charged; 29–15 days - 50%; 14–0 days - 100%. Reduction of room nights within block: Free cancellation percentages decrease closer to arrival, smallest free allowance within 6–2 days (10%), none within 48 hours or no-show charged at 100% of first night's accommodation.",
} as HotelOfferTerms;

describe("hotel offer deadlines", () => {
  it("calculates the Mama Shelter deadline dates from the recorded receipt and check-in", () => {
    const deadlines = hotelOfferDeadlines(terms, "2026-11-25", "2027-05-17");
    expect(deadlines.map(({date}) => date)).toEqual([
      "2026-12-05", "2027-03-19", "2027-04-18", "2027-05-03", "2027-05-11", "2027-05-15",
    ]);
    expect(deadlines.map(({kind}) => kind)).toEqual(["expiry", ...Array(5).fill("roomBlock")]);
    expect(deadlines[5].label).toContain("confirm exact time");
  });

  it("leaves ambiguous terms and missing or invalid source dates unresolved", () => {
    expect(hotelOfferDeadlines({...terms, validity: "10 business days", cancellation: "Penalty may apply"},
      "2026-11-25", "2027-05-17")).toEqual([]);
    expect(hotelOfferDeadlines(terms, "2026-11-31", "")).toEqual([]);
  });
});
