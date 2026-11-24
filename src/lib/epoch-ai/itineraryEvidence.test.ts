import { describe, expect, it } from "vitest";
import {
  extractItineraryEvidence,
  compareItineraryEvidence,
} from "./itineraryEvidence";

describe("Itinerary evidence extraction", () => {
  it("recognizes explicitly labeled arrangements", () => {
    const text = [
      "Day 1 - Lisbon",
      "Mass: Requested at church",
      "Overnight: Lisbon",
      "Day 2 - Fatima",
      "Mass: Requested at shrine",
      "Overnight: Fatima",
    ].join("\n");

    const evidence = extractItineraryEvidence(text, 2);

    expect(evidence.days).toHaveLength(2);
    expect(evidence.days[1].overnight).toBe("Fatima");
    expect(evidence.days[1].mass).toBe("Requested at shrine");
  });

  it("does not invent overnight cities from headings", () => {
    const evidence = extractItineraryEvidence(
      "Day 1 - Lisbon\nDay 2 - Fatima", 2
    );
    expect(evidence.days[1].overnight).toBeNull();
    expect(evidence.warnings).toContain(
      "Day 2: overnight information not established."
    );
  });

  it("does not claim pilgrimage-site verification", () => {
    const evidence = extractItineraryEvidence(
      "Day 1 - Sanctuary of Fatima", 1
    );
    expect(evidence.pilgrimageSitesVerified).toBe(false);
  });

  it("detects missing numbered days", () => {
    const evidence = extractItineraryEvidence(
      "Day 1 - Lisbon\nDay 3 - Porto", 3
    );
    expect(evidence.warnings).toContain("Day 2 is missing.");
  });

  it("detects duplicate day headings", () => {
    const evidence = extractItineraryEvidence(
      "Day 1 - Lisbon\nDay 1 - Fatima", 2
    );
    expect(evidence.warnings).toContain(
      "Duplicate itinerary day headings."
    );
  });

  it("flags explicitly changed overnight text", () => {
    const before = extractItineraryEvidence(
      "Day 1 - Tour\nOvernight: Fatima\nMass: Requested", 1
    );
    const after = extractItineraryEvidence(
      "Day 1 - Tour\nOvernight: Coimbra\nMass: Requested", 1
    );
    const changes = compareItineraryEvidence(before, after);
    expect(changes.some((change) =>
      change.category === "overnight"
    )).toBe(true);
  });

  it("does not treat missing evidence as agreement", () => {
    const before = extractItineraryEvidence(
      "Day 1 - Tour\nOvernight: Fatima", 1
    );
    const after = extractItineraryEvidence(
      "Day 1 - Tour", 1
    );
    expect(compareItineraryEvidence(before, after)).toHaveLength(0);
    expect(after.warnings.length).toBeGreaterThan(0);
  });

  it("ignores accent-only differences", () => {
    const before = extractItineraryEvidence(
      "Day 1 - Tour\nOvernight: Fatima", 1
    );
    const after = extractItineraryEvidence(
      "Day 1 - Tour\nOvernight: Fátima", 1
    );
    expect(compareItineraryEvidence(before, after)).toHaveLength(0);
  });
});