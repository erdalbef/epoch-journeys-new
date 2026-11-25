import { createHash, randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { hotelOfferSource, maxHotelOfferFileSize } from "@/lib/epoch-ai/receivedHotelOffer";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { isRequestWithinLimit } from "@/lib/security/requestBodyLimit";
import { deleteFinanceFile, saveFinanceFile } from "@/lib/storage/finansFileStorage";

type Params = { params: Promise<{ id: string }> };
const reply = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  const { id } = await params;
  const offers = await db.supplierCommercialEvidence.findMany({
    where: { hotelInquiryId: id },
    orderBy: { version: "desc" },
    select: {
      id: true, version: true, sourceDate: true, sourceType: true,
      sourceSender: true, sourceSubject: true, sourceMessageId: true,
      sourceBody: true, reviewStatus: true, reviewedTerms: true,
      sourceDocument: { select: { id: true, originalFileName: true } },
    },
  });
  return reply({ offers });
}

export async function POST(request: Request, { params }: Params) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Same-origin request required." }, 403);
  }
  if (!(await isRequestWithinLimit(request, maxHotelOfferFileSize + 256 * 1024))) {
    return reply({ error: "Attachments must be 3 MB or smaller." }, 413);
  }
  const actorId = (await getServerSession(authOptions))?.user?.id;
  if (!actorId) return reply({ error: "Admin identity required." }, 403);
  const { id } = await params;
  const form = await request.formData().catch(() => null);
  if (!form || form.get("confirmation") !== "RECORD_RECEIVED_OFFER") {
    return reply({ error: "Confirm that you want to record this offer." }, 400);
  }
  const parsed = hotelOfferSource.safeParse({
    sender: form.get("sender"), subject: form.get("subject"), receivedDate: form.get("receivedDate"),
    messageId: form.get("messageId") ?? "", body: form.get("body") ?? "",
  });
  if (!parsed.success) return reply({ error: "Enter the supplier email, subject, received date and valid offer text." }, 400);
  const { sender, subject, receivedDate, messageId, body } = parsed.data;
  const upload = form.get("attachment");
  const file = upload instanceof File && upload.size ? upload : null;
  if (!file && !body.trim()) return reply({ error: "Paste the email offer or upload its PDF or Word attachment." }, 400);

  const ext = file?.name.split(".").at(-1)?.toLowerCase();
  if (file && ((ext !== "pdf" && ext !== "docx") || file.size > maxHotelOfferFileSize)) {
    return reply({ error: "Upload a PDF or DOCX attachment up to 3 MB." }, 400);
  }
  const bytes = file ? Buffer.from(await file.arrayBuffer()) : null;
  if (bytes && (ext === "pdf" ? bytes.subarray(0, 5).toString() !== "%PDF-" :
    !bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))) {
    return reply({ error: "The attachment does not match its file extension." }, 400);
  }
  const inquiry = await db.hotelInquiry.findUnique({
    where: { id }, select: { supplierId: true, tourId: true, status: true },
  });
  if (!inquiry || inquiry.status !== "APPROVED") return reply({ error: "An approved hotel inquiry is required." }, 409);

  const fingerprint = createHash("sha256")
    .update(JSON.stringify([sender.toLowerCase(), subject, receivedDate, messageId, body, ext]))
    .update(bytes ?? Buffer.alloc(0)).digest("hex");
  const existing = () => db.supplierCommercialEvidence.findUnique({
    where: { hotelInquiryId_sourceFingerprint: { hotelInquiryId: id, sourceFingerprint: fingerprint } },
    select: { id: true },
  });
  if (await existing()) return reply({ alreadyRecorded: true });

  if (file && !process.env.BLOB_READ_WRITE_TOKEN?.trim() && !process.env.VERCEL_OIDC_TOKEN?.trim()) {
    return reply({ error: "Private attachment storage is unavailable. You can still record an offer pasted from the email." }, 503);
  }

  const sourceDate = new Date(receivedDate + "T00:00:00Z");
  const documentId = file ? randomUUID() : null;
  let stored: Awaited<ReturnType<typeof saveFinanceFile>> | undefined;
  try {
    if (file && bytes) {
      const documentFile = new File([new Uint8Array(bytes)], file.name.replace(/[\\/\r\n]/g, "_").slice(-160), {
        type: ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      stored = await saveFinanceFile({
        file: documentFile, year: sourceDate.getUTCFullYear(), month: sourceDate.getUTCMonth() + 1,
        safeFileName: documentFile.name.replace(/[^a-z0-9._-]/gi, "_").slice(-150),
      });
    }
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "HotelInquiry" WHERE "id" = ${id} FOR UPDATE`;
      const previous = await tx.supplierCommercialEvidence.findFirst({
        where: { hotelInquiryId: id }, orderBy: { version: "desc" }, select: { id: true, version: true },
      });
      if (stored && documentId) {
        const { localAbsolutePath: _localPath, ...document } = stored;
        await tx.financeDocument.create({ data: {
          ...document, id: documentId, type: "OTHER", title: `Hotel offer: ${subject}`,
          documentDate: sourceDate, supplierId: inquiry.supplierId, tourId: inquiry.tourId, uploadedById: actorId,
        } });
      }
      await tx.supplierCommercialEvidence.create({
        data: {
          supplierId: inquiry.supplierId, hotelInquiryId: id, sourceFingerprint: fingerprint,
          sourceType: file ? "QUOTATION_ATTACHMENT" : "EMAIL_BODY",
          sourceDocumentId: documentId, sourceBody: body.trim() ? body : null,
          sourceReference: messageId || subject, sourceDate, sourceSender: sender, sourceSubject: subject,
          sourceMessageId: messageId || null, reviewStatus: "REVIEW_PENDING", recordedById: actorId,
          version: (previous?.version ?? 0) + 1, previousEvidenceId: previous?.id,
          events: { create: { actorId, eventType: "HOTEL_OFFER_RECORDED", newStatus: "REVIEW_PENDING" } },
        },
      });
    });
    return reply({ recorded: true }, 201);
  } catch (error) {
    console.error("HOTEL_OFFER_RECORD_FAILED", error instanceof Error ? error.name : "Unknown");
    const recorded = await existing().catch(() => undefined);
    if (stored && documentId) {
      const document = await db.financeDocument.findUnique({ where: { id: documentId }, select: { id: true } })
        .catch(() => undefined);
      if (document === null) await deleteFinanceFile(stored.storagePath).catch(() => undefined);
    }
    if (recorded) return reply({ alreadyRecorded: true });
    return reply({ error: "The offer could not be recorded. Check the inquiry history before retrying." }, 503);
  }
}
