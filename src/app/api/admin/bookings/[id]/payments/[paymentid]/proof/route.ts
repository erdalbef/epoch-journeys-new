import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import {
  AccountingCategory,
  FinanceDocumentType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
    paymentid: string;
  }>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function safeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .trim();
}

function accountingDueDate(year: number, month: number) {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(Date.UTC(nextYear, nextMonth - 1, 15, 12, 0, 0));
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, paymentid: paymentId } = await context.params;

    const payment = await db.payment.findFirst({
      where: {
        id: paymentId,
        bookingId,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        reference: true,
        notes: true,
        paidAt: true,
        createdAt: true,
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
            tourId: true,
            departureDateId: true,
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

    const formData = await request.formData();
    const value = formData.get("file");

    if (!(value instanceof File) || value.size <= 0) {
      return NextResponse.json(
        { error: "Select a payment proof file." },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(value.type)) {
      return NextResponse.json(
        { error: "Payment proof must be PDF, JPG, PNG or WEBP." },
        { status: 400 },
      );
    }

    if (value.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Payment proof must be smaller than 10 MB." },
        { status: 400 },
      );
    }

    const paymentDate = payment.paidAt ?? payment.createdAt;
    const year = paymentDate.getUTCFullYear();
    const month = paymentDate.getUTCMonth() + 1;
    const monthFolder = String(month).padStart(2, "0");
    const bookingRef =
      payment.booking?.bookingDisplayCode ||
      payment.booking?.bookingReference ||
      `payment-${payment.id}`;
    const originalFileName = value.name || "customer-payment-proof";
    const storedFileName = `${safeFileName(bookingRef) || "booking"}-payment-${payment.id}-${Date.now()}-${safeFileName(originalFileName) || "proof"}`;
    const blobPath = `accounting/${year}/${monthFolder}/02-sales-income/${storedFileName}`;

    const blob = await put(blobPath, value, {
      access: "public",
      addRandomSuffix: false,
      contentType: value.type || "application/octet-stream",
    });

    const period = await db.accountingPeriod.upsert({
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
        dueDate: accountingDueDate(year, month),
      },
      select: {
        id: true,
      },
    });

    const bankTransaction = payment.bankTransactions[0] ?? null;

    const documentData = {
      type: FinanceDocumentType.CUSTOMER_PAYMENT_PROOF,
      title: `Customer Payment Proof - ${bookingRef}`,
      description:
        payment.notes ||
        `Uploaded proof for received customer payment ${payment.id}.`,
      originalFileName,
      storedFileName,
      storagePath: blob.url,
      mimeType: value.type || "application/octet-stream",
      fileSize: value.size,
      documentDate: paymentDate,
      referenceNumber: payment.reference || payment.id,
      notes: "Customer-provided or bank-issued payment proof.",
      paymentId: payment.id,
      bankTransactionId: bankTransaction?.id ?? null,
      bookingId: payment.booking?.id ?? null,
      tourId: payment.booking?.tourId ?? null,
      departureDateId: payment.booking?.departureDateId ?? null,
      bankAccountId: bankTransaction?.bankAccountId ?? null,
      uploadedById: session.user.id,
      accountingCategory: AccountingCategory.SALES_INCOME,
      accountingPeriodId: period.id,
      accountingSubcategory: "Customer Payment Proof",
    };

    const document = payment.financeDocument
      ? await db.financeDocument.update({
          where: { id: payment.financeDocument.id },
          data: documentData,
          select: {
            id: true,
            storagePath: true,
            originalFileName: true,
          },
        })
      : await db.financeDocument.create({
          data: documentData,
          select: {
            id: true,
            storagePath: true,
            originalFileName: true,
          },
        });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("CUSTOMER_PAYMENT_PROOF_UPLOAD_ERROR", error);

    return NextResponse.json(
      { error: "Payment proof could not be uploaded." },
      { status: 500 },
    );
  }
}
