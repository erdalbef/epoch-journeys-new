import {
  PaymentRecordStatus,
  PaymentStatus,
} from "@prisma/client";

import { db } from "@/lib/db";

export async function recalculateBookingPayment(
  bookingId: string,
) {
  const booking =
    await db.booking.findUnique({
      where: {
        id: bookingId,
      },

      select: {
        id: true,
        totalPrice: true,
        status: true,

        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });

  if (!booking) {
    throw new Error(
      "Booking not found.",
    );
  }

  /*
   * Only successfully received customer
   * payments count toward the amount paid.
   */
  const receivedAmount =
    booking.payments
      .filter(
        (payment) =>
          payment.status ===
          PaymentRecordStatus.RECEIVED,
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amount,
        0,
      );

  /*
   * Payments marked as refunded reduce
   * the customer's effective paid amount.
   */
  const refundedAmount =
    booking.payments
      .filter(
        (payment) =>
          payment.status ===
          PaymentRecordStatus.REFUNDED,
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amount,
        0,
      );

  const effectivePaid =
    Math.max(
      receivedAmount -
        refundedAmount,
      0,
    );

  const amountDue =
    Math.max(
      booking.totalPrice -
        effectivePaid,
      0,
    );

  let paymentStatus:
    PaymentStatus =
    PaymentStatus.UNPAID;

  if (
    booking.status ===
    "CANCELLED"
  ) {
    paymentStatus =
      refundedAmount > 0
        ? PaymentStatus.REFUNDED
        : PaymentStatus.UNPAID;
  } else if (
    refundedAmount > 0 &&
    effectivePaid <= 0
  ) {
    paymentStatus =
      PaymentStatus.REFUNDED;
  } else if (
    effectivePaid <= 0
  ) {
    paymentStatus =
      PaymentStatus.UNPAID;
  } else if (
    effectivePaid <
    booking.totalPrice
  ) {
    paymentStatus =
      PaymentStatus.PARTIALLY_PAID;
  } else {
    paymentStatus =
      PaymentStatus.PAID;
  }

  await db.booking.update({
    where: {
      id: bookingId,
    },

    data: {
      amountPaid:
        effectivePaid,

      amountDue,

      paymentStatus,
    },
  });

  return {
    amountPaid:
      effectivePaid,

    amountDue,

    paymentStatus,
  };
}