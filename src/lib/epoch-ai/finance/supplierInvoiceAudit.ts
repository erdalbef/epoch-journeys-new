import "server-only";

import { db } from "@/lib/db";
import { summarizeCommercialEvidence } from "./summarizeCommercialEvidence";

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export type AuditFinding = {
  code: string;
  severity: AuditSeverity;
  message: string;
  evidence: string[];
};

export async function auditSupplierInvoice(payableId: string) {
  if (!payableId || payableId.length > 128) {
    throw new Error("Invalid supplier payable ID.");
  }

  const payable = await db.supplierPayable.findUnique({
    where: { id: payableId },
    select: {
      id: true,
      title: true,
      supplierInvoiceNumber: true,
      currency: true,
      invoiceDate: true,
      contractedAmount: true,
      approvedAmount: true,
      creditAmount: true,
      amountPaid: true,
      balance: true,
      approvalStatus: true,
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
      contract: {
        select: {
          id: true,
          title: true,
          reference: true,
          version: true,
          currency: true,
          validFrom: true,
          validTo: true,
          documentUrl: true,
        },
      },
      rate: {
        select: {
          id: true,
          name: true,
          amount: true,
          currency: true,
          unit: true,
          validFrom: true,
          validTo: true,
          freePlaces: true,
          minimumRooms: true,
          minimumNights: true,
        },
      },
      documents: {
        select: {
          id: true,
          title: true,
          originalFileName: true,
        },
      },
    },
  });

  if (!payable) {
    throw new Error("Supplier payable not found.");
  }

  // Registered source metadata is a candidate list, not independently
  // verified commercial terms. Supplier-wide sources must never be treated
  // as invoice-specific acceptance without human verification.
  const evidenceRows = await db.supplierCommercialEvidence.findMany({
    where: {
      supplierId: payable.supplier.id,
      OR: [{ payableId: payable.id }, { payableId: null }],
    },
    select: {
      id: true,
      payableId: true,
      sourceType: true,
      sourceReference: true,
      version: true,
      previousEvidenceId: true,
      acceptanceStatus: true,
      reviewStatus: true,
      currency: true,
      validFrom: true,
      validTo: true,
      acceptedAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
  });
  const commercialEvidence = summarizeCommercialEvidence(
    payable.id,
    evidenceRows.slice(0, 30),
    evidenceRows.length > 30,
  );

  const findings: AuditFinding[] = [];

  function add(
    code: string,
    severity: AuditSeverity,
    message: string,
    evidence: string[] = [],
  ) {
    findings.push({ code, severity, message, evidence });
  }

  const currency = payable.currency.toUpperCase();

  if (!payable.contract) {
    add(
      "CONTRACT_MISSING",
      "WARNING",
      "No supplier contract is linked to this payable.",
    );
  } else {
    if (
      payable.contract.currency &&
      payable.contract.currency.toUpperCase() !== currency
    ) {
      add(
        "CONTRACT_CURRENCY_MISMATCH",
        "CRITICAL",
        "Contract currency differs from payable currency.",
        [
          `Contract: ${payable.contract.currency}`,
          `Payable: ${currency}`,
        ],
      );
    }

    if (!payable.contract.documentUrl) {
      add(
        "CONTRACT_DOCUMENT_NOT_LINKED",
        "WARNING",
        "No master contract document is linked.",
      );
    }
  }

  if (!payable.rate) {
    add(
      "RATE_MISSING",
      "WARNING",
      "No supplier rate is linked to this payable.",
    );
  } else {
    if (payable.rate.currency.toUpperCase() !== currency) {
      add(
        "RATE_CURRENCY_MISMATCH",
        "CRITICAL",
        "Supplier rate currency differs from payable currency.",
      );
    }

    if (
      payable.rate.freePlaces ||
      payable.rate.minimumRooms ||
      payable.rate.minimumNights
    ) {
      add(
        "RATE_CONDITIONS_REVIEW",
        "INFO",
        "Complimentary-place or minimum-booking conditions require verification.",
      );
    }
  }

  let recordedVariance: string | null = null;

  if (payable.contractedAmount !== null) {
    const variance = payable.approvedAmount.minus(
      payable.contractedAmount,
    );

    recordedVariance = variance.toFixed(2);

    if (!variance.isZero()) {
      add(
        "AMOUNT_VARIANCE",
        "WARNING",
        "Approved and contracted amounts differ. Investigate the reason.",
        [
          `Contracted: ${payable.contractedAmount.toFixed(2)} ${currency}`,
          `Approved: ${payable.approvedAmount.toFixed(2)} ${currency}`,
          `Difference: ${recordedVariance} ${currency}`,
        ],
      );
    }
  } else {
    add(
      "CONTRACTED_AMOUNT_MISSING",
      "WARNING",
      "No contracted amount is recorded for comparison.",
    );
  }

  if (payable.documents.length === 0) {
    add(
      "INVOICE_EVIDENCE_MISSING",
      "WARNING",
      "No supporting FinanceDocument is linked directly to this payable.",
    );
  }

  if (commercialEvidence.candidateCount === 0) {
    add(
      "COMMERCIAL_EVIDENCE_NOT_REGISTERED",
      "WARNING",
      "No contract, email offer, or quotation evidence registration was found for this payable or supplier.",
    );
  } else {
    add(
      "COMMERCIAL_EVIDENCE_SOURCE_REVIEW_REQUIRED",
      "INFO",
      "Registered commercial evidence candidates were found, but their content and applicability to this invoice have not been verified by this audit.",
      [
        `Candidates: ${commercialEvidence.candidateCount}`,
        `Supplier-wide candidates: ${commercialEvidence.supplierWideCount}`,
      ],
    );
  }

  add(
    "DOCUMENT_REVIEW_PENDING",
    "INFO",
    "Original agreement and invoice contents have not yet been examined.",
  );

  return {
    auditVersion: "1.0",
    verificationStatus: "PRELIMINARY" as const,
    fullyVerified: false,
    supplier: payable.supplier.name,
    payableId: payable.id,
    invoiceNumber: payable.supplierInvoiceNumber,
    currency,
    financials: {
      contractedAmount:
        payable.contractedAmount?.toFixed(2) ?? null,
      approvedAmount: payable.approvedAmount.toFixed(2),
      creditAmount: payable.creditAmount.toFixed(2),
      amountPaid: payable.amountPaid.toFixed(2),
      balance: payable.balance.toFixed(2),
      recordedVariance,
    },
    contractId: payable.contract?.id ?? null,
    rateId: payable.rate?.id ?? null,
    commercialEvidence,
    linkedDocuments: payable.documents.map((document) => ({
      id: document.id,
      fileName: document.originalFileName,
      contentExamined: false,
    })),
    findings,
  };
}
