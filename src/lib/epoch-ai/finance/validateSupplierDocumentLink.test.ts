import { describe, expect, it } from "vitest";
import { validateSupplierDocumentLink } from "./validateSupplierDocumentLink";

describe("Supplier document relationship validation", () => {
  it("accepts matching suppliers", () => {
    expect(validateSupplierDocumentLink({
      documentSupplierId: "supplier-1",
      payableId: "payable-1",
      payableSupplierId: "supplier-1",
    }).valid).toBe(true);
  });

  it("rejects mismatched suppliers", () => {
    expect(validateSupplierDocumentLink({
      documentSupplierId: "supplier-2",
      payableId: "payable-1",
      payableSupplierId: "supplier-1",
    }).valid).toBe(false);
  });

  it("accepts payable-only documents", () => {
    expect(validateSupplierDocumentLink({
      documentSupplierId: null,
      payableId: "payable-1",
      payableSupplierId: "supplier-1",
    }).valid).toBe(true);
  });

  it("rejects missing payable supplier information", () => {
    expect(validateSupplierDocumentLink({
      documentSupplierId: "supplier-1",
      payableId: "payable-1",
      payableSupplierId: null,
    }).valid).toBe(false);
  });

  it("allows supplier-only documents", () => {
    expect(validateSupplierDocumentLink({
      documentSupplierId: "supplier-1",
      payableId: null,
      payableSupplierId: null,
    }).valid).toBe(true);
  });
});