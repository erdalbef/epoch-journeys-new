import { describe, expect, it } from "vitest";
import { validatePilgrimageStory } from "./pilgrimageStoryDraft";
const draft = {
  subtitle: "An extraordinary pilgrimage across Christian heritage",
  shortDescription: "A carefully prepared journey through historic Christian sites and religious traditions.",
  overview: "This pilgrimage follows an itinerary that combines Christian heritage and sacred sites with opportunities to reflect on faith and community. Pilgrims discover diverse traditions in a region with a layered religious history.",
  tourIntroduction: "The journey offers pilgrims meaningful encounters with churches and historic landscapes.",
  tourSignificance: "The route includes places connected with Christian communities, traditions and sacred sites.",
  whyWeOfferThisTour: "Epoch Journeys designs this itinerary to allow thoughtful exploration with time for reflection.",
  destinationBriefs: "Sarajevo and Kotor provide a rich context for Christian heritage.",
  themes: ["Catholic Heritage"], tags: ["Balkans"], highlights: ["Historic Christian sites"],
  mealPlan: "Meals subject to confirmation.", dailyMeals: [{ day: 1, breakfast: "?", lunch: "Own", dinner: "?" }], reviewNotes: []
};
describe("Pilgrimage Story validation", () => {
 it("accepts a day-matched proposal", () => expect(validatePilgrimageStory(draft, 1).dailyMeals).toHaveLength(1));
 it("rejects missing days", () => expect(() => validatePilgrimageStory(draft, 2)).toThrow());
 it("rejects unknown included status", () => expect(() => validatePilgrimageStory({...draft, dailyMeals: [{day:1,breakfast:"Maybe",lunch:"Own",dinner:"?"}]},1)).toThrow());
 it("rejects incorrect day numbers", () => expect(() => validatePilgrimageStory({...draft, dailyMeals: [{day:2,breakfast:"?",lunch:"Own",dinner:"?"}]},1)).toThrow());
});
