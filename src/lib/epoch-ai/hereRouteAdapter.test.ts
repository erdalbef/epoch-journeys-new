import { describe, expect, it } from "vitest";
import { assessHereRouteResponse } from "./hereRouteAdapter";

const sample = {
  routes: [{
    sections: [{
      summary: { length: 120000, duration: 5400 },
      notices: [],
    }],
  }],
};

describe("HERE routing adapter", () => {
  it("extracts route distance", () => {
    expect(assessHereRouteResponse(sample).distanceKm).toBe(120);
  });

  it("extracts route duration", () => {
    expect(assessHereRouteResponse(sample).drivingMinutes).toBe(90);
  });

  it("adds multiple route sections", () => {
    const result = assessHereRouteResponse({
      routes: [{
        sections: [
          { summary: { length: 20000, duration: 900 }, notices: [] },
          { summary: { length: 40000, duration: 1800 }, notices: [] },
        ],
      }],
    });
    expect(result.distanceKm).toBe(60);
    expect(result.drivingMinutes).toBe(45);
  });

  it("rejects missing routes", () => {
    expect(assessHereRouteResponse({}).status).toBe("unavailable");
  });

  it("does not silently select alternative routes", () => {
    const route = sample.routes[0];
    expect(assessHereRouteResponse({
      routes: [route, route],
    }).status).toBe("unavailable");
  });

  it("rejects missing section summaries", () => {
    expect(assessHereRouteResponse({
      routes: [{ sections: [{}] }],
    }).status).toBe("unavailable");
  });

  it("rejects negative driving durations", () => {
    expect(assessHereRouteResponse({
      routes: [{
        sections: [{
          summary: { length: 1000, duration: -1 },
          notices: [],
        }],
      }],
    }).status).toBe("unavailable");
  });

  it("identifies critical restrictions", () => {
    const result = assessHereRouteResponse({
      routes: [{
        sections: [{
          summary: { length: 1000, duration: 100 },
          notices: [{ severity: "critical" }],
        }],
      }],
    });
    expect(result.status).toBe("critical-restriction");
  });

  it("warns when notices are missing", () => {
    const result = assessHereRouteResponse({
      routes: [{
        sections: [{
          summary: { length: 1000, duration: 100 },
        }],
      }],
    });
    expect(result.warnings.some(
      w => w.includes("notices are missing")
    )).toBe(true);
  });

  it("never automatically verifies coach access", () => {
    const result = assessHereRouteResponse(sample);
    expect(result.coachAccess).toBe("unverified");
    expect(result.requiresManualReview).toBe(true);
  });
});