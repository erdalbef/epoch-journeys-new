import { describe, expect, it } from "vitest";
import { inspectStoryReadiness } from "./storyReadiness";

describe("Pilgrimage Story readiness", () => {
  it("accepts a complete numbered itinerary", () => {
    const text = "Day 1 - Lisbon\nDay 2 - Fatima\nDay 3 - Departure";
    expect(inspectStoryReadiness(text, 3).ready).toBe(true);
  });

  it("recognizes uppercase day headings", () => {
    const text = "DAY 1: Arrival\nDAY 2: Free";
    expect(inspectStoryReadiness(text, 2).ready).toBe(true);
  });

  it("detects missing days", () => {
    const text = "Day 1: Arrival\nDay 2: Free";
    const result = inspectStoryReadiness(text, 12);
    expect(result.ready).toBe(false);
    expect(result.identifiedDays).toBe(2);
    expect(result.message).toContain("2 of 12");
  });

  it("rejects duplicate day headings", () => {
    const text = "Day 1: Arrival\nDay 1: Lisbon";
    expect(inspectStoryReadiness(text, 2).ready).toBe(false);
  });

  it("rejects unexpected day numbers", () => {
    const text = "Day 1: Arrival\nDay 3: Departure";
    expect(inspectStoryReadiness(text, 2).ready).toBe(false);
  });

  it("rejects invalid tour duration", () => {
    expect(inspectStoryReadiness("Day 1: Arrival", 0).ready).toBe(false);
  });

  it("does not invent missing days", () => {
    const text = "Day 1: Lisbon";
    inspectStoryReadiness(text, 3);
    expect(text).toBe("Day 1: Lisbon");
  });
});