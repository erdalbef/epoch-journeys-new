import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingInstallmentStatus,
  BookingInstallmentType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{ id: string; scheduleId: string }>;
};

type Body = {
  type?: BookingInstallmentType;
  title?: string;
  dueDate?: string;
  amount?: string;
  notes?: string;
};

function clean(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseType(value: unknown): BookingInstallmentType | null {
  return Object.values(BookingInstallmentType).includes(
    value as BookingInstallmentType,
  )
    ? (value as BookingInstallmentType)
    : null;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) return null;
  return session.user;
}

async function refreshBookingPaymentDueDate(bookingId: string) {
  const nextSchedule = await db.bookingPaymentSchedule.findFirst({
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

  await db.booking.update({
    where: { id: bookingId },
    data: { paymentDueDate: nextSchedule?.dueDate ?? null },
  });
}

export async function PUT(request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: bookingId, scheduleId } = await context.params;
    const body = (await request.json()) as Body;

    const schedule = await db.bookingPaymentSchedule.findFirst({
      where: { id: scheduleId, bookingId },
      include: {
        allocations: { select: { id: true } },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Payment installment not found." },
        { status: 404 },
      );
    }

    if (schedule.amountPaid > 0 || schedule.allocations.length > 0) {
      return NextResponse.json(
        { error: "This installment has payment activity and can no longer be edited." },
        { status: 409 },
      );
    }

    const type = parseType(body.type);
    const dueDate = body.dueDate
      ? new Date(`${body.dueDate}T12:00:00.000Z`)
      : null;
    const amount = Number(body.amount);

    if (!type) {
      return NextResponse.json(
        { error: "Select a valid installment type." },
        { status: 400 },
      );
    }

    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: "Enter a valid due date." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Enter a valid installment amount." },
        { status: 400 },
      );
    }

    await db.bookingPaymentSchedule.update({
      where: { id: scheduleId },
      data: {
        type,
        title: clean(body.title),
        dueDate,
        amount,
        notes: clean(body.notes),
        status: BookingInstallmentStatus.PENDING,
      },
    });

    await refreshBookingPaymentDueDate(bookingId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UPDATE_BOOKING_PAYMENT_SCHEDULE_ERROR", error);
    return NextResponse.json(
      { error: "Failed to update payment installment." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: bookingId, scheduleId } = await context.params;

    const schedule = await db.bookingPaymentSchedule.findFirst({
      where: { id: scheduleId, bookingId },
      include: {
        allocations: { select: { id: true } },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Payment installment not found." },
        { status: 404 },
      );
    }

    if (schedule.amountPaid > 0 || schedule.allocations.length > 0) {
      return NextResponse.json(
        { error: "This installment has payment activity and cannot be deleted." },
        { status: 409 },
      );
    }

    await db.bookingPaymentSchedule.delete({
      where: { id: scheduleId },
    });

    await refreshBookingPaymentDueDate(bookingId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_BOOKING_PAYMENT_SCHEDULE_ERROR", error);
    return NextResponse.json(
      { error: "Failed to delete payment installment." },
      { status: 500 },
    );
  }
}
