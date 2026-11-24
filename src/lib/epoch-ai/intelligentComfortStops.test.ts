import { describe, expect, it } from "vitest";
import {
  planIntelligentComfortStops,
  type ComfortStopCandidate,
} from "./intelligentComfortStops";

const candidate = (
  name: string,
  minute: number,
  overrides: Partial<ComfortStopCandidate> = {}
): ComfortStopCandidate => ({
  name,
  drivingMinutesFromStart: minute,
  breakMinutes: 30,
  kind: "comfort",
  coachAccess: "confirmed",
  toilets: "confirmed",
  accessibility: "confirmed",
  openingHours: "confirmed",
  groupCapacity: "confirmed",
  detourMinutes: 5,
  evidenceReference: "Synthetic fixture - not real-world verification",
  ...overrides,
});

describe("Intelligent comfort stop planning", () => {
  it("selects suitable stops near two-hour intervals", () => {
    const result = planIntelligentComfortStops({
      totalDrivingMinutes: 300,
      candidates: [candidate("Stop A", 105), candidate("Stop B", 230)],
    });
    expect(result.proposedStops.map((s) => s.name)).toEqual(["Stop A", "Stop B"]);
    expect(result.status).toBe("candidate-review");
    expect(result.requiresManualReview).toBe(true);
  });

  it("accepts a suitable stop before exactly two hours", () => {
    const result = planIntelligentComfortStops({
      totalDrivingMinutes: 225,
      candidates: [candidate("Stop A", 105)],
    });
    expect(result.proposedStops).toHaveLength(1);
  });

  it("rejects stops without confirmed coach access", () => {
    const result = planIntelligentComfortStops({
      totalDrivingMinutes: 260,
      candidates: [candidate("Unknown parking", 120, { coachAccess: "unverified" })],
    });
    expect(result.proposedStops).toHaveLength(0);
    expect(result.status).toBe("attention-required");
  });

  it("flags a late stop rather than presenting it as ideal", () => {
    const result = planIntelligentComfortStops({
      totalDrivingMinutes: 270,
      candidates: [candidate("Late stop", 170)],
    });
    expect(result.proposedStops).toHaveLength(1);
    expect(result.status).toBe("attention-required");
    expect(result.warnings.some((w) => w.includes("earlier stopping location"))).toBe(true);
  });

  it("allows a suitable 90-minute lunch to serve as a break", () => {
    const result = planIntelligentComfortStops({
      totalDrivingMinutes: 260,
      candidates: [candidate("Lunch location", 120, { kind: "lunch", breakMinutes: 90 })],
    });
    expect(result.proposedStops[0]?.kind).toBe("lunch");
  });

  it("never invents stops when driving time is unknown", () => {
    const result = planIntelligentComfortStops({ totalDrivingMinutes: null, candidates: [] });
    expect(result.proposedStops).toHaveLength(0);
    expect(result.status).toBe("insufficient-evidence");
  });
});
