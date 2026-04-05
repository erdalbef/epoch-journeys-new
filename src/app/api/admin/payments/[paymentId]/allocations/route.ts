import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingInstallmentStatus,
  PaymentStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
    paymentId: string;
  }>;
};

type AllocationInput = {
  paymentScheduleId: string;
  amount: number;
};

type RequestBody = {
  allocations?: AllocationInput[];
};

function getInstallmentStatus(
  amount: number,
  amountPaid: number,
  dueDate: Date
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, paymentId } = await context.params;
    const body = (await request.json()) as RequestBody;

    const rawAllocations = Array.isArray(body.allocations) ? body.allocations : [];

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          select: {
            id: true,
            totalPrice: true,
            currency: true,
          },
        },
      },
    });

    if (!payment || payment.bookingId !== bookingId) {
      return NextResponse.json(
        { error: "Payment not found for this booking." },
        { status: 404 }
      );
    }

    const schedules = await db.bookingPaymentSchedule.findMany({
      where: {
        bookingId,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    const scheduleMap = new Map(schedules.map((schedule) => [schedule.id, schedule]));

    const cleanedAllocations = rawAllocations
      .filter(
        (item) =>
          item &&
          typeof item.paymentScheduleId === "string" &&
          item.paymentScheduleId.trim() !== "" &&
          typeof item.amount === "number" &&
          Number.isFinite(item.amount) &&
          item.amount > 0
      )
      .map((item) => ({
        paymentScheduleId: item.paymentScheduleId,
        amount: Number(item.amount),
      }));

    const seen = new Set<string>();
    for (const item of cleanedAllocations) {
      if (seen.has(item.paymentScheduleId)) {
        return NextResponse.json(
          { error: "Duplicate schedule allocation detected." },
          { status: 400 }
        );
      }
      seen.add(item.paymentScheduleId);

      const schedule = scheduleMap.get(item.paymentScheduleId);

      if (!schedule) {
        return NextResponse.json(
          { error: "One or more schedules do not belong to this booking." },
          { status: 400 }
        );
      }

      if (schedule.status === BookingInstallmentStatus.CANCELLED) {
        return NextResponse.json(
          { error: "Cannot allocate to a cancelled installment." },
          { status: 400 }
        );
      }

      if (item.amount > schedule.amount) {
        return NextResponse.json(
          { error: "Allocation cannot exceed installment amount." },
          { status: 400 }
        );
      }
    }

    const totalAllocated = cleanedAllocations.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    if (totalAllocated > payment.amount + 0.000001) {
      return NextResponse.json(
        { error: "Allocated total cannot exceed payment amount." },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.paymentAllocation.deleteMany({
        where: { paymentId },
      });

      if (cleanedAllocations.length > 0) {
        await tx.paymentAllocation.createMany({
          data: cleanedAllocations.map((item) => ({
            paymentId,
            paymentScheduleId: item.paymentScheduleId,
            amount: item.amount,
          })),
        });
      }

      const refreshedSchedules = await tx.bookingPaymentSchedule.findMany({
        where: { bookingId },
        include: {
          allocations: {
            orderBy: {
              allocatedAt: "asc",
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      });

      for (const schedule of refreshedSchedules) {
        const amountPaid = schedule.allocations.reduce(
          (sum, allocation) => sum + allocation.amount,
          0
        );

        const nextStatus =
          schedule.status === BookingInstallmentStatus.CANCELLED
            ? BookingInstallmentStatus.CANCELLED
            : getInstallmentStatus(schedule.amount, amountPaid, schedule.dueDate);

        const latestAllocationDate =
          schedule.allocations.length > 0
            ? schedule.allocations[schedule.allocations.length - 1]?.allocatedAt ?? null
            : null;

        await tx.bookingPaymentSchedule.update({
          where: { id: schedule.id },
          data: {
            amountPaid,
            status: nextStatus,
            paidAt:
              nextStatus === BookingInstallmentStatus.PAID
                ? latestAllocationDate
                : null,
          },
        });
      }

      const finalSchedules = await tx.bookingPaymentSchedule.findMany({
        where: {
          bookingId,
          status: {
            not: BookingInstallmentStatus.CANCELLED,
          },
        },
      });

      const totalScheduledAmount = finalSchedules.reduce(
        (sum, schedule) => sum + schedule.amount,
        0
      );

      const totalPaidFromSchedules = finalSchedules.reduce(
        (sum, schedule) => sum + schedule.amountPaid,
        0
      );

      const effectiveTotal =
        totalScheduledAmount > 0 ? totalScheduledAmount : payment.booking.totalPrice;

      const amountDue = Math.max(effectiveTotal - totalPaidFromSchedules, 0);

      let paymentStatus: PaymentStatus = PaymentStatus.PARTIALLY_PAID;

      if (totalPaidFromSchedules <= 0) {
        paymentStatus = PaymentStatus.UNPAID;
      } else if (amountDue === 0) {
        paymentStatus = PaymentStatus.PAID;
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          amountPaid: totalPaidFromSchedules,
          amountDue,
          paymentStatus,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Allocation update error:", error);

    return NextResponse.json(
      { error: "Failed to update payment allocations." },
      { status: 500 }
    );
  }
}