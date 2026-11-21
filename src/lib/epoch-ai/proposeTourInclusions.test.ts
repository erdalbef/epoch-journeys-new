import { describe, it, expect } from "vitest";
import { proposeTourInclusions } from "./proposeTourInclusions";
const meals = [
  { day: 1, breakfast: "Own" as const, lunch: "Own" as const, dinner: "Included" as const },
  { day: 2, breakfast: "Included" as const, lunch: "Included" as const, dinner: "Included" as const },
  { day: 3, breakfast: "Included" as const, lunch: "Own" as const, dinner: "Included" as const },
];
describe("commercial inclusion proposals", () => {
  it("keeps special lunch limited to explicitly approved days", () => {
    const x=proposeTourInclusions("Day 1 overnight at hotel. Day 2 lunch cruise on lake.",meals);
    expect(x.inclusions.some(v=>v.includes("Lunch included on Days 2 only"))).toBe(true);
    expect(x.exclusions.some(v=>v.includes("Days 1, 3"))).toBe(true);
  });
  it("does not assume airfare, entrance or boat tickets included", () => {
    const x=proposeTourInclusions("flight to Sarajevo; boat trip; entrance fees",meals);
    expect(x.inclusions.join(" ")).not.toMatch(/airfare|boat tickets|entrance fees/i);
    expect(x.warnings.join(" ")).toMatch(/boat excursions/i);
  });
  it("warns on unresolved meals", () => {
    const x=proposeTourInclusions("Day 1",[{day:1,breakfast:"?",lunch:"Own",dinner:"Included"}]);
    expect(x.warnings.join(" ")).toContain("Day 1");
  });
  it("never changes source itinerary", () => {
    const source="Day 1 - Tour starts in Sarajevo";
    proposeTourInclusions(source, meals);
    expect(source).toBe("Day 1 - Tour starts in Sarajevo");
  });
});
