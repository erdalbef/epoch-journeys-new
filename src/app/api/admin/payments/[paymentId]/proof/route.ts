import fs from "fs/promises";
import path from "path";

import { del, get, put } from "@vercel/blob";
import {
  AccountingCategory,
  FinanceDocumentType,
  Role,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    paymentId: string;
  }>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

function safeFileName(value: string) {
  const extension = path.extname(value).toLowerCase();
  const base = path.basename(value, extension);

  const safeBase =
    base
      .normalize("NFKD")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 120) || "customer-payment-proof";

  return `${safeBase}${extension}`;
}

function safeResponseFileName(value: string) {
  return value.replace(/[\r\n"]/g, "").trim() || "payment-proof";
}

function getDueDate(year: number, month: number) {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return new Date(
    Date.UTC(nextYear, nextMonth - 1, 5, 12, 0, 0),
  );
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function resolveLocalAccountingPath(storagePath: string) {
  if (!storagePath.startsWith("/uploads/accounting/")) {
    return null;
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const absolutePath = path.resolve(
    publicRoot,
    storagePath.replace(/^\/+/, ""),
  );
  const accountingRoot = path.resolve(
    process.cwd(),
    "public",
    "uploads",
    "accounting",
  );
  const relativeToRoot = path.relative(accountingRoot, absolutePath);

  if (
    relativeToRoot.startsWith("..") ||
    path.isAbsolute(relativeToRoot)
  ) {
    return null;
  }

  return absolutePath;
}

async function deleteStoredProof(storagePath: string) {
  if (isHttpUrl(storagePath)) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(storagePath).catch(() => undefined);
    }
    return;
  }

  const localPath = resolveLocalAccountingPath(storagePath);

  if (localPath) {
    await fs.unlink(localPath).catch(() => undefined);
  }
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { paymentId } = await context.params;

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        financeDocument: {
          select: {
            id: true,
            originalFileName: true,
            storagePath: true,
            mimeType: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Customer payment not found." },
        { status: 404 },
      );
    }

    const document = payment.financeDocument;

    if (!document) {
      return NextResponse.json(
        { error: "No payment proof is attached." },
        { status: 404 },
      );
    }

    const downloadName = safeResponseFileName(
      document.originalFileName,
    );
    const encodedName = encodeURIComponent(downloadName);

    if (isHttpUrl(document.storagePath)) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          {
            error:
              "Private Blob access is not configured for this deployment.",
          },
          { status: 500 },
        );
      }

      const blobResult = await get(document.storagePath, {
        access: "private",
      });

      if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
        return NextResponse.json(
          { error: "Payment proof file could not be found." },
          { status: 404 },
        );
      }

      return new Response(blobResult.stream, {
        status: 200,
        headers: {
          "Content-Type":
            blobResult.blob.contentType ||
            document.mimeType ||
            "application/octet-stream",
          "Content-Disposition":
            `inline; filename="${downloadName}"; filename*=UTF-8''${encodedName}`,
          "Cache-Control": "private, no-store, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const localPath = resolveLocalAccountingPath(document.storagePath);

    if (!localPath) {
      return NextResponse.json(
        { error: "Unsupported payment proof storage path." },
        { status: 400 },
      );
    }

    const bytes = await fs.readFile(localPath);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type":
          document.mimeType || "application/octet-stream",
        "Content-Disposition":
          `inline; filename="${downloadName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("CUSTOMER_PAYMENT_PROOF_VIEW_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to open customer payment proof.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let localFilePath: string | null = null;
  let uploadedBlobPath: string | null = null;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { paymentId } = await context.params;

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        currency: true,
        reference: true,
        paidAt: true,
        createdAt: true,
        bookingId: true,
        tourId: true,
        agencyGroupName: true,
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
            departureDateId: true,
            tourId: true,
          },
        },
        bankTransactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            bankAccountId: true,
          },
        },
        financeDocument: {
          select: {
            id: true,
            storagePath: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Customer payment not found." },
        { status: 404 },
      );
    }

    const form = await request.formData();
    const uploaded = form.get("file");

    if (!(uploaded instanceof File) || uploaded.size <= 0) {
      return NextResponse.json(
        { error: "Select a payment proof file." },
        { status: 400 },
      );
    }

    if (uploaded.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Payment proof must be smaller than 10 MB." },
        { status: 400 },
      );
    }

    const extension = path.extname(uploaded.name).toLowerCase();

    if (
      !ALLOWED_EXTENSIONS.has(extension) ||
      (uploaded.type && !ALLOWED_MIME_TYPES.has(uploaded.type))
    ) {
      return NextResponse.json(
        {
          error:
            "Only PDF, JPG, PNG and WEBP payment proof files are allowed.",
        },
        { status: 400 },
      );
    }

    const paymentDate = payment.paidAt ?? payment.createdAt;
    const year = paymentDate.getUTCFullYear();
    const month = paymentDate.getUTCMonth() + 1;
    const monthFolder = String(month).padStart(2, "0");

    const originalFileName = safeFileName(uploaded.name);
    const storedFileName =
      `customer-payment-${payment.id}-${originalFileName}`;
    const bytes = Buffer.from(await uploaded.arrayBuffer());

    let storagePath: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blobPath =
        `accounting/${year}/${monthFolder}/02-sales-income/${storedFileName}`;

      const blob = await put(blobPath, bytes, {
        access: "private",
        contentType: uploaded.type || undefined,
        addRandomSuffix: false,
      });

      storagePath = blob.url;
      uploadedBlobPath = blob.url;
    } else {
      const relativePath =
        `/uploads/accounting/${year}/${monthFolder}/02-sales-income/${storedFileName}`;

      const directory = path.join(
        process.cwd(),
        "public",
        "uploads",
        "accounting",
        String(year),
        monthFolder,
        "02-sales-income",
      );

      localFilePath = path.join(directory, storedFileName);

      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(localFilePath, bytes);

      storagePath = relativePath;
    }

    const bankTransaction = payment.bankTransactions[0] ?? null;
    const previousStoragePath = payment.financeDocument?.storagePath ?? null;

    const financeDocument = await db.$transaction(async (tx) => {
      const period = await tx.accountingPeriod.upsert({
        where: {
          year_month: {
            year,
            month,
          },
        },
        update: {},
        create: {
          year,
          month,
          dueDate: getDueDate(year, month),
        },
        select: {
          id: true,
        },
      });

      const documentData = {
        type: FinanceDocumentType.CUSTOMER_PAYMENT_PROOF,
        title:
          `Customer Payment Proof - ${
            payment.agencyGroupName ||
            payment.booking?.bookingDisplayCode ||
            payment.booking?.bookingReference ||
            payment.id
          }`,
        description:
          "Uploaded proof for a received customer payment.",
        originalFileName: uploaded.name,
        storedFileName,
        storagePath,
        mimeType: uploaded.type || "application/octet-stream",
        fileSize: uploaded.size,
        documentDate: paymentDate,
        referenceNumber: payment.reference || payment.id,
        paymentId: payment.id,
        bankTransactionId: bankTransaction?.id ?? null,
        bookingId: payment.bookingId ?? null,
        tourId: payment.tourId ?? payment.booking?.tourId ?? null,
        departureDateId: payment.booking?.departureDateId ?? null,
        bankAccountId: bankTransaction?.bankAccountId ?? null,
        uploadedById: session.user.id,
        accountingCategory: AccountingCategory.SALES_INCOME,
        accountingPeriodId: period.id,
        accountingSubcategory: "Customer Payment Proof",
      };

      return payment.financeDocument
        ? tx.financeDocument.update({
            where: { id: payment.financeDocument.id },
            data: documentData,
            select: {
              id: true,
              title: true,
              storagePath: true,
            },
          })
        : tx.financeDocument.create({
            data: documentData,
            select: {
              id: true,
              title: true,
              storagePath: true,
            },
          });
    });

    localFilePath = null;
    uploadedBlobPath = null;

    if (previousStoragePath && previousStoragePath !== storagePath) {
      await deleteStoredProof(previousStoragePath);
    }

    return NextResponse.json({
      success: true,
      financeDocument,
    });
  } catch (error) {
    if (localFilePath) {
      await fs.unlink(localFilePath).catch(() => undefined);
    }

    if (uploadedBlobPath && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(uploadedBlobPath).catch(() => undefined);
    }

    console.error("Customer payment proof upload failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload customer payment proof.",
      },
      { status: 500 },
    );
  }
}
