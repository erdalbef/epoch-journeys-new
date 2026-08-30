import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  BookingInstallmentStatus,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}

function nextInstallmentStatus(
  amount: number,
  amountPaid: number,
  dueDate: Date,
): BookingInstallmentStatus {
  const now = new Date();

  if (amountPaid <= 0) {
    return dueDate < now
      ? BookingInstallmentStatus.OVERDUE
      : BookingInstallmentStatus.PENDING;
  }

  if (amountPaid < amount) {
    return dueDate < now
      ? BookingInstallmentStatus.OVERDUE
      : BookingInstallmentStatus.PARTIALLY_PAID;
  }

  return BookingInstallmentStatus.PAID;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as {
      bookingId?: string | null;
      tourId?: string | null;
      agencyGroupName?: string | null;
      amount?: number | string;
      currency?: string;
      method?: string;
      paidAt?: string;
      bankAccountId?: string;
      reference?: string | null;
      notes?: string | null;
    };

    const bookingId =
      typeof body.bookingId === "string" && body.bookingId.trim()
        ? body.bookingId.trim()
        : null;

    let tourId =
      typeof body.tourId === "string" && body.tourId.trim()
        ? body.tourId.trim()
        : null;

    let agencyGroupName =
      typeof body.agencyGroupName === "string" && body.agencyGroupName.trim()
        ? body.agencyGroupName.trim()
        : null;

    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0." },
        { status: 400 },
      );
    }

    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "EUR";

    if (!body.method || !isPaymentMethod(body.method)) {
      return NextResponse.json(
        { error: "Invalid payment method." },
        { status: 400 },
      );
    }

    const paidAt =
      typeof body.paidAt === "string" && body.paidAt.trim()
        ? new Date(`${body.paidAt}T12:00:00.000Z`)
        : new Date();

    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json(
        { error: "Invalid payment date." },
        { status: 400 },
      );
    }

    const bankAccountId =
      typeof body.bankAccountId === "string" && body.bankAccountId.trim()
        ? body.bankAccountId.trim()
        : null;

    if (!bankAccountId) {
      return NextResponse.json(
        { error: "Select the bank account that received the payment." },
        { status: 400 },
      );
    }

    const bankAccount = await db.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: {
        id: true,
        name: true,
        currency: true,
        isActive: true,
      },
    });

    if (!bankAccount || !bankAccount.isActive) {
      return NextResponse.json(
        { error: "Selected bank account is not available." },
        { status: 400 },
      );
    }

    if (bankAccount.currency !== currency) {
      return NextResponse.json(
        {
          error: `Bank account currency (${bankAccount.currency}) must match payment currency (${currency}).`,
        },
        { status: 400 },
      );
    }

    const booking = bookingId
      ? await db.booking.findUnique({
          where: { id: bookingId },
          include: {
            payments: {
              select: {
                amount: true,
                status: true,
              },
            },
            paymentSchedules: {
              orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
              include: {
                allocations: true,
              },
            },
          },
        })
      : null;

    if (bookingId && !booking) {
      return NextResponse.json(
        { error: "Selected booking was not found." },
        { status: 404 },
      );
    }

    if (booking) {
      if (booking.status === "CANCELLED") {
        return NextResponse.json(
          { error: "A cancelled booking cannot receive a payment." },
          { status: 409 },
        );
      }

      if (booking.currency !== currency) {
        return NextResponse.json(
          {
            error: `Payment currency must match the booking currency (${booking.currency}).`,
          },
          { status: 400 },
        );
      }

      tourId = booking.tourId;
      agencyGroupName =
        agencyGroupName ||
        booking.agencyNameSnapshot ||
        booking.agentNameSnapshot ||
        booking.groupName ||
        booking.customerName ||
        null;

      const received = booking.payments
        .filter((payment) => payment.status === PaymentRecordStatus.RECEIVED)
        .reduce((sum, payment) => sum + payment.amount, 0);

      const refunded = booking.payments
        .filter((payment) => payment.status === PaymentRecordStatus.REFUNDED)
        .reduce((sum, payment) => sum + payment.amount, 0);

      const outstanding = Math.max(
        booking.totalPrice - Math.max(received - refunded, 0),
        0,
      );

      if (amount > outstanding + 0.000001) {
        return NextResponse.json(
          {
            error: `Payment exceeds the booking outstanding balance of ${outstanding.toFixed(
              2,
            )} ${currency}.`,
          },
          { status: 400 },
        );
      }
    }

    if (tourId) {
      const tour = await db.tour.findUnique({
        where: { id: tourId },
        select: { id: true },
      });

      if (!tour) {
        return NextResponse.json(
          { error: "Selected tour / package was not found." },
          { status: 404 },
        );
      }
    }

    if (!booking && !tourId && !agencyGroupName) {
      return NextResponse.json(
        {
          error:
            "Enter an Agency / Parish / Group / Customer or select a Tour / Package.",
        },
        { status: 400 },
      );
    }

    const reference =
      typeof body.reference === "string" && body.reference.trim()
        ? body.reference.trim()
        : null;

    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    const receivedBy =
      session.user.name || session.user.email || "Admin";

    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId: booking?.id ?? null,
          tourId,
          agencyGroupName,
          amount,
          currency,
          method: body.method as PaymentMethod,
          status: PaymentRecordStatus.RECEIVED,
          reference,
          notes,
          paidAt,
          receivedBy,
        },
      });

      const bankTransaction = await tx.bankTransaction.create({
        data: {
          bankAccountId,
          createdById: session.user.id,
          type: BankTransactionType.CUSTOMER_RECEIPT,
          direction: BankTransactionDirection.IN,
          status: BankTransactionStatus.POSTED,
          amount,
          currency,
          transactionDate: paidAt,
          reference,
          description: booking
            ? `Customer receipt - ${
                booking.bookingDisplayCode || booking.bookingReference
              } - ${booking.tourTitleSnapshot}`
            : `Customer receipt - ${
                agencyGroupName || "Customer"
              }${tourId ? " - linked tour/package" : ""}`,
          notes,
          bookingId: booking?.id ?? null,
          paymentId: payment.id,
          tourId,
          departureDateId: booking?.departureDateId ?? null,
        },
      });

      if (booking) {
        let remaining = round2(amount);

        const schedules = booking.paymentSchedules.filter(
          (schedule) =>
            schedule.status !== BookingInstallmentStatus.CANCELLED,
        );

        for (const schedule of schedules) {
          if (remaining <= 0) break;

          const allocatedBefore = round2(
            schedule.allocations.reduce(
              (sum, allocation) => sum + allocation.amount,
              0,
            ),
          );

          const scheduleBalance = round2(
            Math.max(schedule.amount - allocatedBefore, 0),
          );

          if (scheduleBalance <= 0) continue;

          const allocateNow = round2(
            Math.min(remaining, scheduleBalance),
          );

          if (allocateNow <= 0) continue;

          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              paymentScheduleId: schedule.id,
              amount: allocateNow,
              notes: "Automatically allocated from Customer Payments.",
            },
          });

          remaining = round2(remaining - allocateNow);
        }

        const refreshedSchedules =
          await tx.bookingPaymentSchedule.findMany({
            where: { bookingId: booking.id },
            include: { allocations: true },
            orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
          });

        for (const schedule of refreshedSchedules) {
          const paid = round2(
            schedule.allocations.reduce(
              (sum, allocation) => sum + allocation.amount,
              0,
            ),
          );

          const status =
            schedule.status === BookingInstallmentStatus.CANCELLED
              ? BookingInstallmentStatus.CANCELLED
              : nextInstallmentStatus(
                  schedule.amount,
                  paid,
                  schedule.dueDate,
                );

          await tx.bookingPaymentSchedule.update({
            where: { id: schedule.id },
            data: {
              amountPaid: paid,
              status,
              paidAt:
                status === BookingInstallmentStatus.PAID
                  ? paidAt
                  : null,
            },
          });
        }

        const allPayments = await tx.payment.findMany({
          where: { bookingId: booking.id },
          select: { amount: true, status: true },
        });

        const receivedTotal = allPayments
          .filter(
            (existing) =>
              existing.status === PaymentRecordStatus.RECEIVED,
          )
          .reduce((sum, existing) => sum + existing.amount, 0);

        const refundedTotal = allPayments
          .filter(
            (existing) =>
              existing.status === PaymentRecordStatus.REFUNDED,
          )
          .reduce((sum, existing) => sum + existing.amount, 0);

        const effectivePaid = round2(
          Math.max(receivedTotal - refundedTotal, 0),
        );

        const amountDue = round2(
          Math.max(booking.totalPrice - effectivePaid, 0),
        );

        const paymentStatus =
          effectivePaid <= 0
            ? PaymentStatus.UNPAID
            : amountDue > 0
              ? PaymentStatus.PARTIALLY_PAID
              : PaymentStatus.PAID;

        const nextDueSchedule =
          await tx.bookingPaymentSchedule.findFirst({
            where: {
              bookingId: booking.id,
              status: {
                in: [
                  BookingInstallmentStatus.PENDING,
                  BookingInstallmentStatus.PARTIALLY_PAID,
                  BookingInstallmentStatus.OVERDUE,
                ],
              },
            },
            orderBy: { dueDate: "asc" },
            select: { dueDate: true },
          });

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            amountPaid: effectivePaid,
            amountDue,
            paymentStatus,
            paymentDueDate: nextDueSchedule?.dueDate ?? null,
          },
        });
      }

      return { payment, bankTransaction };
    });

    return NextResponse.json(
      {
        success: true,
        payment: result.payment,
        bankTransactionId: result.bankTransaction.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/payments error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record customer payment.",
      },
      { status: 500 },
    );
  }
}
