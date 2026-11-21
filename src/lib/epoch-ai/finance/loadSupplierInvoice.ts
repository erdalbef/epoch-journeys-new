import "server-only";

import { db } from "@/lib/db";
import { readFinanceFile } from "@/lib/storage/finansFileStorage";

const MAX_PDF_BYTES = 6 * 1024 * 1024;

export async function loadSupplierInvoice(
  payableId: string,
) {
  if (!payableId || payableId.length > 128) {
    throw new Error("Invalid payable ID.");
  }

  const payable = await db.supplierPayable.findUnique({
    where: { id: payableId },
    select: {
      id: true,
      supplierInvoiceNumber: true,
      documents: {
        where: {
          type: "SUPPLIER_INVOICE",
          mimeType: "application/pdf",
        },
        select: {
          id: true,
          originalFileName: true,
          storagePath: true,
          fileSize: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!payable) {
    throw new Error("Supplier payable not found.");
  }

  const documents = [];

  for (const document of payable.documents.slice(0, 3)) {
    if (
      document.fileSize <= 0 ||
      document.fileSize > MAX_PDF_BYTES
    ) {
      continue;
    }

    // Initial implementation: private Blob files only.
    if (
      !/^https:\/\/[^/]+\.private\.blob\.vercel-storage\.com\//i.test(
        document.storagePath,
      )
    ) {
      continue;
    }

    const bytes = await readFinanceFile(
      document.storagePath,
    );

    if (
      !bytes ||
      bytes.length > MAX_PDF_BYTES ||
      bytes.length !== document.fileSize ||
      bytes.subarray(0, 5).toString("ascii") !== "%PDF-"
    ) {
      throw new Error("Invoice document validation failed.");
    }

    documents.push({
      id: document.id,
      fileName: document.originalFileName,
      mimeType: "application/pdf",
      content: `data:application/pdf;base64,${bytes.toString("base64")}`,
    });
  }

  return {
    payableId: payable.id,
    invoiceNumber: payable.supplierInvoiceNumber,
    documents,
  };
}
