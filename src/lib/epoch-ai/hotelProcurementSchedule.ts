import { z } from "zod";

const isoDate = z.iso.date();

const scheduleStay = z.object({
  city: z.string().trim().max(100),
  country: z.string().trim().max(100).optional(),
  checkIn: isoDate,
  checkOut: isoDate,
  rooms: z.number().int().min(1).max(250),
  massRoom: z.boolean(),
  massDate: isoDate.optional(),
  hotelName: z.string().trim().max(200).optional(),
  originCountry: z.string().trim().max(100).optional(),
  ferry: z.object({
    day: z.number().int().positive(),
    label: z.string().trim().min(1).max(200),
  }).optional(),
});

export const hotelProcurementScheduleStays = z.array(scheduleStay).min(1).max(60)
  .superRefine((stays, context) => {
    for (const [index, stay] of stays.entries()) {
      if ((!stay.ferry && !stay.city) || stay.checkIn >= stay.checkOut) {
        context.addIssue({
          code: "custom", path: [index],
          message: "Enter a destination and valid arrival and departure dates for each stay.",
        });
      }
      if (stay.massRoom && stay.massDate && (stay.massDate < stay.checkIn || stay.massDate > stay.checkOut)) {
        context.addIssue({code: "custom", path: [index], message: "Mass at the hotel must fall within the stay dates."});
      }
      if (index > 0 && stays[index - 1].checkOut > stay.checkIn) {
        context.addIssue({
          code: "custom", path: [index],
          message: "Stays must be in date order without overlapping nights.",
        });
      }
    }
  });

const storedSchedule = z.object({
  revision: z.uuid(),
  stays: hotelProcurementScheduleStays,
});

export type HotelProcurementSchedule = z.infer<typeof storedSchedule>;

export function readHotelProcurementSchedule(value: unknown): HotelProcurementSchedule | null {
  const parsed = storedSchedule.safeParse(value);
  return parsed.success ? parsed.data : null;
}
