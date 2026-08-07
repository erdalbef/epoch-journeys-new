import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  PaymentMethod,
  PaymentRecordStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { recalculateBookingPayment } from "@/lib/payments/recalculateBookingPayment";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isValidPaymentMethod(
  value: string,
): value is PaymentMethod {
  return Object.values(
    PaymentMethod,
  ).includes(value as PaymentMethod);
}

function isValidPaymentRecordStatus(
  value: string,
): value is PaymentRecordStatus {
  return Object.values(
    PaymentRecordStatus,
  ).includes(
    value as PaymentRecordStatus,
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
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

    const { id: bookingId } =
      await context.params;

    const booking =
      await db.booking.findUnique({
        where: {
          id: bookingId,
        },
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,

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

    const body =
      (await request.json()) as {
        amount?: number;
        currency?: string;
        method?: string;
        status?: string;

        bankAccountId?: string | null;

        reference?: string;
        notes?: string;
        paidAt?: string | null;
      };

    const amount =
      typeof body.amount === "number"
        ? body.amount
        : Number(body.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be greater than 0.",
        },
        {
          status: 400,
        },
      );
    }

    const currency =
      typeof body.currency ===
        "string" &&
      body.currency.trim()
        ? body.currency
            .trim()
            .toUpperCase()
        : "EUR";

    if (
      !body.method ||
      !isValidPaymentMethod(
        body.method,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment method.",
        },
        {
          status: 400,
        },
      );
    }

    const paymentStatus =
      body.status &&
      isValidPaymentRecordStatus(
        body.status,
      )
        ? body.status
        : PaymentRecordStatus.RECEIVED;

    const paidAt =
      typeof body.paidAt ===
        "string" &&
      body.paidAt.trim()
        ? new Date(body.paidAt)
        : null;

    if (
      paidAt &&
      Number.isNaN(
        paidAt.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid paid date.",
        },
        {
          status: 400,
        },
      );
    }

    const reference =
      typeof body.reference ===
        "string" &&
      body.reference.trim()
        ? body.reference.trim()
        : null;

    const notes =
      typeof body.notes ===
        "string" &&
      body.notes.trim()
        ? body.notes.trim()
        : null;

    /*
     * A bank/cash account is required
     * only when money has actually
     * been received.
     *
     * PENDING or FAILED payment records
     * do not create cash movement.
     */
    let bankAccountId:
      | string
      | null = null;

    if (
      paymentStatus ===
      PaymentRecordStatus.RECEIVED
    ) {
      if (
        !body.bankAccountId
      ) {
        return NextResponse.json(
          {
            error:
              "Select the bank or cash account where this payment was received.",
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
                body.bankAccountId,
            },
            select: {
              id: true,
              name: true,
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
              "Bank account currency must match the payment currency in this version.",
          },
          {
            status: 400,
          },
        );
      }

      bankAccountId =
        bankAccount.id;
    }

    /*
     * Payment record and bank ledger
     * transaction are created together.
     *
     * If either fails, neither is saved.
     */
    const result =
      await db.$transaction(
        async (tx) => {
          const payment =
            await tx.payment.create({
              data: {
                bookingId,

                amount,
                currency,

                method:
                  body.method as PaymentMethod,

                status:
                  paymentStatus,

                reference,
                notes,

                paidAt:
                  paidAt ??
                  (paymentStatus ===
                  PaymentRecordStatus.RECEIVED
                    ? new Date()
                    : null),

                receivedBy:
                  session.user.name ||
                  session.user.email ||
                  "Admin",
              },
            });

          let ledgerTransaction =
            null;

          /*
           * Only RECEIVED money
           * becomes a CUSTOMER_RECEIPT.
           */
          if (
            paymentStatus ===
              PaymentRecordStatus.RECEIVED &&
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
                      "CUSTOMER_RECEIPT",

                    direction:
                      "IN",

                    status:
                      "POSTED",

                    amount,

                    currency,

                    transactionDate:
                      paidAt ??
                      new Date(),

                    reference,

                    description:
                      `Customer payment — ${
                        booking.bookingDisplayCode ||
                        booking.bookingReference
                      } — ${
                        booking.tourTitleSnapshot
                      }`,

                    notes,

                    bookingId:
                      booking.id,

                    paymentId:
                      payment.id,

                    tourId:
                      booking.tourId,

                    departureDateId:
                      booking.departureDateId,
                  },
                },
              );
          }

          return {
            payment,
            ledgerTransaction,
          };
        },
      );

    /*
     * Keep the existing booking-payment
     * summary logic.
     */
    const summary =
      await recalculateBookingPayment(
        bookingId,
      );

    return NextResponse.json(
      {
        success: true,

        payment:
          result.payment,

        ledgerTransaction:
          result.ledgerTransaction,

        bookingSummary:
          summary,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/admin/bookings/[id]/payments error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create payment.",
      },
      {
        status: 500,
      },
    );
  }
}