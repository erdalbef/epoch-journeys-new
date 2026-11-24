import { describe, expect, it } from "vitest";
import {
  capacityBand,
  extractStructuredHotelResearch,
} from "./hotelStructuredResearch";

describe("Structured hotel research", () => {
  it("applies the intended group-capacity bands", () => {
    expect(capacityBand(140)).toBe("preferred");
    expect(capacityBand(100)).toBe("possible");
    expect(capacityBand(65)).toBe("caution");
    expect(capacityBand(25)).toBe("too-small");
  });

  it("retains source attribution without claiming verification", () => {
    const result = extractStructuredHotelResearch(
      "HUMA Kotor Bay",
      [{
        title: "HUMA Kotor Bay hotel contact",
        description:
          "HUMA Kotor Bay hotel has 130 rooms. " +
          "Reservations: reservations@example.com",
        url: "https://example.com/huma-kotor-bay",
      }],
    );

    expect(result.contacts[0]?.email)
      .toBe("reservations@example.com");
    expect(result.contacts[0]?.status)
      .toBe("requires-admin-verification");
    expect(result.capacities[0]?.totalRooms)
      .toBe(130);
    expect(result.capacities[0]?.suitability)
      .toBe("preferred");
    expect(result.capacityStatus).toBe("unverified");
  });

  it("does not use evidence from an unrelated hotel", () => {
    const result = extractStructuredHotelResearch(
      "HUMA Kotor Bay",
      [{
        title: "Unrelated hotel",
        description:
          "Hotel has 200 rooms. info@example.com",
        url: "https://example.com/unrelated-hotel",
      }],
    );

    expect(result.contacts).toHaveLength(0);
    expect(result.capacities).toHaveLength(0);
  });
});