import { describe, expect, it } from "vitest";
import { publishedHotelVerification } from "./hotelPublicVerification";

describe("HUMA official group contact", () => {
  it("uses the published group reservations contact", () => {
    const profile = publishedHotelVerification(
      "HUMA Kotor Bay Hotel and Villas"
    );

    expect(profile?.email).toBe("groups@humahotel.me");
    expect(profile?.source).toBe(
      "https://www.humahotel.me/reservation-policy/"
    );
    expect(profile?.contactType).toBe("sales");
  });

  it("does not classify unknown hotels as verified", () => {
    expect(
      publishedHotelVerification("Unknown Example Hotel")
    ).toBeUndefined();
  });
});