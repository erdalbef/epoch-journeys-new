import { describe, expect, it } from "vitest";
import { extractHotelOfficialPage } from "./hotelOfficialPageExtraction";

describe("Hotel official-page extraction", () => {
  const url = "https://hotel.example.com/contact";

  it("finds and prioritizes a group reservations contact", () => {
    const html = `
      <a href="mailto:info@hotel.example.com">General</a>
      <a href="mailto:groups@hotel.example.com">Groups</a>
      <a href="mailto:reservations@hotel.example.com">Reservations</a>
    `;

    const result = extractHotelOfficialPage(html, url);

    expect(result.contacts.map(c => c.category))
      .toEqual(["groups", "reservations", "general"]);
    expect(result.contacts[0].status)
      .toBe("requires-admin-verification");
    expect(result.sourceVerified).toBe(false);
  });

  it("finds published room counts and telephone links", () => {
    const html = `
      <p>The hotel offers 128 guest rooms.</p>
      <a href="tel:+38267075484">Telephone</a>
    `;

    const result = extractHotelOfficialPage(html, url);

    expect(result.roomCounts).toContain(128);
    expect(result.phones).toContain("+38267075484");
  });

  it("does not extract script content as a contact", () => {
    const result = extractHotelOfficialPage(
      '<script>const email = "fake@hotel.example.com";</script>',
      url
    );

    expect(result.contacts).toHaveLength(0);
  });

  it("rejects unsafe URLs", () => {
    expect(() =>
      extractHotelOfficialPage("Hello", "http://localhost/private")
    ).toThrow();
  });
});