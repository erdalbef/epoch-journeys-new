import { z } from "zod";

export const tourImportDraftSchema = z.object({
  title: z.string().trim().min(3).max(180),
  duration: z.number().int().min(1).max(40),
  destinations: z.array(z.string().trim().min(2).max(100)).min(1).max(20),
  arrivalCity: z.string().trim().max(120),
  departureCity: z.string().trim().max(120),
  itinerary: z.string().trim().min(40).max(24000),
  overviewItinerary: z.string().trim().max(3000),
  reviewNotes: z.array(z.string().trim().max(400)).max(20),
  sourceDayCount: z.number().int().min(0).max(40),
});

export type TourImportDraft = z.infer<typeof tourImportDraftSchema>;

export function validateTourImportDraft(input: unknown): TourImportDraft {
  const draft = tourImportDraftSchema.parse(input);
  if (draft.sourceDayCount > 0 && draft.sourceDayCount !== draft.duration) {
    throw new Error("The extracted day count does not match the stated duration. Review the original document before importing.");
  }
  return draft;
}
