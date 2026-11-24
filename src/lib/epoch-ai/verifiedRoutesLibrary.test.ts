import { describe, expect, it } from "vitest";
import {
  prepareRouteDraft,
  findPossibleRouteDuplicates,
  type RouteObservationInput,
} from "./verifiedRoutesLibrary";

const sample: RouteObservationInput = {
  origin: "Burgos",
  destination: "Lourdes",
  source: "epoch-tested",
  observedDate: "2025-10-15",
  coachType: "full-size-coach",
  distanceKm: null,
  drivingMinutes: null,
  comfortBreakMinutes: 60,
  lunchMinutes: 90,
  evidenceReference: "Tour Manager route log",
};

describe("Epoch Verified Routes Library", () => {
  it("creates an approval-required draft", () => {
    const draft = prepareRouteDraft(sample);
    expect(draft.status).toBe("draft");
    expect(draft.requiresApproval).toBe(true);
  });

  it("never invents distance or driving time", () => {
    const draft = prepareRouteDraft(sample);
    expect(draft.distanceKm).toBeNull();
    expect(draft.drivingMinutes).toBeNull();
  });

  it("retains actual break and lunch observations", () => {
    const draft = prepareRouteDraft(sample);
    expect(draft.comfortBreakMinutes).toBe(60);
    expect(draft.lunchMinutes).toBe(90);
  });

  it("flags missing operational evidence", () => {
    const draft = prepareRouteDraft({
      ...sample,
      evidenceReference: "",
    });
    expect(draft.warnings.some((w) =>
      w.includes("operational evidence")
    )).toBe(true);
  });

  it("does not treat mapping results as coach verification", () => {
    const draft = prepareRouteDraft({
      ...sample,
      source: "routing-provider",
    });
    expect(draft.warnings.some((w) =>
      w.includes("coach access")
    )).toBe(true);
  });

  it("recognizes potential duplicate routes", () => {
    const first = prepareRouteDraft(sample);
    const second = prepareRouteDraft({
      ...sample,
      origin: "BURGOS",
      destination: "Lourdes ",
    });
    expect(findPossibleRouteDuplicates(second, [first])).toHaveLength(1);
  });

  it("distinguishes different intermediate stops", () => {
    const first = prepareRouteDraft(sample);
    const second = prepareRouteDraft({
      ...sample,
      via: ["San Sebastian"],
    });
    expect(findPossibleRouteDuplicates(second, [first])).toHaveLength(0);
  });

  it("rejects invalid negative durations", () => {
    expect(() => prepareRouteDraft({
      ...sample,
      drivingMinutes: -20,
    })).toThrow();
  });

  it("rejects impossible dates", () => {
    expect(() => prepareRouteDraft({
      ...sample,
      observedDate: "2025-02-30",
    })).toThrow();
  });

  it("retains vehicle classification", () => {
    const draft = prepareRouteDraft({
      ...sample,
      coachType: "minibus",
    });
    expect(draft.coachType).toBe("minibus");
    expect(draft.warnings.some((w) =>
      w.includes("Full-size touring-coach")
    )).toBe(true);
  });
});