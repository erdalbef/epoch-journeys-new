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
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ paymentId: string }>;
};

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

async function rebuildBooking(tx: Prisma.TransactionClient, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, totalPrice: true },
  });
  if (!booking) return;

  const schedules = await tx.bookingPaymentSchedule.findMany({
    where: { bookingId },
    include: { allocations: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  for (const schedule of schedules) {
    const paid = round2(
      schedule.allocations.reduce(
        (sum: number, allocation: { amount: number }) => sum + allocation.amount,
        0,
      ),
    );

    const status =
      schedule.status === BookingInstallmentStatus.CANCELLED
        ? BookingInstallmentStatus.CANCELLED
        : nextInstallmentStatus(schedule.amount, paid, schedule.dueDate);

    await tx.bookingPaymentSchedule.update({
      where: { id: schedule.id },
      data: {
        amountPaid: paid,
        status,
        paidAt: status === BookingInstallmentStatus.PAID ? new Date() : null,
      },
    });
  }

  const payments = await tx.payment.findMany({
    where: { bookingId },
    select: { amount: true, status: true },
  });

  const received = payments
    .filter((p: { status: PaymentRecordStatus }) => p.status === PaymentRecordStatus.RECEIVED)
    .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

  const refunded = payments
    .filter((p: { status: PaymentRecordStatus }) => p.status === PaymentRecordStatus.REFUNDED)
    .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

  const effectivePaid = round2(Math.max(received - refunded, 0));
  const amountDue = round2(Math.max(booking.totalPrice - effectivePaid, 0));
  const paymentStatus =
    effectivePaid <= 0
      ? PaymentStatus.UNPAID
      : amountDue > 0
        ? PaymentStatus.PARTIALLY_PAID
        : PaymentStatus.PAID;

  const nextDue = await tx.bookingPaymentSchedule.findFirst({
    where: {
      bookingId,
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
    where: { id: bookingId },
    data: {
      amountPaid: effectivePaid,
      amountDue,
      paymentStatus,
      paymentDueDate: nextDue?.dueDate ?? null,
    },
  });
}

async function allocatePayment(
  tx: Prisma.TransactionClient,
  paymentId: string,
  bookingId: string,
  amount: number,
  paidAt: Date,
) {
  await tx.paymentAllocation.deleteMany({ where: { paymentId } });

  const schedules = await tx.bookingPaymentSchedule.findMany({
    where: {
      bookingId,
      status: { not: BookingInstallmentStatus.CANCELLED },
    },
    include: { allocations: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  let remaining = round2(amount);

  for (const schedule of schedules) {
    if (remaining <= 0) break;

    const allocatedBefore = round2(
      schedule.allocations.reduce(
        (sum: number, allocation: { amount: number; paymentId: string }) =>
          allocation.paymentId === paymentId ? sum : sum + allocation.amount,
        0,
      ),
    );
    const balance = round2(Math.max(schedule.amount - allocatedBefore, 0));
    const allocateNow = round2(Math.min(remaining, balance));

    if (allocateNow > 0) {
      await tx.paymentAllocation.create({
        data: {
          paymentId,
          paymentScheduleId: schedule.id,
          amount: allocateNow,
          notes: "Automatically allocated from Customer Payments.",
        },
      });
      remaining = round2(remaining - allocateNow);
    }
  }

  const refreshed = await tx.bookingPaymentSchedule.findMany({
    where: { bookingId },
    include: { allocations: true },
  });

  for (const schedule of refreshed) {
    const paid = round2(
      schedule.allocations.reduce(
        (sum: number, allocation: { amount: number }) => sum + allocation.amount,
        0,
      ),
    );
    const status =
      schedule.status === BookingInstallmentStatus.CANCELLED
        ? BookingInstallmentStatus.CANCELLED
        : nextInstallmentStatus(schedule.amount, paid, schedule.dueDate);

    await tx.bookingPaymentSchedule.update({
      where: { id: schedule.id },
      data: {
        amountPaid: paid,
        status,
        paidAt: status === BookingInstallmentStatus.PAID ? paidAt : null,
      },
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { paymentId: id } = await context.params;
    const body = await request.json();

    const current = await db.payment.findUnique({
      where: { id },
      include: {
        bankTransactions: {
          where: { status: BankTransactionStatus.POSTED },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!current) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }
    if (current.status !== PaymentRecordStatus.RECEIVED) {
      return NextResponse.json(
        { error: "Only received payments can be edited." },
        { status: 409 },
      );
    }

    const ledger = current.bankTransactions[0];
    if (!ledger) {
      return NextResponse.json(
        { error: "Linked posted Finance Ledger transaction was not found." },
        { status: 409 },
      );
    }

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
      return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });
    }

    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : current.currency;

    if (!body.method || !isPaymentMethod(body.method)) {
      return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
    }

    const paidAt =
      typeof body.paidAt === "string" && body.paidAt.trim()
        ? new Date(`${body.paidAt}T12:00:00.000Z`)
        : current.paidAt ?? current.createdAt;

    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ error: "Invalid payment date." }, { status: 400 });
    }

    const bankAccountId =
      typeof body.bankAccountId === "string" && body.bankAccountId.trim()
        ? body.bankAccountId.trim()
        : null;

    if (!bankAccountId) {
      return NextResponse.json({ error: "Select the receiving bank account." }, { status: 400 });
    }

    const bank = await db.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { id: true, currency: true, isActive: true },
    });

    if (!bank || !bank.isActive) {
      return NextResponse.json({ error: "Selected bank account is not available." }, { status: 400 });
    }
    if (bank.currency !== currency) {
      return NextResponse.json(
        { error: `Bank account currency (${bank.currency}) must match payment currency (${currency}).` },
        { status: 400 },
      );
    }

    const booking = bookingId
      ? await db.booking.findUnique({
          where: { id: bookingId },
          include: {
            payments: { select: { id: true, amount: true, status: true } },
          },
        })
      : null;

    if (bookingId && !booking) {
      return NextResponse.json({ error: "Selected booking was not found." }, { status: 404 });
    }

    if (booking) {
      if (booking.status === "CANCELLED") {
        return NextResponse.json({ error: "A cancelled booking cannot receive a payment." }, { status: 409 });
      }
      if (booking.currency !== currency) {
        return NextResponse.json(
          { error: `Payment currency must match the booking currency (${booking.currency}).` },
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

      const otherReceived = booking.payments
        .filter((p) => p.id !== id && p.status === PaymentRecordStatus.RECEIVED)
        .reduce((sum, p) => sum + p.amount, 0);
      const otherRefunded = booking.payments
        .filter((p) => p.id !== id && p.status === PaymentRecordStatus.REFUNDED)
        .reduce((sum, p) => sum + p.amount, 0);
      const maxForThisPayment = Math.max(
        booking.totalPrice - Math.max(otherReceived - otherRefunded, 0),
        0,
      );

      if (amount > maxForThisPayment + 0.000001) {
        return NextResponse.json(
          { error: `Payment exceeds the booking available balance of ${maxForThisPayment.toFixed(2)} ${currency}.` },
          { status: 400 },
        );
      }
    }

    if (tourId) {
      const tour = await db.tour.findUnique({ where: { id: tourId }, select: { id: true } });
      if (!tour) {
        return NextResponse.json({ error: "Selected tour / package was not found." }, { status: 404 });
      }
    }

    if (!booking && !tourId && !agencyGroupName) {
      return NextResponse.json(
        { error: "Enter an Agency / Parish / Group / Customer or select a Tour / Package." },
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

    const oldBookingId = current.bookingId;

    await db.$transaction(async (tx) => {
      await tx.paymentAllocation.deleteMany({ where: { paymentId: id } });

      await tx.payment.update({
        where: { id },
        data: {
          bookingId: booking?.id ?? null,
          tourId,
          agencyGroupName,
          amount,
          currency,
          method: body.method as PaymentMethod,
          reference,
          notes,
          paidAt,
        },
      });

      await tx.bankTransaction.update({
        where: { id: ledger.id },
        data: {
          bankAccountId,
          type: BankTransactionType.CUSTOMER_RECEIPT,
          direction: BankTransactionDirection.IN,
          status: BankTransactionStatus.POSTED,
          amount,
          currency,
          transactionDate: paidAt,
          reference,
          notes,
          bookingId: booking?.id ?? null,
          tourId,
          departureDateId: booking?.departureDateId ?? null,
          description: booking
            ? `Customer receipt - ${booking.bookingDisplayCode || booking.bookingReference} - ${booking.tourTitleSnapshot}`
            : `Customer receipt - ${agencyGroupName || "Customer"}${tourId ? " - linked tour/package" : ""}`,
        },
      });

      if (booking) {
        await allocatePayment(tx, id, booking.id, amount, paidAt);
      }

      if (oldBookingId && oldBookingId !== booking?.id) {
        await rebuildBooking(tx, oldBookingId);
      }
      if (booking) {
        await rebuildBooking(tx, booking.id);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/payments/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update customer payment." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { paymentId: id } = await context.params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        refunds: {
          select: { id: true },
        },
        salesDocuments: {
          select: { id: true, documentNumber: true },
        },
        bankTransactions: {
          select: {
            id: true,
            reconciliationId: true,
            reversalOfId: true,
            reversals: {
              select: { id: true },
            },
            statementLine: {
              select: { id: true },
            },
            documents: {
              select: { id: true },
            },
          },
        },
        financeDocument: {
          select: {
            id: true,
            storagePath: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found." },
        { status: 404 },
      );
    }

    const blockers: string[] = [];

    if (payment.status === PaymentRecordStatus.REFUNDED) {
      blockers.push("the payment is already marked REFUNDED");
    }

    if (payment.refunds.length > 0) {
      blockers.push(
        `${payment.refunds.length} refund record${
          payment.refunds.length === 1 ? "" : "s"
        }`,
      );
    }

    if (payment.salesDocuments.length > 0) {
      blockers.push(
        `${payment.salesDocuments.length} linked sales document${
          payment.salesDocuments.length === 1 ? "" : "s"
        }`,
      );
    }

    const reconciledTransactions = payment.bankTransactions.filter(
      (transaction) => Boolean(transaction.reconciliationId),
    );

    if (reconciledTransactions.length > 0) {
      blockers.push(
        `${reconciledTransactions.length} reconciled bank transaction${
          reconciledTransactions.length === 1 ? "" : "s"
        }`,
      );
    }

    const reversedTransactions = payment.bankTransactions.filter(
      (transaction) =>
        Boolean(transaction.reversalOfId || transaction.reversals),
    );

    if (reversedTransactions.length > 0) {
      blockers.push(
        `${reversedTransactions.length} reversed/reversal bank transaction${
          reversedTransactions.length === 1 ? "" : "s"
        }`,
      );
    }

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error:
            "This payment cannot be deleted because it has protected accounting records:\n\n" +
            blockers.map((item) => `• ${item}`).join("\n") +
            "\n\nRemove or reverse the protected records first.",
        },
        { status: 409 },
      );
    }

    const bookingId = payment.bookingId;
    const bankTransactionIds = payment.bankTransactions.map(
      (transaction) => transaction.id,
    );

    await db.$transaction(async (tx) => {
      /*
       * A statement match is not treated as a permanent blocker for an
       * obvious data-entry mistake. Unmatch it first so the statement line
       * remains in the bank statement and can be matched correctly later.
       */
      if (bankTransactionIds.length > 0) {
        await tx.bankStatementLine.updateMany({
          where: {
            matchedBankTransactionId: {
              in: bankTransactionIds,
            },
          },
          data: {
            matchedBankTransactionId: null,
            matchedAt: null,
            matchStatus: "UNMATCHED",
          },
        });
      }

      await tx.paymentAllocation.deleteMany({
        where: { paymentId: id },
      });

      /*
       * Delete any Finance Documents linked through either the payment or
       * its bank transaction. This covers payment proof and generated
       * accounting support documents.
       */
      await tx.financeDocument.deleteMany({
        where: {
          OR: [
            { paymentId: id },
            ...(bankTransactionIds.length > 0
              ? [{ bankTransactionId: { in: bankTransactionIds } }]
              : []),
          ],
        },
      });

      if (bankTransactionIds.length > 0) {
        await tx.bankTransaction.deleteMany({
          where: {
            id: { in: bankTransactionIds },
          },
        });
      }

      await tx.payment.delete({
        where: { id },
      });

      if (bookingId) {
        await rebuildBooking(tx, bookingId);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/payments/[id] error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete customer payment.",
      },
      { status: 500 },
    );
  }
}
