import { describe, expect, it } from "vitest";
import {
  authorizedHotelResearchPages,
  authorizeHotelResearchUrl
} from "./hotelOfficialRetrievalPolicy";

const huma = "HUMA Kotor Bay Hotel and Villas";
const contact = "https://www.humahotel.me/reservation-policy/";
const facilities = "https://www.humahotel.me/accomodation/";

describe("Property-specific hotel website retrieval policy", () => {
  it("lists only HUMA's explicitly approved research pages", () => {
    const pages = authorizedHotelResearchPages(huma);

    expect(pages).toHaveLength(2);
    expect(pages.map(page => page.url)).toEqual([
      contact,
      facilities
    ]);
    expect(pages.every(page =>
      page.status === "research-retrieval-only"
    )).toBe(true);
  });

  it("does not associate HUMA's pages with Sarajevo hotels", () => {
    expect(
      authorizeHotelResearchUrl(
        "Courtyard by Marriott Sarajevo",
        contact
      )
    ).toBeNull();

    expect(
      authorizedHotelResearchPages(
        "Courtyard by Marriott Sarajevo"
      )
    ).toEqual([]);
  });

  it("authorizes the exact HUMA contact page only for HUMA", () => {
    const result = authorizeHotelResearchUrl(huma, contact);

    expect(result?.purpose).toBe("contact");
    expect(result?.hotelName).toBe(huma);
  });

  it("rejects lookalike and unrelated domains", () => {
    for (const url of [
      "https://humahotel.me.evil.example/reservation-policy/",
      "https://humahotel-me.example/reservation-policy/",
      "https://www.booking.com/hotel/me/huma.html",
      "https://www.marriott.com/en-us/hotels/sjjcy/"
    ]) {
      expect(authorizeHotelResearchUrl(huma, url)).toBeNull();
    }
  });

  it("rejects altered paths, queries and fragments", () => {
    for (const url of [
      "https://www.humahotel.me/admin/",
      contact + "?next=/private",
      contact + "#contact",
      "https://www.humahotel.me/",
      "https://www.humahotel.me/reservation-policy/../"
    ]) {
      expect(authorizeHotelResearchUrl(huma, url)).toBeNull();
    }
  });

  it("rejects insecure URLs, credentials and unknown hotels", () => {
    expect(
      authorizeHotelResearchUrl(
        huma,
        "http://www.humahotel.me/reservation-policy/"
      )
    ).toBeNull();

    expect(
      authorizeHotelResearchUrl(
        huma,
        "https://user:pass@www.humahotel.me/reservation-policy/"
      )
    ).toBeNull();

    expect(
      authorizeHotelResearchUrl(
        "Unverified Hotel",
        facilities
      )
    ).toBeNull();
  });
});