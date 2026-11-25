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

export class TourImportValidationError extends Error {}

export function validateTourImportDraft(input: unknown): TourImportDraft {
  const result = tourImportDraftSchema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map(issue => String(issue.path[0] ?? "document")))];
    throw new TourImportValidationError(`The extracted data could not be validated in these fields: ${fields.join(", ")}. Review those details in the original document.`);
  }
  const draft = result.data;
  if (draft.sourceDayCount > 0 && draft.sourceDayCount !== draft.duration) {
    throw new TourImportValidationError(`The extracted day count (${draft.sourceDayCount}) does not match the stated duration (${draft.duration} days). Review the original document before importing.`);
  }
  if (draft.hotelNights !== null && draft.hotelNights > draft.duration - 1) {
    throw new TourImportValidationError(`Hotel-night count (${draft.hotelNights}) exceeds the number of nights possible within the ${draft.duration}-day itinerary. Check whether overnight flights or ferries were counted as hotel nights.`);
  }
  return draft;
}
