import { describe, expect, it } from "vitest";
import { compareInvoiceAmounts } from "./compareInvoiceAmounts";

describe("Epoch AI financial comparison", () => {
  const base = {
    invoiceAmount: "202.00",
    invoiceCurrency: "EUR",
    approvedAmount: "202.00",
    payableCurrency: "EUR",
    contractedAmount: "202.00",
  };

  it("identifies matching amounts", () => {
    const result = compareInvoiceAmounts(base);

    expect(result.status).toBe("MATCH");
    expect(result.variance).toBe("0.00");
    expect(result.contractedVariance).toBe("0.00");
  });

  it("identifies a real discrepancy", () => {
    const result = compareInvoiceAmounts({
      ...base,
      invoiceAmount: "220.00",
    });

    expect(result.status).toBe("DISCREPANCY");
    expect(result.variance).toBe("18.00");
  });

  it("rejects insufficient invoice evidence", () => {
    const result = compareInvoiceAmounts({
      ...base,
      invoiceAmount: null,
    });

    expect(result.status).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.variance).toBeNull();
  });

  it("detects currency differences", () => {
    const result = compareInvoiceAmounts({
      ...base,
      invoiceCurrency: "USD",
    });

    expect(result.status).toBe("DISCREPANCY");
    expect(result.variance).toBeNull();
  });

  it("does not confuse contracted and approved amounts", () => {
    const result = compareInvoiceAmounts({
      ...base,
      contractedAmount: "200.00",
    });

    expect(result.status).toBe("MATCH");
    expect(result.variance).toBe("0.00");
    expect(result.contractedVariance).toBe("2.00");
  });

  it("rejects invalid monetary values", () => {
    const result = compareInvoiceAmounts({
      ...base,
      invoiceAmount: "202.999",
    });

    expect(result.status).toBe("INSUFFICIENT_EVIDENCE");
  });
});
