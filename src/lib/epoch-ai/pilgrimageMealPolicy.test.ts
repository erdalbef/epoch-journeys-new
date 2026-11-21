import { describe, expect, it } from "vitest";
import { formatMealLine, summarizeMealPlan } from "./pilgrimageMealPolicy";

describe("Epoch daily meal policy", () => {
  it("does not imply inclusion of unspecified lunch", () => {
    const plan = summarizeMealPlan([{ day: 1, breakfast: "Included", lunch: "Own", dinner: "Included" }]);
    expect(plan).toContain("No included lunches selected");
    expect(plan).toContain("pilgrims' own expense");
  });
  it("lists approved included lunch days separately", () => {
    const plan = summarizeMealPlan([{ day: 1, breakfast: "Included", lunch: "Own", dinner: "Included" }, { day: 2, breakfast: "Included", lunch: "Included", dinner: "Included" }]);
    expect(plan).toContain("Day(s) 2");
    expect(plan).toContain("supplier arrangements and costs still to be confirmed");
  });
  it("flags travel-day meals needing review", () => {
    const plan = summarizeMealPlan([{ day: 1, breakfast: "?", lunch: "Own", dinner: "?" }]);
    expect(plan).toContain("review on Day(s) 1");
  });
  it("formats a single simple B/L/D line", () => {
    expect(formatMealLine({ day: 2, breakfast: "Included", lunch: "Own", dinner: "Included" })).toContain("B✓ | L* | D✓");
  });
});
