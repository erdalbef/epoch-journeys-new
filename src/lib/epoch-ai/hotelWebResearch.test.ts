import { describe, expect, it } from "vitest";
import { extractDistinctHotelCandidates } from "./hotelWebResearch";

describe("Hotel discovery names", () => {
  const url = "https://www.hyatt.com/unbound-collection/en-US/arnub-hotel-reisen";
  const property = (title: string) => ({ title, url, description: "" });

  it("uses the property's name after a generic destination or rating headline", () => {
    const lead = property("5-Star Luxury Hotel in Gamla Stan, Stockholm | Hôtel Reisen");
    expect(extractDistinctHotelCandidates([lead], [])).toMatchObject([{ name: "Hôtel Reisen", sourceUrl: url }]);
    expect(extractDistinctHotelCandidates([lead], ["Hotel Reisen"])).toEqual([]);
  });

  it("omits headlines that have no property name and keeps normal titles", () => {
    expect(extractDistinctHotelCandidates([
      property("5-Star Luxury Hotel in Gamla Stan, Stockholm | The Unbound Collection by Hyatt"),
    ], [])).toEqual([]);
    expect(extractDistinctHotelCandidates([
      property("Grand Hôtel | Stockholm"),
    ], [])).toMatchObject([{ name: "Grand Hôtel" }]);
  });
});
