import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  FinanceDocumentType,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

import { del, put } from "@vercel/blob";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

function stringValue(
  value: FormDataEntryValue | null,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function isMethod(
  value: string,
): value is PaymentMethod {
  return Object.values(
    PaymentMethod,
  ).includes(
    value as PaymentMethod,
  );
}

function sanitizeFileName(
  fileName: string,
) {
  return fileName
    .normalize("NFKD")
    .replace(/\s+/g, "-")
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "",
    )
    .replace(/-+/g, "-")
    .slice(0, 150);
}

export async function POST(
  request: Request,
  { params }: Context,
) {
  let uploadedBlobUrl:
    | string
    | null = null;

  try {
    // ======================================================
    // AUTHORIZATION
    // ======================================================

    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !==
        "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } =
      await params;

    // ======================================================
    // FORM DATA
    // ======================================================

    const formData =
      await request.formData();

    const amountRaw =
      stringValue(
        formData.get(
          "amount",
        ),
      );

    const bankAccountId =
      stringValue(
        formData.get(
          "bankAccountId",
        ),
      );

    const methodRaw =
      stringValue(
        formData.get(
          "method",
        ),
      );

    const reference =
      stringValue(
        formData.get(
          "reference",
        ),
      );

    const notes =
      stringValue(
        formData.get(
          "notes",
        ),
      );

    const paymentProof =
      formData.get(
        "paymentProof",
      );

    // ======================================================
    // PAYABLE
    // ======================================================

    const payable =
      await db.supplierPayable.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          title: true,

          supplierId: true,
          supplierNameSnapshot:
            true,

          approvalStatus: true,
          paymentStatus: true,

          currency: true,

          amountPaid: true,
          balance: true,
          approvedAmount: true,
          creditAmount: true,

          bookingId: true,
          tourId: true,
          departureDateId: true,

          supplierInvoiceNumber:
            true,
        },
      });

    if (!payable) {
      return NextResponse.json(
        {
          error:
            "Payable not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ======================================================
    // PAYABLE STATUS VALIDATION
    // ======================================================

    if (
      payable.approvalStatus !==
      "APPROVED"
    ) {
      return NextResponse.json(
        {
          error:
            "The payable must be approved before payment.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      [
        "PAID",
        "CANCELLED",
      ].includes(
        payable.paymentStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This payable is not open for payment.",
        },
        {
          status: 409,
        },
      );
    }

    // ======================================================
    // PAYMENT METHOD
    // ======================================================

    if (
      !methodRaw ||
      !isMethod(methodRaw)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid payment method is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // PAYMENT AMOUNT
    // ======================================================

    if (!amountRaw) {
      return NextResponse.json(
        {
          error:
            "Payment amount is required.",
        },
        {
          status: 400,
        },
      );
    }

    let amount:
      Prisma.Decimal;

    try {
      amount =
        new Prisma.Decimal(
          amountRaw,
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid payment amount.",
        },
        {
          status: 400,
        },
      );
    }

    if (amount.lte(0)) {
      return NextResponse.json(
        {
          error:
            "Payment amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      amount.gt(
        payable.balance,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Payment cannot exceed the outstanding balance.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // BANK ACCOUNT
    // ======================================================

    if (!bankAccountId) {
      return NextResponse.json(
        {
          error:
            "Select the bank or cash account used for this supplier payment.",
        },
        {
          status: 400,
        },
      );
    }

    const bank =
      await db.bankAccount.findUnique({
        where: {
          id:
            bankAccountId,
        },

        select: {
          id: true,
          name: true,
          currency: true,
          isActive: true,
        },
      });

    if (
      !bank ||
      !bank.isActive
    ) {
      return NextResponse.json(
        {
          error:
            "Selected bank account is not available.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      bank.currency !==
      payable.currency
    ) {
      return NextResponse.json(
        {
          error:
            "Bank account currency must match the payable currency in this version.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // PAYMENT PROOF VALIDATION
    // ======================================================

    let blob:
      | Awaited<
          ReturnType<
            typeof put
          >
        >
      | null = null;

    let originalFileName:
      | string
      | null = null;

    let storedFileName:
      | string
      | null = null;

    if (
      paymentProof &&
      typeof paymentProof !==
        "string" &&
      paymentProof.size > 0
    ) {
      if (
        !ALLOWED_FILE_TYPES.has(
          paymentProof.type,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only PDF, JPG, PNG and WEBP payment proofs are allowed.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        paymentProof.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "Payment proof must be smaller than 10 MB.",
          },
          {
            status: 400,
          },
        );
      }

      originalFileName =
        paymentProof.name ||
        "supplier-payment-proof";

      const safeFileName =
        sanitizeFileName(
          originalFileName,
        ) ||
        "supplier-payment-proof";

      // ====================================================
      // VERCEL PRIVATE BLOB
      // ====================================================

      blob = await put(
        `finance/suppliers/payments/${Date.now()}-${safeFileName}`,
        paymentProof,
        {
          access:
            "private",

          addRandomSuffix:
            true,

          contentType:
            paymentProof.type ||
            "application/octet-stream",
        },
      );

      uploadedBlobUrl =
        blob.url;

      storedFileName =
        blob.pathname
          .split("/")
          .pop() ||
        safeFileName;
    }

    const paymentDate =
      new Date();

    // ======================================================
    // PAYMENT TRANSACTION
    // ======================================================

    const result =
      await db.$transaction(
        async (tx) => {
          // --------------------------------------------------
          // SUPPLIER PAYMENT
          // --------------------------------------------------

          const payment =
            await tx.supplierPayablePayment.create({
              data: {
                payableId:
                  payable.id,

                bankAccountId:
                  bank.id,

                recordedById:
                  session.user.id,

                amount,

                currency:
                  payable.currency,

                paymentDate,

                method:
                  methodRaw,

                reference,

                notes,
              },
            });

          // --------------------------------------------------
          // BANK LEDGER
          // --------------------------------------------------

          const ledgerTransaction =
            await tx.bankTransaction.create({
              data: {
                bankAccountId:
                  bank.id,

                createdById:
                  session.user.id,

                type:
                  BankTransactionType.SUPPLIER_PAYMENT,

                direction:
                  BankTransactionDirection.OUT,

                status:
                  BankTransactionStatus.POSTED,

                amount,

                currency:
                  payable.currency,

                transactionDate:
                  paymentDate,

                reference,

                description:
                  `${payable.supplierNameSnapshot} — ${payable.title}`,

                notes,

                supplierPayablePaymentId:
                  payment.id,

                bookingId:
                  payable.bookingId,

                tourId:
                  payable.tourId,

                departureDateId:
                  payable.departureDateId,
              },
            });

          // --------------------------------------------------
          // PAYMENT PROOF DOCUMENT
          // --------------------------------------------------

          let financeDocument:
            | {
                id: string;
              }
            | null = null;

          if (
            blob &&
            originalFileName &&
            storedFileName &&
            paymentProof &&
            typeof paymentProof !==
              "string"
          ) {
            financeDocument =
              await tx.financeDocument.create({
                data: {
                  type:
                    FinanceDocumentType.SUPPLIER_PAYMENT_PROOF,

                  title:
                    reference
                      ? `Supplier Payment Proof – ${reference}`
                      : `Supplier Payment Proof – ${payable.title}`,

                  description:
                    notes ??
                    `Payment proof for ${payable.supplierNameSnapshot} — ${payable.title}`,

                  originalFileName,

                  storedFileName,

                  storagePath:
                    blob.pathname,

                  mimeType:
                    paymentProof.type ||
                    "application/octet-stream",

                  fileSize:
                    paymentProof.size,

                  documentDate:
                    paymentDate,

                  referenceNumber:
                    reference,

                  supplierPayableId:
                    payable.id,

                  supplierPayablePaymentId:
                    payment.id,

                  bankTransactionId:
                    ledgerTransaction.id,

                  supplierId:
                    payable.supplierId,

                  bookingId:
                    payable.bookingId,

                  tourId:
                    payable.tourId,

                  departureDateId:
                    payable.departureDateId,

                  uploadedById:
                    session.user.id,
                },
              });
          }

          // --------------------------------------------------
          // UPDATE PAYABLE BALANCE
          // --------------------------------------------------

          const nextAmountPaid =
            payable.amountPaid.plus(
              amount,
            );

          const nextBalance =
            Prisma.Decimal.max(
              new Prisma.Decimal(
                0,
              ),

              payable.approvedAmount
                .minus(
                  payable.creditAmount,
                )
                .minus(
                  nextAmountPaid,
                ),
            );

          const nextPaymentStatus =
            nextBalance.lte(0)
              ? "PAID"
              : nextAmountPaid.gt(
                    0,
                  )
                ? "PARTIALLY_PAID"
                : "UNPAID";

          const updated =
            await tx.supplierPayable.update({
              where: {
                id:
                  payable.id,
              },

              data: {
                amountPaid:
                  nextAmountPaid,

                balance:
                  nextBalance,

                paymentStatus:
                  nextPaymentStatus,
              },
            });

          return {
            payment,
            ledgerTransaction,
            financeDocument,
            updated,
          };
        },
      );

    // ======================================================
    // REVALIDATION
    // ======================================================

    revalidatePath(
      `/admin/supplier-payables/${id}`,
    );

    revalidatePath(
      "/admin/supplier-payables",
    );

    revalidatePath(
      "/admin/finance",
    );

    revalidatePath(
      "/admin/finance/bank-accounts",
    );

    revalidatePath(
      "/admin/finance/documents",
    );

    revalidatePath(
      "/admin/finance/profitability",
    );

    return NextResponse.json(
      {
        success: true,

        payment:
          result.payment,

        ledgerTransaction:
          result.ledgerTransaction,

        financeDocument:
          result.financeDocument,

        updated:
          result.updated,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    // ======================================================
    // CLEAN UP ORPHANED BLOB
    // ======================================================

    if (uploadedBlobUrl) {
      try {
        await del(
          uploadedBlobUrl,
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "SUPPLIER_PAYMENT_PROOF_BLOB_CLEANUP_ERROR",
          cleanupError,
        );
      }
    }

    console.error(
      "CREATE_SUPPLIER_PAYMENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record supplier payment.",
      },
      {
        status: 400,
      },
    );
  }
}