import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingInstallmentStatus,
  BookingInstallmentType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

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

export async function POST(request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: bookingId } = await context.params;
    const body = (await request.json()) as Body;

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
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

    const created = await db.bookingPaymentSchedule.create({
      data: {
        bookingId,
        type,
        title: clean(body.title),
        dueDate,
        amount,
        amountPaid: 0,
        status: BookingInstallmentStatus.PENDING,
        notes: clean(body.notes),
      },
      select: { id: true },
    });

    await refreshBookingPaymentDueDate(bookingId);

    return NextResponse.json(
      { success: true, id: created.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE_BOOKING_PAYMENT_SCHEDULE_ERROR", error);
    return NextResponse.json(
      { error: "Failed to create payment installment." },
      { status: 500 },
    );
  }
}
