import { describe, expect, it } from "vitest";
import { assessCommercialEvidence } from "./commercialEvidencePolicy";

describe("Commercial evidence acceptance control", () => {
  const base = {
    sourceType: "EMAIL_BODY" as const,
    supplierId: "supplier-1",
    payableId: "payable-1",
    sourceReference: "Supplier email dated 2026-09-01",
    sourceDate: "2026-09-01",
    acceptanceStatus: "RECORDED_ACCEPTED" as const,
    acceptanceReference: "Epoch reply dated 2026-09-02",
    sourceContentExamined: false,
    acceptanceEvidenceExamined: false,
  };

  it("does not trust a recorded acceptance alone", () => {
    const result = assessCommercialEvidence(base);

    expect(result.acceptanceRecorded).toBe(true);
    expect(result.acceptanceEstablished).toBe(false);
    expect(result.readyForComparison).toBe(false);
    expect(result.commercialTermsVerified).toBe(false);
  });

  it("requires examination of the acceptance evidence", () => {
    const result = assessCommercialEvidence({
      ...base,
      acceptanceEvidenceExamined: true,
    });

    expect(result.acceptanceEstablished).toBe(true);
    expect(result.readyForComparison).toBe(false);
  });

  it("requires both source and acceptance examination", () => {
    const result = assessCommercialEvidence({
      ...base,
      sourceContentExamined: true,
      acceptanceEvidenceExamined: true,
    });

    expect(result.readyForComparison).toBe(true);
    expect(result.status).toBe("READY_FOR_TERM_COMPARISON");
    expect(result.commercialTermsVerified).toBe(false);
  });

  it("rejects acceptance without a traceable reference", () => {
    const result = assessCommercialEvidence({
      ...base,
      acceptanceReference: null,
      sourceContentExamined: true,
      acceptanceEvidenceExamined: true,
    });

    expect(result.acceptanceEstablished).toBe(false);
    expect(result.status).toBe("NOT_VERIFIED");
  });

  it("does not accept superseded evidence", () => {
    const result = assessCommercialEvidence({
      ...base,
      acceptanceStatus: "SUPERSEDED",
      sourceContentExamined: true,
      acceptanceEvidenceExamined: true,
    });

    expect(result.readyForComparison).toBe(false);
  });

  it("rejects unsupported evidence sources", () => {
    expect(() => assessCommercialEvidence({
      ...base,
      sourceType: "UNVERIFIED_NOTE",
    })).toThrow();
  });
});