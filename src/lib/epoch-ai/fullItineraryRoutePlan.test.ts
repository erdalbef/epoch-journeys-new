import { describe, expect, it } from "vitest";
import { proposeFullItineraryRoutes, summarizeOperationalFindings } from "./fullItineraryRoutePlan";
import type { ItineraryDay } from "./itineraryReview";
const day = (n: number, overnightCity: string, dayType: ItineraryDay["dayType"] = "touring"): ItineraryDay => ({
  day: n, overnightCity, dayType, title: `Day ${n}`, description: "Visit important shrines", overnight: overnightCity,
  massPlan: "Unconfirmed", lunchPlan: "Unconfirmed", comfortBreakPlan: "Unconfirmed", logistics: "Unconfirmed",
});
describe("conservative full itinerary proposals", () => {
  it("proposes only an overnight transition, not invented via stops", () => {
    const r = proposeFullItineraryRoutes([day(1, "Lisbon", "arrival"), day(2, "Fatima")]);
    expect(r[1].stops).toEqual(["Lisbon", "Fatima"]);
    expect(r[1].unresolved.join(" ")).toContain("NOT been extracted");
  });
  it("never invents driving on a same-city day", () => {
    expect(proposeFullItineraryRoutes([day(1, "Lisbon", "arrival"), day(2, "Lisbon")])[1].stops).toEqual([]);
  });
  it("does not assume the departure airport route", () => {
    expect(proposeFullItineraryRoutes([day(1, "Lisbon", "arrival"), day(2, "", "departure")])[1].stops).toEqual([]);
  });
  it("groups recurring operational warnings", () => {
    const groups = summarizeOperationalFindings(["Leg 1: coach access unverified", "Leg 2: coach access unverified"]);
    expect(groups[0].category).toBe("Coach and access verification");
    expect(groups[0].count).toBe(2);
  });
});
