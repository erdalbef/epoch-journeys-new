import { describe, expect, it } from "vitest";
import {
  reviewItineraryChanges,
  type ProtectedItinerary,
} from "./itineraryChangeReview";

const original: ProtectedItinerary = {
  days: [
    {
      day: 1,
      overnightCity: "Lisbon",
      pilgrimageSites: ["Santarem"],
      massPlan: "Mass requested",
      dayType: "arrival",
    },
    {
      day: 2,
      overnightCity: "Fatima",
      pilgrimageSites: ["Sanctuary of Fatima"],
      massPlan: "Mass at the shrine requested",
      dayType: "touring",
    },
  ],
};

const copy = (): ProtectedItinerary =>
  JSON.parse(JSON.stringify(original)) as ProtectedItinerary;

describe("Original itinerary protection", () => {
  it("accepts an unchanged itinerary", () => {
    expect(reviewItineraryChanges(original, copy()).findings)
      .toHaveLength(0);
  });

  it("detects an overnight city change", () => {
    const proposal = copy();
    proposal.days[1].overnightCity = "Coimbra";
    expect(reviewItineraryChanges(original, proposal).findings
      .some((f) => f.category === "overnight-city")).toBe(true);
  });

  it("detects a removed pilgrimage site", () => {
    const proposal = copy();
    proposal.days[1].pilgrimageSites = [];
    expect(reviewItineraryChanges(original, proposal).findings
      .some((f) => f.category === "pilgrimage-site")).toBe(true);
  });

  it("detects a changed Mass arrangement", () => {
    const proposal = copy();
    proposal.days[0].massPlan = "";
    expect(reviewItineraryChanges(original, proposal).findings
      .some((f) => f.category === "mass-plan")).toBe(true);
  });

  it("detects removed days", () => {
    const proposal = copy();
    proposal.days.pop();
    expect(reviewItineraryChanges(original, proposal).requiresApproval)
      .toBe(true);
  });

  it("detects a changed arrival day", () => {
    const proposal = copy();
    proposal.days[0].dayType = "flight_only";
    expect(reviewItineraryChanges(original, proposal).findings
      .some((f) => f.category === "day-type")).toBe(true);
  });

  it("ignores accent-only differences", () => {
    const proposal = copy();
    proposal.days[1].overnightCity = "Fátima";
    expect(reviewItineraryChanges(original, proposal).findings)
      .toHaveLength(0);
  });
});