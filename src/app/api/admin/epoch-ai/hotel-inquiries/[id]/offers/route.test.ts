import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findInquiry: vi.fn(), findOffer: vi.fn(), previous: vi.fn(), createOffer: vi.fn(),
  createDocument: vi.fn(), saveFile: vi.fn(), findTour: vi.fn(), findSupplier: vi.fn(),
}));
vi.mock("@/lib/security/requireAdminApiAccess", () => ({ requireAdminApiAccess: async () => null }));
vi.mock("@/lib/security/requestBodyLimit", () => ({ isRequestWithinLimit: async () => true }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/lib/storage/finansFileStorage", () => ({ saveFinanceFile: mocks.saveFile, deleteFinanceFile: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    hotelInquiry: { findUnique: mocks.findInquiry },
    tour: { findUnique: mocks.findTour },
    supplier: { findFirst: mocks.findSupplier },
    supplierCommercialEvidence: { findFirst: mocks.findOffer },
    $transaction: (run: (tx: unknown) => unknown) => run({
      $queryRaw: vi.fn(),
      financeDocument: { create: mocks.createDocument },
      supplierCommercialEvidence: { findFirst: mocks.previous, create: mocks.createOffer },
    }),
  },
}));

import { POST } from "./route";

function record(offer: { body?: string; file?: File; confirmation?: string; manualStayKey?: string } = {}) {
  const form = new FormData();
  form.set("sender", "sales@example.com");
  form.set("subject", "Helsinki group offer");
  form.set("receivedDate", "2026-11-25");
  form.set("confirmation", offer.confirmation ?? "RECORD_RECEIVED_OFFER");
  if (offer.body) form.set("body", offer.body);
  if (offer.file) form.set("attachment", offer.file);
  const id = offer.manualStayKey ? "manual" : "inquiry-1";
  const query = offer.manualStayKey ? "?" + new URLSearchParams({
    tourId: "tour-1", supplierId: "hotel-1", stayKey: offer.manualStayKey,
  }) : "";
  return POST(new Request(`https://epoch.example/api/admin/epoch-ai/hotel-inquiries/${id}/offers${query}`, {
    method: "POST", headers: { origin: "https://epoch.example" }, body: form,
  }), { params: Promise.resolve({ id }) });
}

describe("Record hotel offers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findInquiry.mockResolvedValue({ supplierId: "hotel-1", tourId: "tour-1", status: "APPROVED" });
    mocks.findOffer.mockResolvedValue(null);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("preserves pasted text and appends a pending version to the exact inquiry", async () => {
    mocks.previous.mockResolvedValue({ id: "earlier", version: 1 });
    const body = " Double room €145 per room per night BB.\n ";
    expect((await record({ body })).status).toBe(201);
    expect(mocks.createOffer).toHaveBeenCalledWith({ data: expect.objectContaining({
      supplierId: "hotel-1", hotelInquiryId: "inquiry-1", version: 2, previousEvidenceId: "earlier",
      sourceType: "EMAIL_BODY", sourceBody: body.replace(/\n/g, "\r\n"), reviewStatus: "REVIEW_PENDING",
      recordedById: "admin-1",
    }) });
    expect(mocks.saveFile).not.toHaveBeenCalled();
  });

  it("links a single private document to the attachment offer", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "configured");
    mocks.saveFile.mockResolvedValue({
      storagePath: "https://store.private.blob.vercel-storage.com/accounting/offer.pdf",
      originalFileName: "offer.pdf", storedFileName: "offer.pdf", mimeType: "application/pdf",
      fileSize: 10, localAbsolutePath: null,
    });
    expect((await record({ file: new File(["%PDF-1.7"], "offer.pdf") })).status).toBe(201);
    const documentId = mocks.createDocument.mock.calls[0][0].data.id;
    expect(mocks.createOffer).toHaveBeenCalledWith({ data: expect.objectContaining({
      sourceType: "QUOTATION_ATTACHMENT", sourceDocumentId: documentId, reviewStatus: "REVIEW_PENDING",
    }) });
  });

  it("requires confirmation and skips duplicate sources", async () => {
    expect((await record({ body: "Offer", confirmation: "" })).status).toBe(400);
    mocks.findOffer.mockResolvedValue({ id: "existing" });
    expect(await (await record({ body: "Offer" })).json()).toEqual({ alreadyRecorded: true });
    expect(mocks.createOffer).not.toHaveBeenCalled();
  });

  it("records a reply for a CRM hotel and stay without creating an inquiry", async () => {
    mocks.findTour.mockResolvedValue({ id: "tour-1" });
    mocks.findSupplier.mockResolvedValue({ id: "hotel-1" });
    const manualStayKey = '["Sarajevo","2027-05-07","2027-05-08"]';
    expect((await record({ body: "Room offer", manualStayKey })).status).toBe(201);
    expect(mocks.findInquiry).not.toHaveBeenCalled();
    expect(mocks.createOffer).toHaveBeenCalledWith({ data: expect.objectContaining({
      supplierId: "hotel-1", manualHotelTourId: "tour-1", manualHotelStayKey: manualStayKey,
      reviewStatus: "REVIEW_PENDING",
    }) });
    expect((await record({ body: "Room offer", manualStayKey: '["Sarajevo","2027-05-08","2027-05-07"]' })).status).toBe(400);
  });
});
