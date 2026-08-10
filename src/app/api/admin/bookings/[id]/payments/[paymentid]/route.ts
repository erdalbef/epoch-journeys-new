import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { recalculateBookingPayment } from "@/lib/payments/recalculateBookingPayment";

type RouteContext = {
  params: Promise<{
    id: string;
    paymentid: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

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

    const {
      id: bookingId,
      paymentid: paymentId,
    } = await context.params;

    if (!bookingId || !paymentId) {
      return NextResponse.json(
        {
          error:
            "Booking ID or payment ID is missing.",
        },
        {
          status: 400,
        },
      );
    }

    const payment =
      await db.payment.findFirst({
        where: {
          id: paymentId,
          bookingId,
        },

        select: {
          id: true,
          amount: true,
          currency: true,
          reference: true,

          refunds: {
            select: {
              id: true,
            },
          },

          salesDocuments: {
            select: {
              id: true,
              documentNumber: true,
            },
          },

          bankTransactions: {
            select: {
              id: true,
              reconciliationId: true,
              reversalOfId: true,

              reversedBy: {
                select: {
                  id: true,
                },
              },

              statementLine: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Payment not found for this booking.",
        },
        {
          status: 404,
        },
      );
    }

    const blockers: string[] = [];

    if (payment.refunds.length > 0) {
      blockers.push(
        `${payment.refunds.length} refund${
          payment.refunds.length === 1
            ? ""
            : "s"
        }`,
      );
    }

    if (
      payment.salesDocuments.length > 0
    ) {
      blockers.push(
        `${payment.salesDocuments.length} sales document${
          payment.salesDocuments.length === 1
            ? ""
            : "s"
        }`,
      );
    }

    const protectedBankTransactions =
      payment.bankTransactions.filter(
        (transaction) =>
          Boolean(
            transaction.reconciliationId ||
              transaction.statementLine ||
              transaction.reversalOfId ||
              transaction.reversedBy,
          ),
      );

    if (
      protectedBankTransactions.length > 0
    ) {
      blockers.push(
        `${protectedBankTransactions.length} reconciled, matched, or reversed bank transaction${
          protectedBankTransactions.length === 1
            ? ""
            : "s"
        }`,
      );
    }

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error:
            "This payment cannot be deleted because it has protected records:\n\n" +
            blockers
              .map(
                (item) =>
                  `• ${item}`,
              )
              .join("\n") +
            "\n\nRemove the test-linked records first.",
        },
        {
          status: 409,
        },
      );
    }

    await db.$transaction(
      async (tx) => {
        await tx.paymentAllocation.deleteMany(
          {
            where: {
              paymentId,
            },
          },
        );

        await tx.bankTransaction.deleteMany(
          {
            where: {
              paymentId,
              reconciliationId: null,
              reversalOfId: null,
            },
          },
        );

        await tx.payment.delete({
          where: {
            id: paymentId,
          },
        });
      },
    );

    const bookingSummary =
      await recalculateBookingPayment(
        bookingId,
      );

    return NextResponse.json({
      success: true,

      message:
        `Test payment ${
          payment.reference ||
          payment.id
        } (${payment.amount} ${
          payment.currency
        }) was deleted.`,

      bookingSummary,
    });
  } catch (error) {
    console.error(
      "DELETE_TEST_PAYMENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete test payment.",
      },
      {
        status: 500,
      },
    );
  }
}