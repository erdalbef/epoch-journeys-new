import { describe, expect, it } from "vitest";
import { buildRouteFeasibilitySummary } from "./routeFeasibilitySummary";
import { prepareRouteDraft } from "./verifiedRoutesLibrary";

const segments = [
  {
    from: "Lisbon",
    to: "Fatima",
    distanceKm: 120,
    drivingMinutes: 100,
    evidence: "planning-estimate" as const,
    coachAccess: "unverified" as const,
    breakAfterMinutes: 30,
  },
  {
    from: "Fatima",
    to: "Coimbra",
    distanceKm: 90,
    drivingMinutes: 70,
    evidence: "planning-estimate" as const,
    coachAccess: "unverified" as const,
  },
];

const day = {
  day: 4,
  visitMinutes: 120,
  massMinutes: 60,
  lunchMinutes: 90,
  operationalBufferMinutes: 30,
};

describe("Combined route feasibility summary", () => {
  it("combines route and daily planning times", () => {
    const result = buildRouteFeasibilitySummary({ day, segments });
    expect(result.distanceKm).toBe(210);
    expect(result.drivingMinutes).toBe(170);
    expect(result.estimatedDailyMinutes).toBe(500);
  });

  it("retains documented break durations separately", () => {
    const result = buildRouteFeasibilitySummary({ day, segments });
    expect(result.documentedBreakMinutes).toBe(30);
    expect(result.recommendedBreakCount).toBe(1);
  });

  it("blocks disconnected segments for review", () => {
    const result = buildRouteFeasibilitySummary({
      day,
      segments: [
        segments[0],
        { ...segments[1], from: "Porto" },
      ],
    });
    expect(result.status).toBe("blocked-for-review");
  });

  it("does not invent missing driving data", () => {
    const result = buildRouteFeasibilitySummary({
      day,
      segments: [{
        ...segments[0],
        distanceKm: null,
        drivingMinutes: null,
        evidence: "unavailable",
      }],
    });
    expect(result.drivingMinutes).toBeNull();
    expect(result.estimatedDailyMinutes).toBeNull();
    expect(result.status).toBe("blocked-for-review");
  });

  it("flags excessively long daily schedules", () => {
    const result = buildRouteFeasibilitySummary({
      day: { ...day, visitMinutes: 400 },
      segments,
    });
    expect(result.status).toBe("attention-required");
  });

  it("retains comparison discrepancies for review", () => {
    const base = {
      origin: "Lisbon",
      destination: "Coimbra",
      via: ["Fatima"],
      observedDate: "2026-10-01",
      coachType: "full-size-coach" as const,
      distanceKm: 210,
      drivingMinutes: 230,
      comfortBreakMinutes: 30,
      lunchMinutes: 90,
    };

    const testedRoute = prepareRouteDraft({
      ...base,
      source: "epoch-tested",
      evidenceReference: "Synthetic test log",
    });

    const providerRoute = prepareRouteDraft({
      ...base,
      source: "routing-provider",
      observedDate: "2026-11-21",
      drivingMinutes: 170,
    });

    const result = buildRouteFeasibilitySummary({
      day,
      segments,
      testedRoute,
      providerRoute,
      reviewDate: "2026-11-21",
    });

    expect(result.comparison?.status).toBe("significant-difference");
    expect(result.status).toBe("attention-required");
  });

  it("does not compare incomplete source pairs", () => {
    const testedRoute = prepareRouteDraft({
      origin: "Lisbon",
      destination: "Coimbra",
      source: "epoch-tested",
      observedDate: "2026-10-01",
      coachType: "full-size-coach",
      distanceKm: null,
      drivingMinutes: 180,
      comfortBreakMinutes: 30,
      lunchMinutes: 90,
    });

    const result = buildRouteFeasibilitySummary({
      day, segments, testedRoute,
    });

    expect(result.comparison).toBeNull();
    expect(result.warnings.some((w) =>
      w.includes("comparison is incomplete")
    )).toBe(true);
  });

  it("always requires human review", () => {
    const result = buildRouteFeasibilitySummary({ day, segments });
    expect(result.requiresManualReview).toBe(true);
  });

  it("does not double-count documented comfort breaks", () => {
    const result = buildRouteFeasibilitySummary({ day, segments });
    expect(result.breakMinutesInBudget).toBe(30);
    expect(result.estimatedDailyMinutes).toBe(500);
  });

  it("counts longer documented breaks once", () => {
    const result = buildRouteFeasibilitySummary({
      day,
      segments: [
        { ...segments[0], breakAfterMinutes: 60 },
        segments[1],
      ],
    });
    expect(result.documentedBreakMinutes).toBe(60);
    expect(result.breakMinutesInBudget).toBe(60);
    expect(result.estimatedDailyMinutes).toBe(530);
  });

  it("retains estimated allowance without documented breaks", () => {
    const result = buildRouteFeasibilitySummary({
      day,
      segments: [
        { ...segments[0], breakAfterMinutes: 0 },
        segments[1],
      ],
    });
    expect(result.documentedBreakMinutes).toBe(0);
    expect(result.breakMinutesInBudget).toBe(30);
    expect(result.estimatedDailyMinutes).toBe(500);
    expect(result.warnings.some(w =>
      w.includes("adequate en-route breaks documented")
    )).toBe(true);
  });

  it("does not fabricate a budget with missing road time", () => {
    const result = buildRouteFeasibilitySummary({
      day,
      segments: [{
        ...segments[0],
        distanceKm: null,
        drivingMinutes: null,
        evidence: "unavailable",
      }],
    });
    expect(result.breakMinutesInBudget).toBeNull();
    expect(result.estimatedDailyMinutes).toBeNull();
    expect(result.status).toBe("blocked-for-review");
  });

  it("flags a long reconciled schedule", () => {
    const result = buildRouteFeasibilitySummary({
      day,
      segments: [
        { ...segments[0], breakAfterMinutes: 90 },
        segments[1],
      ],
    });
    expect(result.estimatedDailyMinutes).toBe(560);
    expect(result.status).toBe("attention-required");
  });
});