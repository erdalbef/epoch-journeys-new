import { z } from "zod";

const moneySchema = z.string().regex(
  /^\d{1,12}(\.\d{1,2})?$/,
  "Invalid monetary amount."
);

const currencySchema = z.string().regex(
  /^[A-Z]{3}$/,
  "Invalid currency code."
);

export const invoiceExtractionSchema = z.object({
  supplierName: z.string().min(1).max(200).nullable(),
  invoiceNumber: z.string().min(1).max(100).nullable(),
  invoiceDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/
  ).nullable(),
  invoiceTotal: moneySchema.nullable(),
  currency: currencySchema.nullable(),
  serviceDescription: z.string().max(2000).nullable(),
  evidence: z.string().max(2000).nullable(),
}).strict();

export type InvoiceExtraction =
  z.infer<typeof invoiceExtractionSchema>;

export function validateInvoiceExtraction(
  value: unknown
): InvoiceExtraction {
  return invoiceExtractionSchema.parse(value);
}