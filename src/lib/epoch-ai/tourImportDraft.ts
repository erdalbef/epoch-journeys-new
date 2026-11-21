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
  // Document-grounded facts; unknown is not equivalent to a default calculation.
  hotelNights: z.number().int().min(0).max(39).nullable(),
  dayOnePattern: z.enum(["overnight_flight", "same_day_flight_and_arrival", "arrival_only", "unclear"]),
});

export type TourImportDraft = z.infer<typeof tourImportDraftSchema>;

export function validateTourImportDraft(input: unknown): TourImportDraft {
  const draft = tourImportDraftSchema.parse(input);
  if (draft.sourceDayCount > 0 && draft.sourceDayCount !== draft.duration) {
    throw new Error("The extracted day count does not match the stated duration. Review the original document before importing.");
  }
  if (draft.hotelNights !== null && draft.hotelNights > draft.duration - 1) {
    throw new Error("Hotel-night count exceeds the number of nights possible within the itinerary.");
  }
  return draft;
}
