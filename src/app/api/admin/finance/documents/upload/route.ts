import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { FinanceDocumentType, Role } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function cleanString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseDate(value: FormDataEntryValue | null) {
  const raw = cleanString(value);

  if (!raw) {
    return null;
  }

  const date = new Date(`${raw}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function sanitizeBaseName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function extensionFromName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();

  if (!ext) {
    return "";
  }

  return ext.slice(0, 12);
}

function buildStorageFolder(type: FinanceDocumentType) {
  switch (type) {
    case FinanceDocumentType.EXPENSE_RECEIPT:
    case FinanceDocumentType.EXPENSE_INVOICE:
      return "expenses";

    case FinanceDocumentType.SUPPLIER_INVOICE:
    case FinanceDocumentType.SUPPLIER_CREDIT_NOTE:
    case FinanceDocumentType.SUPPLIER_PAYMENT_PROOF:
      return "suppliers";

    case FinanceDocumentType.CUSTOMER_PAYMENT_PROOF:
      return "customer-payments";

    case FinanceDocumentType.CUSTOMER_REFUND_PROOF:
      return "refunds";

    case FinanceDocumentType.BANK_STATEMENT:
    case FinanceDocumentType.BANK_TRANSFER_PROOF:
      return "banking";

    case FinanceDocumentType.TAX_DOCUMENT:
      return "tax";

    case FinanceDocumentType.CONTRACT:
    case FinanceDocumentType.AGREEMENT:
      return "contracts";

    case FinanceDocumentType.CREDIT_NOTE:
    case FinanceDocumentType.INVOICE:
      return "invoices";

    default:
      return "other";
  }
}

async function validateLinkedRecords({
  expenseId,
  supplierPayableId,
  supplierPayablePaymentId,
  refundId,
  bankTransactionId,
  bookingId,
  tourId,
  departureDateId,
  supplierId,
}: {
  expenseId: string | null;
  supplierPayableId: string | null;
  supplierPayablePaymentId: string | null;
  refundId: string | null;
  bankTransactionId: string | null;
  bookingId: string | null;
  tourId: string | null;
  departureDateId: string | null;
  supplierId: string | null;
}) {
  const checks: Promise<boolean>[] = [];

  if (expenseId) {
    checks.push(
      db.expense
        .findUnique({
          where: { id: expenseId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (supplierPayableId) {
    checks.push(
      db.supplierPayable
        .findUnique({
          where: { id: supplierPayableId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (supplierPayablePaymentId) {
    checks.push(
      db.supplierPayablePayment
        .findUnique({
          where: { id: supplierPayablePaymentId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (refundId) {
    checks.push(
      db.refund
        .findUnique({
          where: { id: refundId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (bankTransactionId) {
    checks.push(
      db.bankTransaction
        .findUnique({
          where: { id: bankTransactionId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (bookingId) {
    checks.push(
      db.booking
        .findUnique({
          where: { id: bookingId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (tourId) {
    checks.push(
      db.tour
        .findUnique({
          where: { id: tourId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (departureDateId) {
    checks.push(
      db.departureDate
        .findUnique({
          where: { id: departureDateId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (supplierId) {
    checks.push(
      db.supplier
        .findUnique({
          where: { id: supplierId },
          select: { id: true },
        })
        .then(Boolean),
    );
  }

  if (checks.length === 0) {
    return true;
  }

  const results = await Promise.all(checks);

  return results.every(Boolean);
}

export async function POST(request: Request) {
  let writtenFilePath: string | null = null;

  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    if (
      !file ||
      typeof file === "string"
    ) {
      return NextResponse.json(
        {
          error: "A document file is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          error: "Uploaded file is empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File must be smaller than 20 MB.",
        },
        {
          status: 400,
        },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX.",
        },
        {
          status: 400,
        },
      );
    }

    const typeRaw = cleanString(
      formData.get("type"),
    );

    if (
      !Object.values(FinanceDocumentType).includes(
        typeRaw as FinanceDocumentType,
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid finance document type.",
        },
        {
          status: 400,
        },
      );
    }

    const type =
      typeRaw as FinanceDocumentType;

    const title =
      cleanString(formData.get("title"));

    if (!title) {
      return NextResponse.json(
        {
          error: "Document title is required.",
        },
        {
          status: 400,
        },
      );
    }

    const description =
      cleanString(
        formData.get("description"),
      ) || null;

    const documentDate =
      parseDate(
        formData.get("documentDate"),
      );

    const referenceNumber =
      cleanString(
        formData.get("referenceNumber"),
      ) || null;

    const notes =
      cleanString(
        formData.get("notes"),
      ) || null;

    const expenseId =
      cleanString(
        formData.get("expenseId"),
      ) || null;

    const supplierPayableId =
      cleanString(
        formData.get("supplierPayableId"),
      ) || null;

    const supplierPayablePaymentId =
      cleanString(
        formData.get(
          "supplierPayablePaymentId",
        ),
      ) || null;

    const refundId =
      cleanString(
        formData.get("refundId"),
      ) || null;

    const bankTransactionId =
      cleanString(
        formData.get("bankTransactionId"),
      ) || null;

    const bookingId =
      cleanString(
        formData.get("bookingId"),
      ) || null;

    const tourId =
      cleanString(
        formData.get("tourId"),
      ) || null;

    const departureDateId =
      cleanString(
        formData.get("departureDateId"),
      ) || null;

    const supplierId =
      cleanString(
        formData.get("supplierId"),
      ) || null;

    const linksAreValid =
      await validateLinkedRecords({
        expenseId,
        supplierPayableId,
        supplierPayablePaymentId,
        refundId,
        bankTransactionId,
        bookingId,
        tourId,
        departureDateId,
        supplierId,
      });

    if (!linksAreValid) {
      return NextResponse.json(
        {
          error:
            "One or more linked finance records were not found.",
        },
        {
          status: 400,
        },
      );
    }

    const folder =
      buildStorageFolder(type);

    const storageRoot =
      path.join(
        process.cwd(),
        "storage",
        "finance",
      );

    const storageDirectory =
      path.join(
        storageRoot,
        folder,
      );

    await fs.mkdir(
      storageDirectory,
      {
        recursive: true,
      },
    );

    const originalFileName =
      file.name || "document";

    const originalExtension =
      extensionFromName(
        originalFileName,
      );

    const baseName =
      sanitizeBaseName(
        path.basename(
          originalFileName,
          path.extname(
            originalFileName,
          ),
        ),
      ) || "document";

    const uniquePart =
      crypto.randomUUID();

    const storedFileName =
      `${Date.now()}-${uniquePart}-${baseName}${originalExtension}`;

    const absoluteStoragePath =
      path.join(
        storageDirectory,
        storedFileName,
      );

    const relativeStoragePath =
      path
        .relative(
          process.cwd(),
          absoluteStoragePath,
        )
        .replaceAll("\\", "/");

    const bytes =
      await file.arrayBuffer();

    await fs.writeFile(
      absoluteStoragePath,
      Buffer.from(bytes),
    );

    writtenFilePath =
      absoluteStoragePath;

    const document =
      await db.financeDocument.create({
        data: {
          type,
          title,
          description,

          originalFileName,
          storedFileName,
          storagePath:
            relativeStoragePath,

          mimeType:
            file.type,

          fileSize:
            file.size,

          documentDate,
          referenceNumber,
          notes,

          expenseId,
          supplierPayableId,
          supplierPayablePaymentId,
          refundId,
          bankTransactionId,
          bookingId,
          tourId,
          departureDateId,
          supplierId,

          uploadedById:
            session.user.id,
        },
      });

    return NextResponse.json(
      {
        success: true,

        document: {
          id: document.id,
          type: document.type,
          title: document.title,
          originalFileName:
            document.originalFileName,
          mimeType:
            document.mimeType,
          fileSize:
            document.fileSize,
          documentDate:
            document.documentDate,
          referenceNumber:
            document.referenceNumber,
          createdAt:
            document.createdAt,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (writtenFilePath) {
      try {
        await fs.unlink(
          writtenFilePath,
        );
      } catch {
        // Ignore cleanup failure.
      }
    }

    console.error(
      "FINANCE_DOCUMENT_UPLOAD_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload finance document.",
      },
      {
        status: 500,
      },
    );
  }
}