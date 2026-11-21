import { z } from "zod";

export const commercialEvidenceSchema = z.object({
  sourceType: z.enum([
    "FORMAL_CONTRACT",
    "EMAIL_BODY",
    "QUOTATION_ATTACHMENT",
  ]),
  supplierId: z.string().trim().min(1).max(128),
  payableId: z.string().trim().min(1).max(128).nullable(),

  sourceReference: z.string().trim().min(1).max(500),
  sourceDate: z.string().nullable(),

  acceptanceStatus: z.enum([
    "NOT_ESTABLISHED",
    "RECORDED_ACCEPTED",
    "REJECTED",
    "SUPERSEDED",
  ]),

  acceptanceReference: z.string().trim().min(1).max(500).nullable(),

  sourceContentExamined: z.boolean(),
  acceptanceEvidenceExamined: z.boolean(),
}).strict();

export type CommercialEvidenceInput =
  z.infer<typeof commercialEvidenceSchema>;

export function assessCommercialEvidence(value: unknown) {
  const evidence = commercialEvidenceSchema.parse(value);

  const acceptanceRecorded =
    evidence.acceptanceStatus === "RECORDED_ACCEPTED";

  const acceptanceEvidenceAvailable =
    Boolean(evidence.acceptanceReference?.trim());

  const acceptanceEstablished =
    acceptanceRecorded &&
    acceptanceEvidenceAvailable &&
    evidence.acceptanceEvidenceExamined;

  const readyForComparison =
    acceptanceEstablished &&
    evidence.sourceContentExamined;

  return {
    evidence,
    acceptanceRecorded,
    acceptanceEstablished,
    readyForComparison,
    commercialTermsVerified: false,
    status: readyForComparison
      ? "READY_FOR_TERM_COMPARISON" as const
      : "NOT_VERIFIED" as const,
  };
}