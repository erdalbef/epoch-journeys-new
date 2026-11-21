import { describe, expect, it } from "vitest";
import { summarizeCommercialEvidence, type RegisteredEvidenceCandidate } from "./summarizeCommercialEvidence";

const base: RegisteredEvidenceCandidate = {
  id: "e1", payableId: "p1", sourceType: "EMAIL_BODY",
  sourceReference: "supplier-email-01", version: 1,
  previousEvidenceId: null, acceptanceStatus: "RECORDED_ACCEPTED",
  reviewStatus: "TERMS_VERIFIED", currency: "CHF",
  validFrom: null, validTo: null,
  acceptedAt: new Date("2026-10-01T00:00:00Z"),
  createdAt: new Date("2026-10-02T00:00:00Z"),
};

describe("registered commercial evidence is never automatically certified", () => {
  it("keeps even accepted/verified database metadata preliminary", () => {
    const result = summarizeCommercialEvidence("p1", [base], false);
    expect(result.status).toBe("CANDIDATES_ONLY");
    expect(result.termsVerifiedByThisAudit).toBe(false);
    expect(result.acceptanceEstablishedByThisAudit).toBe(false);
    expect(result.candidates[0].recordedAcceptanceStatus).toBe("RECORDED_ACCEPTED");
    expect(result.candidates[0].sourceContentExaminedByThisAudit).toBe(false);
  });
  it("distinguishes supplier-wide candidate from payable-specific source", () => {
    const result = summarizeCommercialEvidence("p1", [base, {...base, id:"e2", payableId:null}], false);
    expect(result.supplierWideCount).toBe(1);
    expect(result.candidates.map(x => x.scope)).toEqual(["LINKED_TO_PAYABLE", "SUPPLIER_WIDE"]);
  });
  it("preserves source provenance and versions", () => {
    const result = summarizeCommercialEvidence("p1", [{...base, version:2, previousEvidenceId:"e0"}], false);
    expect(result.candidates[0]).toMatchObject({sourceReference:"supplier-email-01",version:2,previousEvidenceId:"e0"});
  });
  it("reports truncation rather than silently claiming complete evidence", () => {
    expect(summarizeCommercialEvidence("p1", [base], true).candidateLimitReached).toBe(true);
  });
  it("handles no evidence without implying that source terms were checked", () => {
    const result = summarizeCommercialEvidence("p1", [], false);
    expect(result.candidateCount).toBe(0);
    expect(result.termsVerifiedByThisAudit).toBe(false);
  });
});
