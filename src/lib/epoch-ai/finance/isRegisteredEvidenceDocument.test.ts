import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { isRegisteredEvidenceDocument } from "./isRegisteredEvidenceDocument";

vi.mock("@/lib/db", () => ({
  db: {
    supplierCommercialEvidence: {
      count: vi.fn(),
    },
  },
}));

const previousSetting =
  process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION;

describe("Registered evidence document protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION;
  });

  afterEach(() => {
    if (previousSetting === undefined) {
      delete process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION;
    } else {
      process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION = previousSetting;
    }
  });

  it("does not query an unconfigured database", async () => {
    expect(await isRegisteredEvidenceDocument("doc-1")).toBe(false);
    expect(db.supplierCommercialEvidence.count).not.toHaveBeenCalled();
  });

  it("recognizes registered evidence", async () => {
    process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION = "enabled";
    vi.mocked(db.supplierCommercialEvidence.count).mockResolvedValue(1);

    expect(await isRegisteredEvidenceDocument("doc-1")).toBe(true);

    expect(db.supplierCommercialEvidence.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { sourceDocumentId: "doc-1" },
          { acceptanceDocumentId: "doc-1" },
        ],
      },
    });
  });

  it("recognizes unrelated documents", async () => {
    process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION = "enabled";
    vi.mocked(db.supplierCommercialEvidence.count).mockResolvedValue(0);

    expect(await isRegisteredEvidenceDocument("doc-2")).toBe(false);
  });

  it("rejects failed lookups instead of allowing changes", async () => {
    process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION = "enabled";

    vi.mocked(db.supplierCommercialEvidence.count).mockRejectedValue(
      new Error("Evidence database unavailable"),
    );

    await expect(
      isRegisteredEvidenceDocument("doc-3"),
    ).rejects.toThrow("Evidence database unavailable");
  });

  it("rejects empty IDs when protection is active", async () => {
    process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION = "enabled";

    await expect(
      isRegisteredEvidenceDocument(""),
    ).rejects.toThrow("Document ID is required.");
  });
});