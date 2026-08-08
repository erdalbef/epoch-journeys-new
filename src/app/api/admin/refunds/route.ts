import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  PaymentMethod,
  RefundReason,
  RefundStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function isValidPaymentMethod(
  value: string,
): value is PaymentMethod {
  return Object.values(
    PaymentMethod,
  ).includes(value as PaymentMethod);
}

function isValidRefundReason(
  value: string,
): value is RefundReason {
  return Object.values(
    RefundReason,
  ).includes(value as RefundReason);
}

function isValidRefundStatus(
  value: string,
): value is RefundStatus {
  return Object.values(
    RefundStatus,
  ).includes(value as RefundStatus);
}

export async function POST(
  request: Request,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

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

    const body =
      (await request.json()) as {
        bookingId?: string;
        paymentId?: string | null;

        bankAccountId?: string;

        amount?: number;
        currency?: string;

        status?: string;

        method?: string | null;

        reason?: string;
        reasonDetails?: string | null;

        refundDate?: string | null;

        reference?: string | null;
        notes?: string | null;
      };

    const bookingId =
      body.bookingId?.trim();

    const paymentId =
      body.paymentId?.trim() ||
      null;

    const bankAccountId =
      body.bankAccountId?.trim();

    const amount =
      Number(body.amount);

    const currency =
      body.currency
        ?.trim()
        .toUpperCase() ||
      "EUR";

    const status =
      body.status &&
      isValidRefundStatus(
        body.status,
      )
        ? body.status
        : RefundStatus.PENDING;

    const reason =
      body.reason &&
      isValidRefundReason(
        body.reason,
      )
        ? body.reason
        : RefundReason.OTHER;

    const method =
      body.method &&
      isValidPaymentMethod(
        body.method,
      )
        ? body.method
        : null;

    const reasonDetails =
      body.reasonDetails
        ?.trim() ||
      null;

    const reference =
      body.reference
        ?.trim() ||
      null;

    const notes =
      body.notes?.trim() ||
      null;

    const refundDate =
      body.refundDate
        ? new Date(
            body.refundDate,
          )
        : null;

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

    if (!bankAccountId) {
      return NextResponse.json(
        {
          error:
            "Bank or cash account is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(amount) ||
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

    if (
      refundDate &&
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

    const booking =
      await db.booking.findUnique({
        where: {
          id: bookingId,
        },

        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
          currency: true,

          amountPaid: true,

          tourId: true,
          departureDateId: true,

          tourTitleSnapshot: true,
        },
      });

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

    let originalPayment:
      | {
          id: string;
          amount: number;
          currency: string;
          status: string;
        }
      | null = null;

    if (paymentId) {
      originalPayment =
        await db.payment.findFirst(
          {
            where: {
              id: paymentId,
              bookingId,
            },

            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
            },
          },
        );

      if (!originalPayment) {
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

    const existingRefunds =
      await db.refund.aggregate({
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
      });

    const alreadyRefunded =
      Number(
        existingRefunds._sum
          .amount ?? 0,
      );

    const refundableAmount =
      Math.max(
        0,
        booking.amountPaid -
          alreadyRefunded,
      );

    if (
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

    const effectiveRefundDate =
      status ===
      RefundStatus.PAID
        ? refundDate ??
          new Date()
        : refundDate;

    const result =
      await db.$transaction(
        async (tx) => {
          const refund =
            await tx.refund.create({
              data: {
                bookingId,

                paymentId,

                bankAccountId,

                createdById:
                  session.user.id,

                amount,

                currency,

                status,

                method,

                reason,

                reasonDetails,

                refundDate:
                  effectiveRefundDate,

                reference,

                notes,
              },
            });

          let ledgerTransaction =
            null;

          if (
            status ===
            RefundStatus.PAID
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

                    paymentId:
                      paymentId,

                    tourId:
                      booking.tourId,

                    departureDateId:
                      booking.departureDateId,
                  },
                },
              );
          }

          return {
            refund,
            ledgerTransaction,
          };
        },
      );

    return NextResponse.json(
      {
        success: true,

        refund:
          result.refund,

        ledgerTransaction:
          result.ledgerTransaction,

        refundableAmountBeforeRefund:
          refundableAmount,

        refundableAmountAfterRefund:
          Math.max(
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