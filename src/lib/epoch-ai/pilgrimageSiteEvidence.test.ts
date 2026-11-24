import { describe, expect, it } from "vitest";
import {
  extractPilgrimageSites,
  comparePilgrimageSites,
} from "./pilgrimageSiteEvidence";

describe("Pilgrimage-site evidence", () => {
  it("extracts explicitly labeled visits", () => {
    const result = extractPilgrimageSites(
      "Day 1 - Fatima\nVisit: Sanctuary of Fatima"
    );
    expect(result.days[0].sites).toEqual(["Sanctuary of Fatima"]);
  });

  it("supports multiple explicit sites", () => {
    const result = extractPilgrimageSites(
      "Day 1 - Fatima\nShrine visit: Sanctuary; Chapel of Apparitions"
    );
    expect(result.days[0].sites).toHaveLength(2);
  });

  it("does not invent visits from day headings", () => {
    const result = extractPilgrimageSites("Day 1 - Lourdes");
    expect(result.days[0].sites).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("does not treat a Mass label as a visit label", () => {
    const result = extractPilgrimageSites(
      "Day 1 - Fatima\nMass: Chapel of Apparitions"
    );
    expect(result.days[0].sites).toEqual([]);
  });

  it("flags a potentially omitted shrine", () => {
    const original = extractPilgrimageSites(
      "Day 1 - Fatima\nVisit: Sanctuary of Fatima"
    );
    const proposed = extractPilgrimageSites(
      "Day 1 - Fatima\nVisit: Other church"
    );
    expect(comparePilgrimageSites(original, proposed)).toHaveLength(1);
  });

  it("does not falsely flag accent changes", () => {
    const original = extractPilgrimageSites(
      "Day 1 - Fatima\nVisit: Santuario de Fatima"
    );
    const proposed = extractPilgrimageSites(
      "Day 1 - Fatima\nVisit: Santuário de Fátima"
    );
    expect(comparePilgrimageSites(original, proposed)).toHaveLength(0);
  });

  it("treats a moved visit as requiring review", () => {
    const original = extractPilgrimageSites(
      "Day 1 - Fatima\nVisit: Sanctuary of Fatima\nDay 2 - Coimbra"
    );
    const proposed = extractPilgrimageSites(
      "Day 1 - Fatima\nDay 2 - Coimbra\nVisit: Sanctuary of Fatima"
    );
    expect(comparePilgrimageSites(original, proposed)).toHaveLength(1);
  });

  it("does not treat unresolved placeholders as verified sites", () => {
    const result = extractPilgrimageSites(
      "Day 1 - Fatima\nVisit: To be confirmed"
    );
    expect(result.days[0].sites).toHaveLength(0);
  });
});