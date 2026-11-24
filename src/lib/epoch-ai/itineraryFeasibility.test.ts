import { describe, expect, it } from "vitest";
import { assessDailyFeasibility } from "./itineraryFeasibility";

const baseline = {
  day: 4,
  drivingMinutes: 270,
  drivingEvidence: "planning-estimate" as const,
  visitMinutes: 120,
  massMinutes: 60,
  lunchMinutes: 90,
  operationalBufferMinutes: 30,
};

describe("Epoch daily itinerary feasibility", () => {
  it("calculates an explicit time budget", () => {
    const result = assessDailyFeasibility(baseline);
    expect(result.recommendedBreaks).toBe(2);
    expect(result.breakMinutes).toBe(60);
    expect(result.totalMinutes).toBe(630);
    expect(result.status).toBe("long-day");
  });

  it("uses 30-minute breaks after approximate two-hour blocks", () => {
    const result = assessDailyFeasibility({
      ...baseline, drivingMinutes: 240,
    });
    expect(result.recommendedBreaks).toBe(1);
  });

  it("does not invent a driving time when unavailable", () => {
    const result = assessDailyFeasibility({
      ...baseline,
      drivingMinutes: null,
      drivingEvidence: "unavailable",
    });
    expect(result.totalMinutes).toBeNull();
    expect(result.recommendedBreaks).toBeNull();
  });

  it("flags lunch shorter than 90 minutes", () => {
    const result = assessDailyFeasibility({
      ...baseline, lunchMinutes: 60,
    });
    expect(result.warnings.some((w) =>
      w.includes("shorter than the Epoch Standard")
    )).toBe(true);
  });

  it("flags unusually long days", () => {
    const result = assessDailyFeasibility({
      ...baseline, visitMinutes: 240,
    });
    expect(result.status).toBe("high-risk");
  });

  it("does not claim coach routing is verified", () => {
    const result = assessDailyFeasibility({
      ...baseline, drivingEvidence: "route-service",
    });
    expect(result.warnings.some((w) =>
      w.includes("full-size coach")
    )).toBe(true);
  });

  it("requires review of fixed appointments", () => {
    const result = assessDailyFeasibility({
      ...baseline, fixedAppointments: true,
    });
    expect(result.warnings.some((w) =>
      w.includes("fixed Mass")
    )).toBe(true);
  });

  it("rejects invalid negative durations", () => {
    expect(() => assessDailyFeasibility({
      ...baseline, drivingMinutes: -10,
    })).toThrow();
  });

  it("does not invent an unknown Mass duration", () => {
    const result = assessDailyFeasibility({
      ...baseline, massMinutes: null,
    });
    expect(result.totalMinutes).toBeNull();
    expect(result.requiresManualReview).toBe(true);
  });

  it("never automatically approves a feasible-looking day", () => {
    const result = assessDailyFeasibility({
      ...baseline,
      drivingMinutes: 60,
      visitMinutes: 90,
    });
    expect(result.status).toBe("review-required");
    expect(result.requiresManualReview).toBe(true);
  });
});