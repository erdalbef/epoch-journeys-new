import { expect, it } from "vitest";
import { mergeItineraryDraftRows, prepareItineraryQuoteServices } from "./itineraryQuoteServices";

it("fills documented service rows and leaves supplier prices for review", () => {
  const itinerary = [
    "Day 1 – Depart USA\nMeals: B? | L✓ | D✓",
    "Day 2 – Arrival in Helsinki\nTransfer: Helsinki Airport to hotel\nMeals: B? | L✓ | D✓",
    "Day 3 – Helsinki\nCoach: Private coach for the city tour\nGuide: Helsinki guide\nEntrance: Museum admission\nMass: At Helsinki Cathedral\nMeals: B✓ | L✓ | D✓",
    "Day 4 – Ferry\nMeals: B✓ | L* | D✓\nEntrance: Optional museum",
    "Day 5 – Departure\nMeals: B✓ | L✓ | D✓",
  ].join("\n");
  const draft = prepareItineraryQuoteServices(itinerary, "2027-09-02", "2027-09-06",
    [{label: "Helsinki to Stockholm ferry", day: 4, checkIn: "2027-09-05"}],
    new Set(["2027-09-04"]));
  expect(draft.operational.map(service => service.category)).toEqual(["TRANSFER", "BUS", "TOUR_GUIDE", "FERRY"]);
  expect(draft.fixed.map(({category, quantity, unitCost}) => [category, quantity, unitCost])).toEqual([
    ["ENTRANCE", 1, 0], ["LUNCH", 1, 0], ["DINNER", 1, 0],
  ]);
  expect(draft.notes).toContain("Day 3 · At Helsinki Cathedral");
});

it("can draft an undated program and preserves manually edited costs on reapply", () => {
  const draft = prepareItineraryQuoteServices(
    "Day 1 - Arrive\nTransfer: To hotel\nDay 2 - Depart", "", "", [],
  );
  expect(draft.operational).toEqual([{category: "TRANSFER", label: "Day 1 · To hotel", numberOfDays: 1}]);
  const suggestion = {label: "Itinerary lunches", category: "LUNCH", quantity: 2, unitCost: 0};
  const manual = {...suggestion, label: "Confirmed lunches", unitCost: 35};
  expect(mergeItineraryDraftRows([manual], [suggestion], [suggestion]).rows).toEqual([manual]);
  const changed = {...suggestion, quantity: 3};
  expect(mergeItineraryDraftRows([suggestion], [suggestion], [changed]).rows).toEqual([changed]);
});
