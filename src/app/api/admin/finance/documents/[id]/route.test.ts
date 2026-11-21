import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { DELETE } from "./route";
import { isRegisteredEvidenceDocument } from "@/lib/epoch-ai/finance/isRegisteredEvidenceDocument";

vi.mock("@/lib/epoch-ai/finance/isRegisteredEvidenceDocument", () => ({
  isRegisteredEvidenceDocument: vi.fn(),
}));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  db: {
    financeDocument: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

const context = {
  params: Promise.resolve({ id: "document-1" }),
};

function request() {
  return new Request(
    "http://localhost:3000/api/admin/finance/documents/document-1",
    { method: "DELETE" },
  );
}

describe("Finance document deletion safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRegisteredEvidenceDocument).mockResolvedValue(false);

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: "admin-1",
        role: "ADMIN",
      },
    } as never);

    vi.mocked(db.financeDocument.findUnique).mockResolvedValue({
      id: "document-1",
      title: "Supplier quotation",
      originalFileName: "quotation.pdf",
      storagePath: "https://example.com/quotation.pdf",
    } as never);

    vi.mocked(db.financeDocument.delete).mockResolvedValue({
      id: "document-1",
    } as never);

    vi.mocked(del).mockResolvedValue(undefined as never);
  });

  it("deletes the database record before the Blob", async () => {
    const response = await DELETE(request(), context);

    expect(response.status).toBe(200);
    expect(db.financeDocument.delete).toHaveBeenCalledOnce();
    expect(del).toHaveBeenCalledOnce();

    const databaseOrder =
      vi.mocked(db.financeDocument.delete).mock.invocationCallOrder[0];

    const blobOrder =
      vi.mocked(del).mock.invocationCallOrder[0];

    expect(databaseOrder).toBeLessThan(blobOrder);
  });

  it("preserves the Blob when PostgreSQL rejects deletion", async () => {
    vi.mocked(db.financeDocument.delete).mockRejectedValue(
      new Error("Foreign key restriction"),
    );

    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await DELETE(request(), context);

      expect(response.status).not.toBe(200);
      expect(db.financeDocument.delete).toHaveBeenCalledOnce();
      expect(del).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("rejects deletion of registered commercial evidence", async () => {
    vi.mocked(isRegisteredEvidenceDocument).mockResolvedValue(true);

    const response = await DELETE(request(), context);

    expect(response.status).toBe(409);
    expect(isRegisteredEvidenceDocument).toHaveBeenCalledWith("document-1");
    expect(db.financeDocument.delete).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("preserves the document if the evidence lookup fails", async () => {
    vi.mocked(isRegisteredEvidenceDocument).mockRejectedValue(
      new Error("Evidence database unavailable"),
    );

    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await DELETE(request(), context);

      expect(response.status).not.toBe(200);
      expect(db.financeDocument.delete).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});