export type SupplierDocumentLink = {
  documentSupplierId: string | null;
  payableId: string | null;
  payableSupplierId: string | null;
};

export function validateSupplierDocumentLink(
  input: SupplierDocumentLink,
) {
  if (!input.payableId) {
    return {
      valid: true,
      reason: "No payable relationship requires validation.",
    };
  }

  if (!input.payableSupplierId) {
    return {
      valid: false,
      reason: "Linked payable supplier could not be established.",
    };
  }

  if (
    input.documentSupplierId &&
    input.documentSupplierId !== input.payableSupplierId
  ) {
    return {
      valid: false,
      reason: "Document supplier does not match payable supplier.",
    };
  }

  return {
    valid: true,
    reason: "Supplier relationship is consistent.",
  };
}