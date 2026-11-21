import {
  CommercialEvidenceSourceType,
  PrismaClient,
  Role,
} from "@prisma/client";
import { z } from "zod";

export const registrationSchema = z.object({
  supplierId: z.string().trim().min(1),
  payableId: z.string().trim().min(1).nullable().optional(),
  contractId: z.string().trim().min(1).nullable().optional(),

  sourceType: z.nativeEnum(CommercialEvidenceSourceType),
  sourceDocumentId: z.string().trim().min(1).nullable().optional(),

  sourceReference: z.string().trim().min(1).max(500),
  sourceMessageId: z.string().trim().min(1).nullable().optional(),
  sourceSender: z.string().trim().min(1).nullable().optional(),
  sourceRecipient: z.string().trim().min(1).nullable().optional(),
  sourceSubject: z.string().trim().min(1).nullable().optional(),

  scopeDescription: z.string().trim().max(3000).nullable().optional(),
}).strict();

export type CommercialEvidenceRegistration =
  z.infer<typeof registrationSchema>;

export async function registerCommercialEvidence(
  db: PrismaClient,
  actorId: string,
  input: unknown,
) {
  if (!actorId?.trim()) {
    throw new Error("An authenticated administrator is required.");
  }

  const values = registrationSchema.parse(input);

  if (
    values.sourceType === "FORMAL_CONTRACT" &&
    !values.contractId &&
    !values.sourceDocumentId
  ) {
    throw new Error("A contract or contract document is required.");
  }

  if (
    values.sourceType === "QUOTATION_ATTACHMENT" &&
    !values.sourceDocumentId
  ) {
    throw new Error("A quotation document is required.");
  }

  if (
    values.sourceType === "EMAIL_BODY" &&
    !values.sourceMessageId &&
    !values.sourceDocumentId
  ) {
    throw new Error("A traceable email source is required.");
  }

  return db.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });

    if (!actor || actor.role !== Role.ADMIN) {
      throw new Error("Only an administrator may register evidence.");
    }

    const supplier = await tx.supplier.findUnique({
      where: { id: values.supplierId },
      select: { id: true },
    });

    if (!supplier) {
      throw new Error("Supplier not found.");
    }

    if (values.payableId) {
      const payable = await tx.supplierPayable.findUnique({
        where: { id: values.payableId },
        select: { supplierId: true },
      });

      if (!payable || payable.supplierId !== values.supplierId) {
        throw new Error("Payable does not belong to this supplier.");
      }
    }

    if (values.contractId) {
      const contract = await tx.supplierContract.findUnique({
        where: { id: values.contractId },
        select: { supplierId: true },
      });

      if (!contract || contract.supplierId !== values.supplierId) {
        throw new Error("Contract does not belong to this supplier.");
      }
    }

    if (values.sourceDocumentId) {
      // Serialize evidence registration with document writes.
      // The lock remains held until the registration transaction ends.
      // Prisma's tagged query safely parameterizes the document ID.
      const lockedDocuments = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM public."FinanceDocument"
        WHERE "id" = ${values.sourceDocumentId}
        FOR UPDATE
      `;

      if (lockedDocuments.length !== 1) {
        throw new Error("Source document not found.");
      }
      const document = await tx.financeDocument.findUnique({
        where: { id: values.sourceDocumentId },
        select: {
          supplierId: true,
          type: true,
          supplierPayable: {
            select: { supplierId: true },
          },
        },
      });

      if (!document) {
        throw new Error("Source document not found.");
      }

      const allowedTypes =
        values.sourceType === "FORMAL_CONTRACT"
          ? ["CONTRACT", "AGREEMENT"]
          : ["AGREEMENT", "OTHER"];

      if (!allowedTypes.includes(document.type)) {
        throw new Error(
          "Document classification is not valid for this evidence source.",
        );
      }

      const explicitSupplier = document.supplierId;
      const payableSupplier = document.supplierPayable?.supplierId;

      if (
        (explicitSupplier && explicitSupplier !== values.supplierId) ||
        (payableSupplier && payableSupplier !== values.supplierId)
      ) {
        throw new Error("Source document belongs to another supplier.");
      }

      if (!explicitSupplier && !payableSupplier) {
        throw new Error("Source document supplier is not established.");
      }
    }

    const evidence = await tx.supplierCommercialEvidence.create({
      data: {
        supplierId: values.supplierId,
        payableId: values.payableId ?? null,
        contractId: values.contractId ?? null,
        sourceType: values.sourceType,
        sourceDocumentId: values.sourceDocumentId ?? null,
        sourceReference: values.sourceReference,
        sourceMessageId: values.sourceMessageId ?? null,
        sourceSender: values.sourceSender ?? null,
        sourceRecipient: values.sourceRecipient ?? null,
        sourceSubject: values.sourceSubject ?? null,
        scopeDescription: values.scopeDescription ?? null,

        acceptanceStatus: "NOT_ESTABLISHED",
        reviewStatus: "NOT_VERIFIED",
        recordedById: actorId,
      },
      select: {
        id: true,
        supplierId: true,
        payableId: true,
        acceptanceStatus: true,
        reviewStatus: true,
      },
    });

    await tx.supplierCommercialEvidenceEvent.create({
      data: {
        evidenceId: evidence.id,
        actorId,
        eventType: "REGISTERED",
        newStatus: "NOT_VERIFIED",
        detail: "Commercial evidence registered; acceptance not established.",
      },
    });

    return evidence;
  });
}