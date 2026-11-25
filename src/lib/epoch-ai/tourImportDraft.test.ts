import { describe, expect, it } from "vitest";
import { validateTourImportDraft } from "./tourImportDraft";

const sample = {
  title: "Mother Teresa and the Christian Balkans", duration: 13,
  destinations: ["Bosnia and Herzegovina", "Montenegro", "Albania", "North Macedonia", "Kosovo", "Serbia"],
  arrivalCity: "Sarajevo", departureCity: "Belgrade",
  itinerary: "Day 1 – Sarajevo\nArrival and transfer to the hotel.\nDay 2 – Kotor\nDrive through Bosnia to Montenegro, with stops.\nDay 3 – Kotor\nCelebrate Mass and visit Perast.",
  overviewItinerary: "Sarajevo – Kotor – Tirana – Ohrid – Pristina – Skopje – Belgrade",
  reviewNotes: ["Mass times require church confirmation."], sourceDayCount: 13,
  hotelNights: 12, dayOnePattern: "same_day_flight_and_arrival",
};

describe("AI tour import validation", () => {
  it("accepts a complete, consistent draft", () => {
    expect(validateTourImportDraft(sample).duration).toBe(13);
  });
  it("retains source hotel nights and same-day travel classification", () => {
    const result = validateTourImportDraft(sample);
    expect(result.hotelNights).toBe(12);
    expect(result.dayOnePattern).toBe("same_day_flight_and_arrival");
  });
  it("allows hotel nights to be unknown rather than invent a count", () => {
    expect(validateTourImportDraft({ ...sample, hotelNights: null }).hotelNights).toBeNull();
  });
  it("rejects impossible hotel-night counts", () => {
    expect(() => validateTourImportDraft({ ...sample, hotelNights: 13 })).toThrow("Hotel-night");
  });
  it("rejects mismatched source day counts", () => {
    expect(() => validateTourImportDraft({ ...sample, sourceDayCount: 12 })).toThrow("day count (12) does not match the stated duration (13 days)");
  });
  it("rejects missing itinerary text", () => {
    expect(() => validateTourImportDraft({ ...sample, itinerary: "" })).toThrow("these fields: itinerary");
  });
  it("rejects zero or unreasonable duration", () => {
    expect(() => validateTourImportDraft({ ...sample, duration: 0 })).toThrow();
    expect(() => validateTourImportDraft({ ...sample, duration: 90 })).toThrow();
  });
  it("rejects unstructured or excessive destination list", () => {
    expect(() => validateTourImportDraft({ ...sample, destinations: [] })).toThrow();
  });
});
