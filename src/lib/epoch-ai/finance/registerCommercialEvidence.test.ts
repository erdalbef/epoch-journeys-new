import { describe, expect, it, vi } from "vitest";
import {
  CommercialEvidenceSourceType,
  PrismaClient,
  Role,
} from "@prisma/client";
import { registerCommercialEvidence } from "./registerCommercialEvidence";

function setup() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "document-1" }]),
    user: {
      findUnique: vi.fn().mockResolvedValue({ role: Role.ADMIN }),
    },
    supplier: {
      findUnique: vi.fn().mockResolvedValue({ id: "supplier-1" }),
    },
    supplierPayable: {
      findUnique: vi.fn().mockResolvedValue({
        supplierId: "supplier-1",
      }),
    },
    supplierContract: {
      findUnique: vi.fn().mockResolvedValue({
        supplierId: "supplier-1",
      }),
    },
    financeDocument: {
      findUnique: vi.fn().mockResolvedValue({
        supplierId: "supplier-1",
        type: "AGREEMENT",
        supplierPayable: null,
      }),
    },
    supplierCommercialEvidence: {
      create: vi.fn().mockResolvedValue({
        id: "evidence-1",
        supplierId: "supplier-1",
        payableId: "payable-1",
        acceptanceStatus: "NOT_ESTABLISHED",
        reviewStatus: "NOT_VERIFIED",
      }),
    },
    supplierCommercialEvidenceEvent: {
      create: vi.fn().mockResolvedValue({ id: "event-1" }),
    },
  };

  const db = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx)),
  } as unknown as PrismaClient;

  return { db, tx };
}

const input = {
  supplierId: "supplier-1",
  payableId: "payable-1",
  sourceType: CommercialEvidenceSourceType.QUOTATION_ATTACHMENT,
  sourceDocumentId: "document-1",
  sourceReference: "Quotation dated 2026-09-01",
};

describe("Commercial evidence registration", () => {
  it("rejects a supplier invoice used as quotation evidence", async () => {
    const { db, tx } = setup();

    tx.financeDocument.findUnique.mockResolvedValue({
      supplierId: "supplier-1",
      type: "SUPPLIER_INVOICE",
      supplierPayable: null,
    });

    await expect(
      registerCommercialEvidence(db, "admin-1", input),
    ).rejects.toThrow("Document classification");

    expect(tx.supplierCommercialEvidence.create)
      .not.toHaveBeenCalled();
  });
  it("registers evidence without approving it", async () => {
    const { db, tx } = setup();

    const result = await registerCommercialEvidence(
      db, "admin-1", input,
    );

    expect(result.acceptanceStatus).toBe("NOT_ESTABLISHED");
    expect(result.reviewStatus).toBe("NOT_VERIFIED");

    expect(tx.supplierCommercialEvidenceEvent.create)
      .toHaveBeenCalledOnce();
  });

  it("rejects a payable belonging to another supplier", async () => {
    const { db, tx } = setup();

    tx.supplierPayable.findUnique.mockResolvedValue({
      supplierId: "supplier-2",
    });

    await expect(
      registerCommercialEvidence(db, "admin-1", input),
    ).rejects.toThrow("Payable does not belong");

    expect(tx.supplierCommercialEvidence.create)
      .not.toHaveBeenCalled();
  });

  it("rejects a source document belonging to another supplier", async () => {
    const { db, tx } = setup();

    tx.financeDocument.findUnique.mockResolvedValue({
      supplierId: "supplier-2",
      type: "AGREEMENT",
      supplierPayable: null,
    });

    await expect(
      registerCommercialEvidence(db, "admin-1", input),
    ).rejects.toThrow("Source document belongs");

    expect(tx.supplierCommercialEvidence.create)
      .not.toHaveBeenCalled();
  });

  it("rejects an unauthorized user", async () => {
    const { db, tx } = setup();

    tx.user.findUnique.mockResolvedValue({
      role: Role.AGENT,
    });

    await expect(
      registerCommercialEvidence(db, "agent-1", input),
    ).rejects.toThrow("Only an administrator");

    expect(tx.supplierCommercialEvidence.create)
      .not.toHaveBeenCalled();
  });

  it("rejects a quotation without a source document", async () => {
    const { db, tx } = setup();

    await expect(
      registerCommercialEvidence(db, "admin-1", {
        ...input,
        sourceDocumentId: null,
      }),
    ).rejects.toThrow("quotation document is required");

    expect(tx.supplierCommercialEvidence.create)
      .not.toHaveBeenCalled();
  });

  it("rejects contracts belonging to another supplier", async () => {
    const { db, tx } = setup();

    tx.supplierContract.findUnique.mockResolvedValue({
      supplierId: "supplier-2",
    });

    await expect(
      registerCommercialEvidence(db, "admin-1", {
        ...input,
        sourceType: CommercialEvidenceSourceType.FORMAL_CONTRACT,
        contractId: "contract-1",
      }),
    ).rejects.toThrow("Contract does not belong");

    expect(tx.supplierCommercialEvidence.create)
      .not.toHaveBeenCalled();
  });

  it("locks the source document before registering evidence", async () => {
    const { db, tx } = setup();

    await registerCommercialEvidence(db, "admin-1", input);

    expect(tx.$queryRaw).toHaveBeenCalledOnce();

    const lockOrder = tx.$queryRaw.mock.invocationCallOrder[0];
    const documentReadOrder =
      tx.financeDocument.findUnique.mock.invocationCallOrder[0];
    const registrationOrder =
      tx.supplierCommercialEvidence.create.mock.invocationCallOrder[0];

    expect(lockOrder).toBeLessThan(documentReadOrder);
    expect(documentReadOrder).toBeLessThan(registrationOrder);
  });

  it("does not register evidence when the document cannot be locked", async () => {
    const { db, tx } = setup();

    tx.$queryRaw.mockResolvedValue([]);

    await expect(
      registerCommercialEvidence(db, "admin-1", input),
    ).rejects.toThrow("Source document not found.");

    expect(tx.supplierCommercialEvidence.create)
      .not.toHaveBeenCalled();

    expect(tx.supplierCommercialEvidenceEvent.create)
      .not.toHaveBeenCalled();
  });
});