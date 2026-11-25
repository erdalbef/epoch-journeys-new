import { describe, expect, it } from "vitest";
import { publishedHotelVerification } from "./hotelPublicVerification";
import { hotelResearchForm } from "./hotelResearchForm";
import type { HotelSupplierResearch } from "./hotelSupplierResearch";

const liveResearch: HotelSupplierResearch = {
  contacts: [{
    email: "groups@example-hotel.com",
    sourceUrl: "https://example-hotel.com/groups",
    sourceTitle: "Example hotel groups",
    status: "requires-admin-verification",
    category: "groups"
  }],
  phone: {number: "+355 4 2235000", sourceUrl: "https://example-hotel.com/contact"},
  suggestedFacilitiesSource: "https://example-hotel.com/meeting-rooms",
  facilities: []
};

describe("Hotel research form", () => {
  it("populates the recipient and evidence fields from live research without an edit", () => {
    expect(hotelResearchForm(liveResearch, undefined, undefined, undefined)).toMatchObject({
      email: "groups@example-hotel.com",
      source: "https://example-hotel.com/groups",
      phone: "+355 4 2235000",
      facilities: "https://example-hotel.com/meeting-rooms"
    });
  });

  it("uses the published Rogner contact and facilities when search returns no evidence", () => {
    const profile = publishedHotelVerification("Rogner Hotel Tirana", "Tirana", "Albania");
    expect(hotelResearchForm({contacts: [], facilities: []}, profile, undefined, undefined)).toMatchObject({
      email: "info.tirana@rogner.com",
      source: "https://www.hotel-europapark.com/en/contact-info.html",
      phone: "+355 4 2235035",
      facilities: "https://www.hotel-europapark.com/en/mice.html"
    });
    expect(publishedHotelVerification("Rogner Hotel Tirana", "Skopje", "North Macedonia")).toBeUndefined();
  });

  it("keeps manual edits and ties contact review to the displayed email and source", () => {
    const original = hotelResearchForm(liveResearch, undefined, undefined, undefined);
    const edited = hotelResearchForm(liveResearch, undefined, {
      email: original.email,
      source: "https://example-hotel.com/contact",
      phone: ""
    }, "");
    expect(edited).toMatchObject({
      email: original.email,
      source: "https://example-hotel.com/contact",
      phone: "",
      facilities: ""
    });
    expect(edited.contactReviewKey).not.toBe(original.contactReviewKey);
    expect(hotelResearchForm(liveResearch, undefined, {email: ""}, undefined).contactReviewKey).toBe("");
  });

  it("leaves evidence empty for a property with no published sources", () => {
    expect(hotelResearchForm(undefined, undefined, undefined, undefined)).toEqual({
      email: "", source: "", phone: "", facilities: "", contactLink: "",
      facilitiesLink: "", contactReviewKey: ""
    });
  });
});
