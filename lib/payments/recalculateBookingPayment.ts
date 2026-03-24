import {
  PaymentRecordStatus,
  PaymentStatus,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

export async function recalculateBookingPayment(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
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
    throw new Error("Booking not found.");
  }

  const amountPaid = booking.payments
    .filter((payment) => payment.status === PaymentRecordStatus.RECEIVED)
    .reduce((sum, payment) => sum + payment.amount, 0);

  const refundedAmount = booking.payments
    .filter((payment) => payment.status === PaymentRecordStatus.REFUNDED)
    .reduce((sum, payment) => sum + payment.amount, 0);

  const effectivePaid = Math.max(amountPaid - refundedAmount, 0);
  const amountDue = Math.max(booking.totalPrice - effectivePaid, 0);

  let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;

  if (booking.status === "CANCELLED") {
    paymentStatus = refundedAmount > 0 ? PaymentStatus.REFUNDED : PaymentStatus.UNPAID;
  } else if (refundedAmount > 0 && effectivePaid <= 0) {
    paymentStatus = PaymentStatus.REFUNDED;
  } else if (effectivePaid <= 0) {
    paymentStatus = PaymentStatus.UNPAID;
  } else if (effectivePaid < booking.totalPrice) {
    paymentStatus = PaymentStatus.PARTIALLY_PAID;
  } else {
    paymentStatus = PaymentStatus.PAID;
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      amountPaid: effectivePaid,
      amountDue,
      paymentStatus,
    },
  });

  return {
    amountPaid: effectivePaid,
    amountDue,
    paymentStatus,
  };
}