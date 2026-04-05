import {
  BookingInstallmentStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

/**
 * Determines the correct status of an installment
 */
function getInstallmentStatus(params: {
  amount: number;
  amountPaid: number;
  dueDate: Date;
  currentStatus: BookingInstallmentStatus;
}): BookingInstallmentStatus {
  const { amount, amountPaid, dueDate, currentStatus } = params;

  // Do not override cancelled
  if (currentStatus === "CANCELLED") {
    return "CANCELLED";
  }

  // Fully paid
  if (amountPaid >= amount) {
    return "PAID";
  }

  // Partially paid
  if (amountPaid > 0) {
    return "PARTIALLY_PAID";
  }

  // Overdue
  if (dueDate.getTime() < Date.now()) {
    return "OVERDUE";
  }

  return "PENDING";
}

/**
 * Recomputes:
 * - installment statuses
 * - booking amountPaid
 * - booking amountDue
 * - booking paymentStatus
 */
export async function recomputeBookingPaymentSummary(
  tx: Prisma.TransactionClient,
  bookingId: string
) {
  // 1. Get booking + schedules
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      totalPrice: true,
      paymentSchedules: {
        select: {
          id: true,
          amount: true,
          amountPaid: true,
          dueDate: true,
          status: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  // 2. Update installment statuses if needed
  for (const schedule of booking.paymentSchedules) {
    const newStatus = getInstallmentStatus({
      amount: schedule.amount,
      amountPaid: schedule.amountPaid,
      dueDate: schedule.dueDate,
      currentStatus: schedule.status,
    });

    if (newStatus !== schedule.status) {
      await tx.bookingPaymentSchedule.update({
        where: { id: schedule.id },
        data: { status: newStatus },
      });
    }
  }

  // 3. Re-fetch updated schedules (excluding cancelled)
  const refreshed = await tx.booking.findUnique({
    where: { id: bookingId },
    select: {
      totalPrice: true,
      paymentSchedules: {
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          amountPaid: true,
        },
      },
    },
  });

  if (!refreshed) {
    throw new Error("Booking not found after refresh.");
  }

  // 4. Calculate totals
  const totalPaid = refreshed.paymentSchedules.reduce(
    (sum, s) => sum + s.amountPaid,
    0
  );

  // Safety guards
  const safePaid = Math.min(totalPaid, refreshed.totalPrice);
  const amountDue = Math.max(refreshed.totalPrice - safePaid, 0);

  // 5. Determine payment status
  let paymentStatus: PaymentStatus = "UNPAID";

  if (safePaid >= refreshed.totalPrice) {
    paymentStatus = "PAID";
  } else if (safePaid > 0) {
    paymentStatus = "PARTIALLY_PAID";
  }

  // 6. Update booking summary
  await tx.booking.update({
    where: { id: bookingId },
    data: {
      amountPaid: safePaid,
      amountDue,
      paymentStatus,
    },
  });
}