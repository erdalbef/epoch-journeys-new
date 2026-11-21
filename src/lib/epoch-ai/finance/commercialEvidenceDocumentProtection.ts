export type EvidenceDocumentOperation =
  | "REPLACE_FILE"
  | "DELETE"
  | "CHANGE_IDENTITY"
  | "EDIT_DESCRIPTION";

export function assessEvidenceDocumentProtection(input: {
  sourceReferences: number;
  acceptanceReferences: number;
  operation: EvidenceDocumentOperation;
}) {
  if (
    !Number.isSafeInteger(input.sourceReferences) ||
    !Number.isSafeInteger(input.acceptanceReferences) ||
    input.sourceReferences < 0 ||
    input.acceptanceReferences < 0
  ) {
    throw new Error("Invalid evidence reference counts.");
  }

  const protectedDocument =
    input.sourceReferences > 0 ||
    input.acceptanceReferences > 0;

  const restricted =
    input.operation === "REPLACE_FILE" ||
    input.operation === "DELETE" ||
    input.operation === "CHANGE_IDENTITY";

  return {
    protectedDocument,
    allowed: !(protectedDocument && restricted),
    reason:
      protectedDocument && restricted
        ? "Registered commercial evidence must be preserved."
        : null,
  };
}