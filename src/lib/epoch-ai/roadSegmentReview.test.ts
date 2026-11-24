import { describe, expect, it } from "vitest";
import { reviewRoadSegments } from "./roadSegmentReview";

const segment = {
  from: "Lisbon",
  to: "Fatima",
  distanceKm: 130,
  drivingMinutes: 100,
  evidence: "planning-estimate" as const,
  coachAccess: "unverified" as const,
};

describe("Epoch road segment review", () => {
  it("totals explicitly supplied route metrics", () => {
    const result = reviewRoadSegments([segment, {
      ...segment, from: "Fatima", to: "Coimbra",
      distanceKm: 90, drivingMinutes: 70,
    }]);
    expect(result.totalDistanceKm).toBe(220);
    expect(result.totalDrivingMinutes).toBe(170);
  });

  it("flags driving without a required comfort break", () => {
    const result = reviewRoadSegments([
      segment,
      { ...segment, from: "Fatima", to: "Coimbra" },
    ]);
    expect(result.warnings.some(w =>
      w.includes("without a documented adequate break")
    )).toBe(true);
  });

  it("recognizes a 30-minute break between segments", () => {
    const result = reviewRoadSegments([
      { ...segment, breakAfterMinutes: 30 },
      { ...segment, from: "Fatima", to: "Coimbra" },
    ]);
    expect(result.recordedBreakMinutes).toBe(30);
    expect(result.recommendedBreakCount).toBe(1);
    expect(result.warnings.some(w =>
      w.includes("without a documented adequate break")
    )).toBe(false);
  });

  it("does not accept a short break as adequate", () => {
    const result = reviewRoadSegments([
      { ...segment, breakAfterMinutes: 10 },
      { ...segment, from: "Fatima", to: "Coimbra" },
    ]);
    expect(result.warnings.some(w =>
      w.includes("shorter than 30 minutes")
    )).toBe(true);
  });

  it("does not invent unknown driving times", () => {
    const result = reviewRoadSegments([{
      ...segment, distanceKm: null, drivingMinutes: null,
      evidence: "unavailable",
    }]);
    expect(result.totalDrivingMinutes).toBeNull();
    expect(result.totalDistanceKm).toBeNull();
    expect(result.recommendedBreakCount).toBeNull();
  });

  it("flags a reported coach restriction", () => {
    const result = reviewRoadSegments([{
      ...segment, coachAccess: "restriction-reported",
    }]);
    expect(result.warnings.some(w =>
      w.includes("coach restriction reported")
    )).toBe(true);
  });

  it("never equates car routing with coach verification", () => {
    const result = reviewRoadSegments([{
      ...segment, evidence: "routing-service",
    }]);
    expect(result.coachRouteVerified).toBe(false);
    expect(result.requiresManualReview).toBe(true);
  });

  it("rejects invalid negative driving durations", () => {
    expect(() => reviewRoadSegments([{
      ...segment, drivingMinutes: -5,
    }])).toThrow();
  });

  it("does not count a break after the last segment", () => {
    const result = reviewRoadSegments([{
      ...segment, breakAfterMinutes: 30,
    }]);
    expect(result.recordedBreakMinutes).toBe(0);
  });

  it("requires review when no segments are available", () => {
    const result = reviewRoadSegments([]);
    expect(result.requiresManualReview).toBe(true);
    expect(result.totalDrivingMinutes).toBeNull();
  });
});