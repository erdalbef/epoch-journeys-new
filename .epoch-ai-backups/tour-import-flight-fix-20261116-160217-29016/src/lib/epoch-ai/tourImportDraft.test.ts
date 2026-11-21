import { describe, expect, it } from "vitest";
import { validateTourImportDraft } from "./tourImportDraft";

const sample = {
  title: "Mother Teresa and the Christian Balkans", duration: 13,
  destinations: ["Bosnia and Herzegovina", "Montenegro", "Albania", "North Macedonia", "Kosovo", "Serbia"],
  arrivalCity: "Sarajevo", departureCity: "Belgrade",
  itinerary: "Day 1 – Sarajevo\nArrival and transfer to the hotel.\nDay 2 – Kotor\nDrive through Bosnia to Montenegro, with stops.\nDay 3 – Kotor\nCelebrate Mass and visit Perast.",
  overviewItinerary: "Sarajevo – Kotor – Tirana – Ohrid – Pristina – Skopje – Belgrade",
  reviewNotes: ["Mass times require church confirmation."], sourceDayCount: 13,
};

describe("AI tour import validation", () => {
  it("accepts a complete, consistent draft", () => {
    expect(validateTourImportDraft(sample).duration).toBe(13);
  });
  it("rejects mismatched source day counts", () => {
    expect(() => validateTourImportDraft({ ...sample, sourceDayCount: 12 })).toThrow("day count");
  });
  it("rejects missing itinerary text", () => {
    expect(() => validateTourImportDraft({ ...sample, itinerary: "" })).toThrow();
  });
  it("rejects zero or unreasonable duration", () => {
    expect(() => validateTourImportDraft({ ...sample, duration: 0 })).toThrow();
    expect(() => validateTourImportDraft({ ...sample, duration: 90 })).toThrow();
  });
  it("rejects unstructured or excessive destination list", () => {
    expect(() => validateTourImportDraft({ ...sample, destinations: [] })).toThrow();
  });
});
