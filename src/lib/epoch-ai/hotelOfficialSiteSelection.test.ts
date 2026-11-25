import { describe, expect, it } from "vitest";
import {
  selectHotelOfficialSiteCandidates
} from "./hotelOfficialSiteSelection";

describe("Hotel official-site selection", () => {
  const find = (
    hotelName: string,
    title: string,
    url: string
  ) => selectHotelOfficialSiteCandidates(hotelName, [
    { title, url, description: "Hotel information" }
  ]);

  it("identifies a possible independent hotel website", () => {
    const result = find(
      "HUMA Kotor Bay Hotel and Villas",
      "HUMA Kotor Bay Hotel and Villas - Contact",
      "https://www.humahotel.me/contact/"
    );

    expect(result).toHaveLength(1);
    expect(result[0].retrievalAuthorized).toBe(false);
    expect(result[0].status).toBe("identity-review-required");
  });

  it("recognizes a matching hotel-chain domain", () => {
    expect(find(
      "Courtyard by Marriott Sarajevo",
      "Courtyard by Marriott Sarajevo",
      "https://www.marriott.com/en-us/hotels/example/"
    )).toHaveLength(1);
  });

  it("matches the Scandic property and excludes generic chain pages", () => {
    const hotel = "Scandic Södra Kajen";
    expect(find(hotel, "Stay at Scandic Södra Kajen | Hotel in Stockholm",
      "https://www.scandichotels.com/en/hotels/scandic-sodra-kajen"))
      .toMatchObject([{ retrievalAuthorized: false }]);
    expect(find(hotel, "Scandic hotels in Stockholm", "https://www.scandichotels.com/en")).toEqual([]);
    expect(find(hotel, "Scandic Södra Kajen", "https://www.example.com/hotel")).toEqual([]);
  });

  it("rejects booking platforms", () => {
    expect(find(
      "HUMA Kotor Bay Hotel and Villas",
      "HUMA Kotor Bay Hotel and Villas",
      "https://www.booking.com/hotel/me/huma.html"
    )).toHaveLength(0);
  });

  it("rejects misleading chain domains", () => {
    expect(find(
      "Hyatt Regency Kotor Bay Resort",
      "Hyatt Regency Kotor Bay Resort",
      "https://hyatt.com.evil.example/contact"
    )).toHaveLength(0);
  });

  it("rejects unrelated property titles", () => {
    expect(find(
      "HUMA Kotor Bay Hotel and Villas",
      "Unrelated Luxury Resort",
      "https://humahotel.me/contact/"
    )).toHaveLength(0);
  });

  it("rejects lookalike subdomain suffixes", () => {
    expect(find(
      "HUMA Kotor Bay Hotel and Villas",
      "HUMA Kotor Bay Hotel and Villas",
      "https://humahotel.me.evil.example/contact/"
    )).toHaveLength(0);
  });

  it("does not authorize retrieval even with a matching name", () => {
    const result = find(
      "HUMA Kotor Bay Hotel and Villas",
      "HUMA Kotor Bay Hotel and Villas",
      "https://humahotel.me/reservation-policy/"
    );

    expect(result[0]?.retrievalAuthorized).toBe(false);
  });
});
