import { z } from "zod";

const mealStatus = z.enum(["Included", "Own", "?"]);
export const pilgrimageStorySchema = z.object({
  subtitle: z.string().trim().min(8).max(220),
  shortDescription: z.string().trim().min(30).max(900),
  overview: z.string().trim().min(90).max(3200),
  tourIntroduction: z.string().trim().min(25).max(2000),
  tourSignificance: z.string().trim().min(25).max(2500),
  whyWeOfferThisTour: z.string().trim().min(25).max(1700),
  destinationBriefs: z.string().trim().max(2400),
  themes: z.array(z.string().trim().min(2).max(90)).max(10),
  tags: z.array(z.string().trim().min(2).max(90)).max(20),
  highlights: z.array(z.string().trim().min(4).max(220)).max(15),
  mealPlan: z.string().trim().max(500),
  dailyMeals: z.array(z.object({
    day: z.number().int().positive(),
    breakfast: mealStatus,
    lunch: mealStatus,
    dinner: mealStatus,
  })).max(40),
  reviewNotes: z.array(z.string().trim().min(4).max(450)).max(20),
});
export type PilgrimageStoryDraft = z.infer<typeof pilgrimageStorySchema>;

export function validatePilgrimageStory(input: unknown, expectedDays: number): PilgrimageStoryDraft {
  const story = pilgrimageStorySchema.parse(input);
  if (story.dailyMeals.length !== expectedDays) throw new Error("Meal days do not match the source itinerary duration.");
  for (let i = 0; i < expectedDays; i++) if (story.dailyMeals[i].day !== i + 1) throw new Error("Meal days must be consecutive and match the itinerary.");
  return story;
}
