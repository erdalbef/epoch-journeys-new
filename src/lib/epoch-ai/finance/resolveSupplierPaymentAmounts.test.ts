import { describe, expect, it } from "vitest";
import { resolveSupplierPaymentAmounts } from "./resolveSupplierPaymentAmounts";

describe("Supplier payment multi-currency validation", () => {
  it("preserves existing EUR-to-EUR payment behavior", () => {
    const result = resolveSupplierPaymentAmounts({
      payableCurrency: "EUR",
      bankCurrency: "EUR",
      supplierAmount: "1000.00",
    });

    expect(result.supplierAmount.toFixed(2)).toBe("1000.00");
    expect(result.bankDebitAmount.toFixed(2)).toBe("1000.00");
    expect(result.isCrossCurrency).toBe(false);
  });

  it("keeps CHF settlement separate from the EUR bank debit", () => {
    const result = resolveSupplierPaymentAmounts({
      payableCurrency: "CHF",
      bankCurrency: "EUR",
      supplierAmount: "2500.00",
      bankDebitAmount: "2650.00",
    });

    expect(result.supplierCurrency).toBe("CHF");
    expect(result.bankCurrency).toBe("EUR");
    expect(result.supplierAmount.toFixed(2)).toBe("2500.00");
    expect(result.bankDebitAmount.toFixed(2)).toBe("2650.00");
    expect(result.isCrossCurrency).toBe(true);
  });

  it("requires an explicit bank debit for cross-currency payments", () => {
    expect(() =>
      resolveSupplierPaymentAmounts({
        payableCurrency: "GBP",
        bankCurrency: "EUR",
        supplierAmount: "500.00",
      }),
    ).toThrow("Actual bank debit is required");
  });

  it("rejects a zero or negative bank debit", () => {
    expect(() =>
      resolveSupplierPaymentAmounts({
        payableCurrency: "USD",
        bankCurrency: "EUR",
        supplierAmount: "400.00",
        bankDebitAmount: "0",
      }),
    ).toThrow("Bank debit amount must be a positive");
  });

  it("rejects unsupported decimal precision", () => {
    expect(() =>
      resolveSupplierPaymentAmounts({
        payableCurrency: "TRY",
        bankCurrency: "EUR",
        supplierAmount: "100.001",
        bankDebitAmount: "3.00",
      }),
    ).toThrow("two decimal places");
  });

  it("rejects unequal same-currency payments", () => {
    expect(() =>
      resolveSupplierPaymentAmounts({
        payableCurrency: "EUR",
        bankCurrency: "EUR",
        supplierAmount: "100.00",
        bankDebitAmount: "105.00",
      }),
    ).toThrow("bank debit must equal");
  });

  it("does not round or assume an exchange rate", () => {
    const result = resolveSupplierPaymentAmounts({
      payableCurrency: "JPY",
      bankCurrency: "EUR",
      supplierAmount: "100000",
      bankDebitAmount: "610.47",
    });

    expect(result.supplierAmount.toFixed(2)).toBe("100000.00");
    expect(result.bankDebitAmount.toFixed(2)).toBe("610.47");
  });
});