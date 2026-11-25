import { describe, expect, it } from "vitest";
import { correctTourDraftWeekdays } from "./tourDraftWeekdays";

describe("tour draft weekday correction", () => {
  it("corrects Scandinavia headings while preserving dates and itinerary text", () => {
    const input = [
      "Day 1, September 2, 2027 – Saturday Departure",
      "**Day 2, September 3, 2027, Sunday – ARRIVAL IN HELSINKI**",
      "Sunday Mass is to be confirmed.",
      "Day 3, September 4, 2027, Saturday – Stockholm",
    ].join("\n");
    expect(correctTourDraftWeekdays(input)).toEqual({
      corrections: 2,
      text: [
        "Day 1, September 2, 2027 – Thursday Departure",
        "**Day 2, September 3, 2027, Friday – ARRIVAL IN HELSINKI**",
        "Sunday Mass is to be confirmed.",
        "Day 3, September 4, 2027, Saturday – Stockholm",
      ].join("\n"),
    });
  });

  it("preserves invalid dates and headings without a weekday", () => {
    const text = "Day 1, February 30, 2027, Saturday\nDay 2, March 1, 2027 – Helsinki";
    expect(correctTourDraftWeekdays(text)).toEqual({ text, corrections: 0 });
  });
});
