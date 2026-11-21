import { describe, it, expect } from "vitest";
import { compareCommercialTerms, type CommercialTermsExtraction } from "./compareCommercialTerms";
const fixture: CommercialTermsExtraction = {
  agreement: { supplier: "Hotel A", service: "Double room", currency: "EUR", unitPrice: "120.00", unit: "room/night", breakfastIncluded: true,
    complimentaryPlaces: 1, cancellationDeadline: "30 days", evidence: "Agreement p.2: EUR 120 per room/night" },
  invoice: { supplier: "Hotel A", service: "Double room", currency: "EUR", unitPrice: "135.00", unit: "room/night", breakfastChargedSeparately: true,
    complimentaryCreditShown: false, cancellationTerms: "14 days", evidence: "Invoice p.1: EUR 135 per room/night", lines: [] },
};
const codes = (v: unknown) => compareCommercialTerms(v).findings.map(f => f.code);
describe("conservative commercial terms checks", () => {
  it("reports supported per-unit difference without multiplying unknown quantity", () => {
    const r = compareCommercialTerms(fixture);
    expect(r.fullyVerified).toBe(false);
    expect(r.findings.find(f => f.code === "UNIT_PRICE_OVERCHARGE_POSSIBLE")?.estimatedDifference).toBe("15.00");
  });
  it("flags possible duplicate breakfast, missing complimentary credit, cancellation wording", () => {
    expect(codes(fixture)).toEqual(expect.arrayContaining(["POSSIBLE_DUPLICATE_BREAKFAST_CHARGE", "COMPLIMENTARY_BENEFIT_REVIEW", "CANCELLATION_TERMS_REVIEW"]));
  });
  it("does not compare prices when currencies differ", () => {
    const r = { ...fixture, invoice: {...fixture.invoice, currency:"CHF"} };
    expect(codes(r)).toContain("CURRENCY_MISMATCH");
    expect(codes(r)).not.toContain("UNIT_PRICE_OVERCHARGE_POSSIBLE");
  });
  it("does not compare incompatible units", () => {
    const r = { ...fixture, invoice: {...fixture.invoice, unit:"person/night"} };
    expect(codes(r)).toContain("PRICE_BASIS_UNVERIFIED");
    expect(codes(r)).not.toContain("UNIT_PRICE_OVERCHARGE_POSSIBLE");
  });
  it("does not compare prices for mismatched suppliers", () => {
    const r = {...fixture,invoice:{...fixture.invoice,supplier:"Other hotel"}};
    expect(codes(r)).toContain("SUPPLIER_NAME_REVIEW");
    expect(codes(r)).not.toContain("UNIT_PRICE_OVERCHARGE_POSSIBLE");
  });
  it("does not compare different service descriptions", () => {
    const r = {...fixture, invoice:{...fixture.invoice, service:"Suite"}};
    expect(codes(r)).toContain("PRICE_BASIS_UNVERIFIED");
  });
  it("does not infer omitted inclusion fields", () => {
    const r = {...fixture, invoice:{...fixture.invoice, breakfastChargedSeparately:null, complimentaryCreditShown:null, cancellationTerms:null}};
    expect(codes(r)).not.toContain("POSSIBLE_DUPLICATE_BREAKFAST_CHARGE");
    expect(codes(r)).not.toContain("COMPLIMENTARY_BENEFIT_REVIEW");
  });
  it("rejects malformed extraction and leaves approval false", () => {
    const result = compareCommercialTerms({agreement:{unitPrice:"1e99"},invoice:{}});
    expect(result.verificationStatus).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.fullyVerified).toBe(false);
  });
  it("keeps exact no-difference result preliminary", () => {
    const r = {...fixture, invoice:{...fixture.invoice,unitPrice:"120.00",breakfastChargedSeparately:false, complimentaryCreditShown:true,cancellationTerms:"30 days"}};
    expect(codes(r)).toEqual(["NO_OBVIOUS_CONFLICT_EXTRACTED"]);
    expect(compareCommercialTerms(r).fullyVerified).toBe(false);
  });
  it("preserves evidence fields for review", () => {
    const result = compareCommercialTerms(fixture);
    expect(result.findings[0].agreementEvidence).toContain("Agreement p.2");
    expect(result.findings[0].invoiceEvidence).toContain("Invoice p.1");
  });
});
