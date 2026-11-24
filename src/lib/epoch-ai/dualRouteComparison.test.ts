import { describe, expect, it } from "vitest";
import {
  prepareRouteDraft,
  type RouteObservationInput,
} from "./verifiedRoutesLibrary";
import { compareDualRoutes } from "./dualRouteComparison";

const reviewDate = "2026-11-21";

// Synthetic values for testing only, not real road measurements.
const source: RouteObservationInput = {
  origin: "Burgos",
  destination: "Lourdes",
  source: "epoch-tested",
  observedDate: "2026-10-15",
  coachType: "full-size-coach",
  distanceKm: 300,
  drivingMinutes: 320,
  comfortBreakMinutes: 60,
  lunchMinutes: 90,
  evidenceReference: "Synthetic test record",
};

const estimate: RouteObservationInput = {
  ...source,
  source: "routing-provider",
  observedDate: reviewDate,
  distanceKm: 290,
  drivingMinutes: 285,
};

function compare(
  a: RouteObservationInput = source,
  b: RouteObservationInput = estimate,
) {
  return compareDualRoutes(
    prepareRouteDraft(a),
    prepareRouteDraft(b),
    reviewDate,
  );
}

describe("Epoch dual routing comparison", () => {
  it("compares the same directional route", () => {
    const result = compare();
    expect(result.drivingDifferenceMinutes).toBe(35);
  });

  it("identifies significant driving-time differences", () => {
    expect(compare().status).toBe("significant-difference");
  });

  it("accepts smaller differences for manual review", () => {
    const result = compare(
      { ...source, drivingMinutes: 295 },
      estimate,
    );
    expect(result.status).toBe("comparable");
    expect(result.requiresManualReview).toBe(true);
  });

  it("does not compare different destinations", () => {
    const result = compare(
      source,
      { ...estimate, destination: "Tarbes" },
    );
    expect(result.status).toBe("route-mismatch");
    expect(result.drivingDifferenceMinutes).toBeNull();
  });

  it("does not treat the reverse journey as identical", () => {
    const result = compare(source, {
      ...estimate,
      origin: "Lourdes",
      destination: "Burgos",
    });
    expect(result.status).toBe("route-mismatch");
  });

  it("distinguishes routes with different intermediate stops", () => {
    const result = compare(
      { ...source, via: ["San Sebastian"] },
      estimate,
    );
    expect(result.status).toBe("route-mismatch");
  });

  it("does not invent missing travel times", () => {
    const result = compare(
      { ...source, drivingMinutes: null },
      estimate,
    );
    expect(result.status).toBe("insufficient-evidence");
    expect(result.drivingDifferenceMinutes).toBeNull();
  });

  it("flags old operational observations", () => {
    const result = compare({
      ...source,
      observedDate: "2023-01-01",
    });
    expect(result.warnings.some((w) =>
      w.includes("more than two years old")
    )).toBe(true);
  });

  it("flags vehicle classification differences", () => {
    const result = compare(
      { ...source, coachType: "minibus" },
      estimate,
    );
    expect(result.warnings.some((w) =>
      w.includes("Vehicle classifications")
    )).toBe(true);
  });

  it("detects significant road-distance differences", () => {
    const result = compare(
      { ...source, distanceKm: 350, drivingMinutes: 290 },
      { ...estimate, distanceKm: 290, drivingMinutes: 285 },
    );
    expect(result.status).toBe("significant-difference");
  });

  it("requires the two correct evidence types", () => {
    expect(() => compare(
      { ...source, source: "planning-estimate" },
      estimate,
    )).toThrow();
  });

  it("never approves a route automatically", () => {
    expect(compare().requiresManualReview).toBe(true);
  });
});