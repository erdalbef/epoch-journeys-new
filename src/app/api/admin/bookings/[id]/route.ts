import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
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

    const { id } = await context.params;

    const booking = await db.booking.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        bookingReference: true,
        payoutId: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          error: "Booking not found.",
        },
        {
          status: 404,
        },
      );
    }

    const [
      paymentCount,
      expenseCount,
      financeEntryCount,
      supplierPayableCount,
      bankTransactionCount,
      refundCount,
      financeDocumentCount,
      salesDocumentCount,
    ] = await Promise.all([
      db.payment.count({
        where: {
          bookingId: id,
        },
      }),

      db.expense.count({
        where: {
          bookingId: id,
        },
      }),

      db.financeEntry.count({
        where: {
          bookingId: id,
        },
      }),

      db.supplierPayable.count({
        where: {
          bookingId: id,
        },
      }),

      db.bankTransaction.count({
        where: {
          bookingId: id,
        },
      }),

      db.refund.count({
        where: {
          bookingId: id,
        },
      }),

      db.financeDocument.count({
        where: {
          bookingId: id,
        },
      }),

      db.salesDocument.count({
        where: {
          bookingId: id,
        },
      }),
    ]);

    const blockers: string[] = [];

    if (paymentCount > 0) {
      blockers.push(
        `${paymentCount} payment${paymentCount === 1 ? "" : "s"}`,
      );
    }

    if (expenseCount > 0) {
      blockers.push(
        `${expenseCount} expense${expenseCount === 1 ? "" : "s"}`,
      );
    }

    if (financeEntryCount > 0) {
      blockers.push(
        `${financeEntryCount} finance entr${
          financeEntryCount === 1 ? "y" : "ies"
        }`,
      );
    }

    if (supplierPayableCount > 0) {
      blockers.push(
        `${supplierPayableCount} supplier payable${
          supplierPayableCount === 1 ? "" : "s"
        }`,
      );
    }

    if (bankTransactionCount > 0) {
      blockers.push(
        `${bankTransactionCount} bank transaction${
          bankTransactionCount === 1 ? "" : "s"
        }`,
      );
    }

    if (refundCount > 0) {
      blockers.push(
        `${refundCount} refund${refundCount === 1 ? "" : "s"}`,
      );
    }

    if (financeDocumentCount > 0) {
      blockers.push(
        `${financeDocumentCount} finance document${
          financeDocumentCount === 1 ? "" : "s"
        }`,
      );
    }

    if (salesDocumentCount > 0) {
      blockers.push(
        `${salesDocumentCount} sales document${
          salesDocumentCount === 1 ? "" : "s"
        }`,
      );
    }

    if (booking.payoutId) {
      blockers.push("1 partner payout");
    }

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error:
            `This booking cannot be deleted because it has protected financial records:\n\n` +
            blockers.map((item) => `• ${item}`).join("\n") +
            `\n\nDelete the test financial records first, or keep the booking for historical records.`,
          blockers: {
            payments: paymentCount,
            expenses: expenseCount,
            financeEntries: financeEntryCount,
            supplierPayables: supplierPayableCount,
            bankTransactions: bankTransactionCount,
            refunds: refundCount,
            financeDocuments: financeDocumentCount,
            salesDocuments: salesDocumentCount,
            partnerPayout: Boolean(booking.payoutId),
          },
        },
        {
          status: 409,
        },
      );
    }

    await db.$transaction(async (tx) => {
      await tx.bookingOperationControl.deleteMany({
        where: {
          bookingId: id,
        },
      });

      await tx.massArrangement.deleteMany({
        where: {
          bookingId: id,
        },
      });

      await tx.supportMessage.deleteMany({
        where: {
          bookingId: id,
        },
      });

      await tx.paymentSubmission.deleteMany({
        where: {
          bookingId: id,
        },
      });

      await tx.bookingPaymentSchedule.deleteMany({
        where: {
          bookingId: id,
        },
      });

      await tx.roomAssignment.deleteMany({
        where: {
          bookingId: id,
        },
      });

      await tx.passenger.deleteMany({
        where: {
          bookingId: id,
        },
      });

      await tx.booking.delete({
        where: {
          id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Booking ${booking.bookingReference} deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "DELETE_ADMIN_BOOKING_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete booking.",
      },
      {
        status: 500,
      },
    );
  }
}