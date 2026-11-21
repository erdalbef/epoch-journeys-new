import { describe, expect, it } from "vitest";
import { assessEvidenceDocumentProtection } from "./commercialEvidenceDocumentProtection";

describe("Commercial evidence document protection", () => {
  it("blocks replacement of registered source evidence", () => {
    expect(assessEvidenceDocumentProtection({
      sourceReferences: 1,
      acceptanceReferences: 0,
      operation: "REPLACE_FILE",
    }).allowed).toBe(false);
  });

  it("blocks deletion of acceptance evidence", () => {
    expect(assessEvidenceDocumentProtection({
      sourceReferences: 0,
      acceptanceReferences: 1,
      operation: "DELETE",
    }).allowed).toBe(false);
  });

  it("blocks changes to the identity of registered evidence", () => {
    expect(assessEvidenceDocumentProtection({
      sourceReferences: 1,
      acceptanceReferences: 0,
      operation: "CHANGE_IDENTITY",
    }).allowed).toBe(false);
  });

  it("allows unrelated documents to be replaced", () => {
    expect(assessEvidenceDocumentProtection({
      sourceReferences: 0,
      acceptanceReferences: 0,
      operation: "REPLACE_FILE",
    }).allowed).toBe(true);
  });

  it("allows descriptive edits to registered documents", () => {
    expect(assessEvidenceDocumentProtection({
      sourceReferences: 1,
      acceptanceReferences: 0,
      operation: "EDIT_DESCRIPTION",
    }).allowed).toBe(true);
  });

  it("rejects invalid reference counts", () => {
    expect(() => assessEvidenceDocumentProtection({
      sourceReferences: -1,
      acceptanceReferences: 0,
      operation: "DELETE",
    })).toThrow("Invalid evidence reference counts.");
  });
});