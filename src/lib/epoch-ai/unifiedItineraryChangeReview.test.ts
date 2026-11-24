import { describe, expect, it } from "vitest";
import {
  reviewWrittenItineraryChanges,
} from "./unifiedItineraryChangeReview";

const original = [
  "Day 1 - Lisbon",
  "Visit: Cathedral of Lisbon",
  "Mass: Requested at cathedral",
  "Overnight: Lisbon",
  "Day 2 - Fatima",
  "Visit: Sanctuary of Fatima",
  "Mass: Requested at shrine",
  "Overnight: Fatima",
].join("\n");

describe("Unified itinerary change review", () => {
  it("never declares unchanged itineraries automatically approved", () => {
    const result = reviewWrittenItineraryChanges(
      original, original, 2
    );
    expect(result.requiresReview).toBe(true);
    expect(result.status).toBe("review-required");
  });

  it("detects an overnight change", () => {
    const proposal = original.replace(
      "Overnight: Fatima", "Overnight: Coimbra"
    );
    const result = reviewWrittenItineraryChanges(
      original, proposal, 2
    );
    expect(result.detectedChanges.some(
      (finding) => finding.category === "overnight"
    )).toBe(true);
  });

  it("detects changed Mass arrangements", () => {
    const proposal = original.replace(
      "Mass: Requested at shrine", "Mass: Requested at hotel"
    );
    const result = reviewWrittenItineraryChanges(
      original, proposal, 2
    );
    expect(result.detectedChanges.some(
      (finding) => finding.category === "mass"
    )).toBe(true);
  });

  it("flags a possibly omitted pilgrimage visit", () => {
    const proposal = original.replace(
      "Visit: Sanctuary of Fatima", "Visit: Other church"
    );
    const result = reviewWrittenItineraryChanges(
      original, proposal, 2
    );
    expect(result.possibleSiteChanges).toHaveLength(1);
  });

  it("requires review when both itineraries lack detail", () => {
    const result = reviewWrittenItineraryChanges(
      "Day 1 - Lisbon\nDay 2 - Fatima",
      "Day 1 - Lisbon\nDay 2 - Fatima",
      2
    );
    expect(result.requiresReview).toBe(true);
    expect(result.unverifiedDetails.length).toBeGreaterThan(0);
  });

  it("flags missing proposed Mass evidence as unverified", () => {
    const proposal = original.replace(
      "Mass: Requested at shrine", ""
    );
    const result = reviewWrittenItineraryChanges(
      original, proposal, 2
    );
    expect(result.unverifiedDetails.some(
      (warning) => warning.includes("Day 2: mass comparison")
    )).toBe(true);
  });

  it("does not mistake accent changes for confirmed changes", () => {
    const proposal = original.replace(
      "Overnight: Fatima", "Overnight: Fátima"
    );
    const result = reviewWrittenItineraryChanges(
      original, proposal, 2
    );
    expect(result.detectedChanges).toHaveLength(0);
    expect(result.requiresReview).toBe(true);
  });

  it("flags a missing itinerary day", () => {
    const proposal = [
      "Day 1 - Lisbon",
      "Visit: Cathedral of Lisbon",
      "Mass: Requested at cathedral",
      "Overnight: Lisbon",
    ].join("\n");

    const result = reviewWrittenItineraryChanges(
      original, proposal, 2
    );
    expect(result.unverifiedDetails.some(
      (warning) => warning.includes("Day 2")
    )).toBe(true);
  });

  it("never treats empty itineraries as verified", () => {
    const result = reviewWrittenItineraryChanges("", "", 2);
    expect(result.status).toBe("review-required");
    expect(result.requiresReview).toBe(true);
  });

  it("reports consistent finding counts", () => {
    const result = reviewWrittenItineraryChanges(
      original, original.replace(
        "Overnight: Fatima", "Overnight: Coimbra"
      ), 2
    );

    expect(result.summary.detectedChanges)
      .toBe(result.detectedChanges.length);
    expect(result.summary.possibleSiteChanges)
      .toBe(result.possibleSiteChanges.length);
    expect(result.summary.unverifiedDetails)
      .toBe(result.unverifiedDetails.length);
  });
});