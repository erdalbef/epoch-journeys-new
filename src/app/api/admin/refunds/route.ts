import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import {
  FinanceDocumentType,
  PaymentMethod,
  RefundReason,
  RefundStatus,
  Role,
} from "@prisma/client";

import { del, put } from "@vercel/blob";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

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

function isValidPaymentMethod(
  value: string,
): value is PaymentMethod {
  return Object.values(
    PaymentMethod,
  ).includes(
    value as PaymentMethod,
  );
}

function isValidRefundReason(
  value: string,
): value is RefundReason {
  return Object.values(
    RefundReason,
  ).includes(
    value as RefundReason,
  );
}

function isValidRefundStatus(
  value: string,
): value is RefundStatus {
  return Object.values(
    RefundStatus,
  ).includes(
    value as RefundStatus,
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
        Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // ======================================================
    // FORM DATA
    // ======================================================

    const formData =
      await request.formData();

    const bookingId =
      stringValue(
        formData.get(
          "bookingId",
        ),
      );

    const paymentId =
      stringValue(
        formData.get(
          "paymentId",
        ),
      );

    const bankAccountId =
      stringValue(
        formData.get(
          "bankAccountId",
        ),
      );

    const amountRaw =
      stringValue(
        formData.get(
          "amount",
        ),
      );

    const currency =
      stringValue(
        formData.get(
          "currency",
        ),
      )?.toUpperCase() ||
      "EUR";

    const statusRaw =
      stringValue(
        formData.get(
          "status",
        ),
      );

    const methodRaw =
      stringValue(
        formData.get(
          "method",
        ),
      );

    const reasonRaw =
      stringValue(
        formData.get(
          "reason",
        ),
      );

    const reasonDetails =
      stringValue(
        formData.get(
          "reasonDetails",
        ),
      );

    const refundDateRaw =
      stringValue(
        formData.get(
          "refundDate",
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

    const refundProof =
      formData.get(
        "refundProof",
      );

    // ======================================================
    // BASIC VALIDATION
    // ======================================================

    if (!bookingId) {
      return NextResponse.json(
        {
          error:
            "Booking is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!amountRaw) {
      return NextResponse.json(
        {
          error:
            "Refund amount is required.",
        },
        {
          status: 400,
        },
      );
    }

    const amount =
      Number(amountRaw);

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Refund amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    const status =
      statusRaw &&
      isValidRefundStatus(
        statusRaw,
      )
        ? statusRaw
        : RefundStatus.PENDING;

    const reason =
      reasonRaw &&
      isValidRefundReason(
        reasonRaw,
      )
        ? reasonRaw
        : RefundReason.OTHER;

    const method =
      methodRaw &&
      isValidPaymentMethod(
        methodRaw,
      )
        ? methodRaw
        : null;

    // ======================================================
    // PAID REFUND REQUIREMENTS
    // ======================================================

    if (
      status ===
        RefundStatus.PAID &&
      !bankAccountId
    ) {
      return NextResponse.json(
        {
          error:
            "Bank or cash account is required when the refund is paid.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      status ===
        RefundStatus.PAID &&
      !method
    ) {
      return NextResponse.json(
        {
          error:
            "Payment method is required when the refund is paid.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // REFUND DATE
    // ======================================================

    let refundDate:
      | Date
      | null = null;

    if (refundDateRaw) {
      refundDate =
        new Date(
          `${refundDateRaw}T12:00:00.000Z`,
        );

      if (
        Number.isNaN(
          refundDate.getTime(),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid refund date.",
          },
          {
            status: 400,
          },
        );
      }
    }

    // ======================================================
    // BOOKING
    // ======================================================

    const booking =
      await db.booking.findUnique(
        {
          where: {
            id: bookingId,
          },

          select: {
            id: true,

            bookingReference:
              true,

            bookingDisplayCode:
              true,

            currency: true,
            amountPaid: true,

            tourId: true,

            departureDateId:
              true,

            tourTitleSnapshot:
              true,
          },
        },
      );

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      booking.currency !==
      currency
    ) {
      return NextResponse.json(
        {
          error:
            "Refund currency must match the booking currency in this version.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // BANK ACCOUNT
    //
    // Only PAID refunds require an account because only
    // PAID refunds create actual cash movement.
    // ======================================================

    if (
      status ===
        RefundStatus.PAID &&
      bankAccountId
    ) {
      const bankAccount =
        await db.bankAccount.findUnique(
          {
            where: {
              id:
                bankAccountId,
            },

            select: {
              id: true,
              currency: true,
              isActive: true,
            },
          },
        );

      if (
        !bankAccount ||
        !bankAccount.isActive
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
        bankAccount.currency !==
        currency
      ) {
        return NextResponse.json(
          {
            error:
              "Bank account currency must match the refund currency.",
          },
          {
            status: 400,
          },
        );
      }
    }

    // ======================================================
    // ORIGINAL PAYMENT
    // ======================================================

    if (paymentId) {
      const originalPayment =
        await db.payment.findFirst(
          {
            where: {
              id: paymentId,
              bookingId,
            },

            select: {
              id: true,
              currency: true,
            },
          },
        );

      if (
        !originalPayment
      ) {
        return NextResponse.json(
          {
            error:
              "Selected payment does not belong to this booking.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        originalPayment.currency !==
        currency
      ) {
        return NextResponse.json(
          {
            error:
              "Original payment currency does not match the refund currency.",
          },
          {
            status: 400,
          },
        );
      }
    }

    // ======================================================
    // REFUNDABLE BALANCE
    //
    // APPROVED and PAID refunds reserve the refundable
    // balance.
    //
    // PENDING does not reserve money yet.
    // ======================================================

    const existingRefunds =
      await db.refund.aggregate(
        {
          where: {
            bookingId,

            status: {
              in: [
                RefundStatus.APPROVED,
                RefundStatus.PAID,
              ],
            },
          },

          _sum: {
            amount: true,
          },
        },
      );

    const alreadyReserved =
      Number(
        existingRefunds
          ._sum.amount ?? 0,
      );

    const refundableAmount =
      Math.max(
        0,
        booking.amountPaid -
          alreadyReserved,
      );

    /*
     * PENDING refunds do not reserve the refundable
     * balance yet.
     *
     * APPROVED and PAID refunds must fit inside the
     * currently available refundable amount.
     */
    if (
      status !==
        RefundStatus.PENDING &&
      amount >
        refundableAmount
    ) {
      return NextResponse.json(
        {
          error:
            `Refund exceeds the refundable amount. Maximum available is ${currency} ${refundableAmount.toFixed(
              2,
            )}.`,
        },
        {
          status: 400,
        },
      );
    }

    /*
     * A pending request should still never exceed the
     * gross customer money received.
     */
    if (
      status ===
        RefundStatus.PENDING &&
      amount >
        booking.amountPaid
    ) {
      return NextResponse.json(
        {
          error:
            `Pending refund cannot exceed customer payments received. Maximum is ${currency} ${booking.amountPaid.toFixed(
              2,
            )}.`,
        },
        {
          status: 400,
        },
      );
    }

    const effectiveRefundDate =
      status ===
      RefundStatus.PAID
        ? refundDate ??
          new Date()
        : refundDate;

    // ======================================================
    // REFUND PROOF VALIDATION
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
      refundProof &&
      typeof refundProof !==
        "string" &&
      refundProof.size > 0
    ) {
      if (
        !ALLOWED_FILE_TYPES.has(
          refundProof.type,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only PDF, JPG, PNG and WEBP refund documents are allowed.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        refundProof.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "Refund proof must be smaller than 10 MB.",
          },
          {
            status: 400,
          },
        );
      }

      originalFileName =
        refundProof.name ||
        "refund-proof";

      const safeFileName =
        sanitizeFileName(
          originalFileName,
        ) ||
        "refund-proof";

      blob = await put(
        `finance/refunds/${Date.now()}-${safeFileName}`,
        refundProof,
        {
          access:
            "private",

          addRandomSuffix:
            true,

          contentType:
            refundProof.type ||
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

    // ======================================================
    // DATABASE TRANSACTION
    // ======================================================

    const result =
      await db.$transaction(
        async (tx) => {
          // ------------------------------------------------
          // REFUND
          // ------------------------------------------------

          const refund =
            await tx.refund.create(
              {
                data: {
                  bookingId,

                  paymentId,

                  /*
                   * Only a paid refund needs to be attached
                   * to the account from which money left.
                   */
                  bankAccountId:
                    status ===
                      RefundStatus.PAID
                      ? bankAccountId
                      : null,

                  createdById:
                    session.user.id,

                  amount,

                  currency,

                  status,

                  method:
                    status ===
                      RefundStatus.PAID
                      ? method
                      : null,

                  reason,

                  reasonDetails,

                  refundDate:
                    effectiveRefundDate,

                  reference,

                  notes,
                },
              },
            );

          // ------------------------------------------------
          // BANK LEDGER
          // ------------------------------------------------

          let ledgerTransaction:
            | {
                id: string;
              }
            | null = null;

          if (
            status ===
              RefundStatus.PAID &&
            bankAccountId
          ) {
            ledgerTransaction =
              await tx.bankTransaction.create(
                {
                  data: {
                    bankAccountId,

                    createdById:
                      session.user.id,

                    type:
                      "REFUND",

                    direction:
                      "OUT",

                    status:
                      "POSTED",

                    amount,

                    currency,

                    transactionDate:
                      effectiveRefundDate ??
                      new Date(),

                    reference,

                    description:
                      `Customer refund — ${
                        booking.bookingDisplayCode ||
                        booking.bookingReference
                      } — ${
                        booking.tourTitleSnapshot
                      }`,

                    notes:
                      reasonDetails ||
                      notes,

                    refundId:
                      refund.id,

                    bookingId:
                      booking.id,

                    paymentId,

                    tourId:
                      booking.tourId,

                    departureDateId:
                      booking.departureDateId,
                  },
                },
              );
          }

          // ------------------------------------------------
          // FINANCE DOCUMENT
          // ------------------------------------------------

          let financeDocument:
            | {
                id: string;
              }
            | null = null;

          if (
            blob &&
            originalFileName &&
            storedFileName &&
            refundProof &&
            typeof refundProof !==
              "string"
          ) {
            financeDocument =
              await tx.financeDocument.create(
                {
                  data: {
                    type:
                      FinanceDocumentType.CUSTOMER_REFUND_PROOF,

                    title:
                      reference
                        ? `Refund Proof – ${reference}`
                        : `Refund Proof – ${
                            booking.bookingDisplayCode ||
                            booking.bookingReference
                          }`,

                    description:
                      reasonDetails ||
                      notes ||
                      `Refund supporting document for ${
                        booking.bookingDisplayCode ||
                        booking.bookingReference
                      }`,

                    originalFileName,

                    storedFileName,

                    storagePath:
                      blob.pathname,

                    mimeType:
                      refundProof.type ||
                      "application/octet-stream",

                    fileSize:
                      refundProof.size,

                    documentDate:
                      effectiveRefundDate ??
                      new Date(),

                    referenceNumber:
                      reference,

                    refundId:
                      refund.id,

                    bankTransactionId:
                      ledgerTransaction?.id ??
                      null,

                    bookingId:
                      booking.id,

                    tourId:
                      booking.tourId,

                    departureDateId:
                      booking.departureDateId,

                    uploadedById:
                      session.user.id,
                  },
                },
              );
          }

          return {
            refund,
            ledgerTransaction,
            financeDocument,
          };
        },
      );

    // ======================================================
    // REVALIDATION
    // ======================================================

    revalidatePath(
      `/admin/bookings/${bookingId}`,
    );

    revalidatePath(
      "/admin/bookings",
    );

    revalidatePath(
      "/admin/finance",
    );

    revalidatePath(
      "/admin/finance/refunds",
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

    // ======================================================
    // RESPONSE
    // ======================================================

    return NextResponse.json(
      {
        success: true,

        refund:
          result.refund,

        ledgerTransaction:
          result.ledgerTransaction,

        financeDocument:
          result.financeDocument,

        refundableAmountBeforeRefund:
          refundableAmount,

        refundableAmountAfterRefund:
          status ===
          RefundStatus.PENDING
            ? refundableAmount
            : Math.max(
                0,
                refundableAmount -
                  amount,
              ),
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
          "REFUND_PROOF_BLOB_CLEANUP_ERROR",
          cleanupError,
        );
      }
    }

    console.error(
      "CREATE_REFUND_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create refund.",
      },
      {
        status: 500,
      },
    );
  }
}