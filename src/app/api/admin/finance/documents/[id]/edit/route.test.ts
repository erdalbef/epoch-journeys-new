import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { del, put } from "@vercel/blob";
import { db } from "@/lib/db";
import { isRegisteredEvidenceDocument } from "@/lib/epoch-ai/finance/isRegisteredEvidenceDocument";
import { POST } from "./route";

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
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/epoch-ai/finance/isRegisteredEvidenceDocument", () => ({
  isRegisteredEvidenceDocument: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
  put: vi.fn(),
}));

const context = {
  params: Promise.resolve({ id: "document-1" }),
};

function request(
  action: string,
  replacement = false,
): Request {
  const form = new FormData();
  form.set("_action", action);

  if (replacement) {
    form.set(
      "file",
      new Blob(["replacement document"], {
        type: "application/pdf",
      }),
      "replacement.pdf",
    );
  }

  return new Request(
    "http://localhost:3000/api/admin/finance/documents/document-1/edit",
    {
      method: "POST",
      body: form,
    },
  );
}

describe("Finance document editor evidence protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
      storedFileName: "quotation.pdf",
      storagePath: "https://example.com/quotation.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      accountingPeriodId: null,
      expenseId: null,
      supplierPayableId: null,
      supplierPayablePaymentId: null,
      refundId: null,
      bankTransactionId: null,
      bookingId: null,
      tourId: null,
      departureDateId: null,
      supplierId: null,
      paymentId: null,
      salesDocumentId: null,
    } as never);

    vi.mocked(isRegisteredEvidenceDocument).mockResolvedValue(false);
    vi.mocked(db.financeDocument.delete).mockResolvedValue({
      id: "document-1",
    } as never);

    vi.mocked(del).mockResolvedValue(undefined as never);
  });

  it("rejects replacement of registered evidence before Blob upload", async () => {
    vi.mocked(isRegisteredEvidenceDocument).mockResolvedValue(true);

    const response = await POST(
      request("save", true),
      context,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(
      "registered",
    );

    expect(isRegisteredEvidenceDocument).toHaveBeenCalledWith(
      "document-1",
    );

    expect(put).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(db.financeDocument.update).not.toHaveBeenCalled();
    expect(db.financeDocument.delete).not.toHaveBeenCalled();
  });

  it("rejects confirmed deletion of registered evidence", async () => {
    vi.mocked(isRegisteredEvidenceDocument).mockResolvedValue(true);

    const response = await POST(
      request("delete-confirmed"),
      context,
    );

    expect(response.status).toBe(303);
    expect(db.financeDocument.delete).not.toHaveBeenCalled();
    expect(db.financeDocument.update).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("preserves the original document when evidence lookup fails", async () => {
    vi.mocked(isRegisteredEvidenceDocument).mockRejectedValue(
      new Error("Evidence lookup unavailable"),
    );

    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await POST(
        request("save", true),
        context,
      );

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toContain(
        "Evidence",
      );

      expect(db.financeDocument.update).not.toHaveBeenCalled();
      expect(db.financeDocument.delete).not.toHaveBeenCalled();
      expect(put).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("allows the read-only deletion confirmation preview", async () => {
    vi.mocked(isRegisteredEvidenceDocument).mockResolvedValue(true);

    const response = await POST(
      request("delete"),
      context,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(
      "confirmDelete=1",
    );
    expect(db.financeDocument.delete).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("preserves ordinary unlinked document deletion", async () => {
    const response = await POST(
      request("delete-confirmed"),
      context,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(
      "deleted=1",
    );

    expect(db.financeDocument.delete).toHaveBeenCalledOnce();
    expect(del).toHaveBeenCalledOnce();
    expect(put).not.toHaveBeenCalled();
  });
});