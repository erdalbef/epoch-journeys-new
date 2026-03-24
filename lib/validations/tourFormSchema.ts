import { z } from "zod";

export const pricingTierSchema = z.object({
  minPax: z.coerce.number().int().min(1, "Min pax must be at least 1"),
  maxPax: z.coerce.number().int().min(1, "Max pax must be at least 1"),
  roomType: z.enum(["SINGLE", "DOUBLE_TWIN", "TRIPLE"]),
  price: z.coerce.number().min(0, "Price must be 0 or higher"),
});

export const tourFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    category: z.string().min(1, "Category is required"),
    duration: z.coerce.number().int().min(1, "Duration is required"),

    pricingType: z.enum([
      "FIXED_GROUP",
      "GROUP_BASED",
      "FIT_DYNAMIC",
      "FIT_FIXED",
      "FIT_TIERED",
    ]),

    basePrice: z.coerce.number().nullable().optional(),

    pricingTiers: z.array(pricingTierSchema).default([]),

    shortDescription: z.string().optional(),
    overview: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const requiresTiers =
      data.pricingType === "GROUP_BASED" ||
      data.pricingType === "FIT_TIERED";

    const allowsBasePrice =
      data.pricingType === "FIXED_GROUP" ||
      data.pricingType === "FIT_FIXED";

    if (requiresTiers && data.pricingTiers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pricingTiers"],
        message: "At least one pricing tier is required",
      });
    }

    if (allowsBasePrice) {
      if (data.basePrice == null || Number.isNaN(data.basePrice)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["basePrice"],
          message: "Base price is required",
        });
      }
    }

    data.pricingTiers.forEach((tier, index) => {
      if (tier.maxPax < tier.minPax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricingTiers", index, "maxPax"],
          message: "Max pax must be ≥ min pax",
        });
      }
    });
  });

export type TourFormValues = z.infer<typeof tourFormSchema>;