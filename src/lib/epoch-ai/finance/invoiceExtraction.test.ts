import { describe, expect, it } from "vitest";
import { validateInvoiceExtraction } from "./invoiceExtraction";

describe("Epoch AI invoice extraction validation", () => {
  const valid = {
    supplierName: "VOX AUDIO GUIDE",
    invoiceNumber: "9595/2026",
    invoiceDate: "2026-09-09",
    invoiceTotal: "202.00",
    currency: "EUR",
    serviceDescription: "Audio guide services",
    evidence: "Invoice total shown in PDF",
  };

  it("accepts valid invoice information", () => {
    expect(validateInvoiceExtraction(valid)).toEqual(valid);
  });

  it("accepts missing amounts without inventing values", () => {
    const result = validateInvoiceExtraction({
      ...valid,
      invoiceTotal: null,
    });

    expect(result.invoiceTotal).toBeNull();
  });

  it("rejects invalid monetary precision", () => {
    expect(() =>
      validateInvoiceExtraction({
        ...valid,
        invoiceTotal: "202.999",
      })
    ).toThrow();
  });

  it("rejects invalid currency codes", () => {
    expect(() =>
      validateInvoiceExtraction({
        ...valid,
        currency: "EURO",
      })
    ).toThrow();
  });

  it("rejects unexpected fields", () => {
    expect(() =>
      validateInvoiceExtraction({
        ...valid,
        approvedByAI: true,
      })
    ).toThrow();
  });
});
