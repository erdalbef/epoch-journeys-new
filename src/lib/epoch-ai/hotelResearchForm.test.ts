import { describe, expect, it } from "vitest";
import { publishedHotelVerification } from "./hotelPublicVerification";
import { hotelResearchForm } from "./hotelResearchForm";
import { buildHotelSupplierResearch, type HotelSupplierResearch } from "./hotelSupplierResearch";
import { selectHotelOfficialSiteCandidates } from "./hotelOfficialSiteSelection";
import { extractStructuredHotelResearch } from "./hotelStructuredResearch";

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
  it("fills Bella Sky from the hotel operator's published contact details", () => {
    const name = "AC Hotel Bella Sky Copenhagen";
    const source = "https://bellagroup.dk/en/experiences-and-offers/hotel-offers-at-ac-hotel-bella-sky";
    const profile = publishedHotelVerification(name, "Copenhagen", "Denmark");
    expect(hotelResearchForm(undefined, profile, undefined, undefined)).toMatchObject({
      email: "hotel@bellasky.dk", source, phone: "+45 32 47 30 00",
    });
    expect(selectHotelOfficialSiteCandidates(name, [{
      title: "Bella Sky Hotel Offers | Stays at AC Hotel Bella Sky", url: source, description: "",
    }])).toMatchObject([{ sourceUrl: source, retrievalAuthorized: false }]);
    expect(publishedHotelVerification(name, "Stockholm", "Sweden")).toBeUndefined();
  });

  it("fills the Jönköping reservations phone from an unlabelled official contact line or the published profile", () => {
    const name = "Elite Stora Hotellet";
    const source = "https://www.elite.se/en/hotels/hotels-in-jonkoping/elite-stora-hotellet-jonkoping/";
    const email = "reservations.jonkoping@elite.se";
    const pages = [{
      title: "Elite Stora Hotellet, Jönköping",
      url: source,
      description: `Tel: +46 77 178 87 89 … Group Reservation +46 (0)36 100 000 ${email}`,
    }];
    const research = buildHotelSupplierResearch(name, "Jönköping", pages, selectHotelOfficialSiteCandidates(name, pages),
      extractStructuredHotelResearch(name, pages).contacts, []);
    const profile = publishedHotelVerification("Elite Stora Hotellet, Jönköping", "Jönköping", "Sweden");
    const contact = { email, source, phone: "+46 36 100 000" };
    expect(hotelResearchForm(research, undefined, undefined, undefined)).toMatchObject(contact);
    expect(hotelResearchForm(undefined, profile, undefined, undefined)).toMatchObject(contact);
    expect(publishedHotelVerification(name, "Stockholm", "Sweden")).toBeUndefined();
  });

  it("pre-fills Scandic Södra Kajen from official search evidence or its reviewed profile", () => {
    const name = "Scandic Södra Kajen";
    const source = "https://www.scandichotels.com/en/hotels/scandic-sodra-kajen";
    const pages = [{
      title: "Stay at Scandic Södra Kajen | Hotel in Stockholm",
      url: source,
      description: "Stockholm. Contact us +46 8 517 386 00. Email sodrakajen@scandichotels.com.",
    }];
    const research = buildHotelSupplierResearch(name, "Stockholm", pages, selectHotelOfficialSiteCandidates(name, pages),
      extractStructuredHotelResearch(name, pages).contacts, []);
    const profile = publishedHotelVerification(name, "Stockholm", "Sweden");
    const contact = { email: "sodrakajen@scandichotels.com", source, phone: "+46 8 517 386 00" };
    expect(hotelResearchForm(research, undefined, undefined, undefined)).toMatchObject(contact);
    expect(hotelResearchForm(undefined, profile, undefined, undefined)).toMatchObject(contact);
    expect(publishedHotelVerification(name, "Helsinki", "Finland")).toBeUndefined();
  });

  it("pre-fills the reviewed Scandic property only for Helsinki, Finland", () => {
    const profile = publishedHotelVerification("Scandic Grand Marina", "Helsinki", "Finland");
    expect(hotelResearchForm(undefined, profile, undefined, undefined)).toMatchObject({
      email: "grandmarina@scandichotels.com",
      phone: "+358 300 308 404",
      source: "https://www.scandichotels.com/en/hotels/scandic-grand-marina",
    });
    expect(publishedHotelVerification("Scandic Grand Marina", "Stockholm", "Sweden")).toBeUndefined();
  });
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

  it("uses a retrieved official contact and source without overwriting reviewed edits", () => {
    const sourceUrl = "https://example-hotel.com/official";
    const retrieved = {
      contacts: [{
        email: "events@example-hotel.com", category: "groups" as const,
        sourceUrl, status: "requires-admin-verification" as const,
      }],
      phones: ["+355 4 2235015"], roomCounts: [], sourceUrl, sourceVerified: false as const,
    };
    expect(hotelResearchForm(liveResearch, undefined, undefined, undefined, retrieved)).toMatchObject({
      email: "events@example-hotel.com", source: sourceUrl, phone: "+355 4 2235015",
    });
    expect(hotelResearchForm(liveResearch, undefined, {
      email: "groups@example-hotel.com", source: "https://example-hotel.com/groups",
    }, undefined, retrieved)).toMatchObject({
      email: "groups@example-hotel.com", source: "https://example-hotel.com/groups",
    });
  });

  it("leaves evidence empty for a property with no published sources", () => {
    expect(hotelResearchForm(undefined, undefined, undefined, undefined)).toEqual({
      email: "", source: "", phone: "", facilities: "", contactLink: "",
      facilitiesLink: "", contactReviewKey: ""
    });
  });
});
