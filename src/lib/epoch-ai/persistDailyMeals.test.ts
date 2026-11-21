import { describe, it, expect } from "vitest";
import { readDailyMealsFromItinerary, mergeDailyMealsIntoItinerary, missingMealDayHeadings } from "./persistDailyMeals";

const meals = [
  { day: 1, breakfast: "Included", lunch: "Own", dinner: "Included" },
  { day: 2, breakfast: "Included", lunch: "Included", dinner: "Included" },
] as const;
const choices = meals.map((m) => ({ ...m }));

describe("persist daily meals in existing Tour itinerary", () => {
  it("round trips meal choices and restores them after reopening", () => {
    const saved = mergeDailyMealsIntoItinerary("Day 1 — Arrival\nWelcome.\nDay 2 — Ohrid\nBoat lunch.", choices);
    expect(readDailyMealsFromItinerary(saved)).toEqual(choices);
  });
  it("replaces existing markers without duplicating lines", () => {
    const once = mergeDailyMealsIntoItinerary("Day 1 — Arrival\nWelcome.\nDay 2 — Ohrid\nBoat lunch.", choices);
    const twice = mergeDailyMealsIntoItinerary(once, choices);
    expect(twice).toBe(once);
    expect((twice.match(/Meals: /g) || []).length).toBe(2);
  });
  it("changes included lunch without touching narrative", () => {
    const start = "Day 1 - Sarajevo\nHistoric cathedral.\nDay 2 - Ohrid\nPrivate boat excursion.";
    const saved = mergeDailyMealsIntoItinerary(start, choices);
    expect(saved).toContain("Historic cathedral.");
    expect(saved).toContain("Private boat excursion.");
    expect(readDailyMealsFromItinerary(saved)[1].lunch).toBe("Included");
  });
  it("preserves line-ending style", () => {
    const saved = mergeDailyMealsIntoItinerary("Day 1 — Arrival\r\nWelcome.\r\nDay 2 — Ohrid", choices);
    expect(saved).toContain("\r\nMeals:");
  });
  it("reports missing day headings instead of discarding meal choices", () => {
    expect(missingMealDayHeadings("Day 1 — Sarajevo", choices)).toEqual([2]);
  });
  it("does not modify itineraries when meal selections do not exist", () => {
    const text = "Day 1 — Fly\nDay 2 — Arrive";
    expect(mergeDailyMealsIntoItinerary(text, [])).toBe(text);
  });
});
