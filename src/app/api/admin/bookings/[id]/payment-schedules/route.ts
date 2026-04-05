import {
  BookingInstallmentStatus,
  BookingInstallmentType,
  Role,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { recomputeBookingPaymentSummary } from "@/lib/bookings/recomputeBookingPaymentSummary";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateInstallmentBody = {
  type?: string;
  title?: string | null;
  notes?: string | null;
  amount?: number | string;
  dueDate?: string;
};

function isInstallmentType(value: string): value is BookingInstallmentType {
  return Object.values(BookingInstallmentType).includes(
    value as BookingInstallmentType
  );
}

function deriveStatus(
  amount: number,
  amountPaid: number,
  dueDate: Date
): BookingInstallmentStatus {
  if (amountPaid >= amount) return "PAID";
  if (amountPaid > 0) return "PARTIALLY_PAID";
  if (dueDate.getTime() < Date.now()) return "OVERDUE";
  return "PENDING";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: bookingId } = await context.params;
    const body = (await request.json()) as CreateInstallmentBody;

    const rawType = typeof body.type === "string" ? body.type : "CUSTOM";

    if (!isInstallmentType(rawType)) {
      return NextResponse.json(
        { error: "Invalid installment type." },
        { status: 400 }
      );
    }

    const installmentType: BookingInstallmentType = rawType;

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : null;

    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    const amount =
      typeof body.amount === "number" ? body.amount : Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0." },
        { status: 400 }
      );
    }

    if (typeof body.dueDate !== "string" || !body.dueDate.trim()) {
      return NextResponse.json(
        { error: "Due date is required." },
        { status: 400 }
      );
    }

    const dueDate = new Date(body.dueDate);

    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid due date." },
        { status: 400 }
      );
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.bookingPaymentSchedule.create({
        data: {
          bookingId,
          type: installmentType,
          title,
          dueDate,
          amount,
          amountPaid: 0,
          status: deriveStatus(amount, 0, dueDate),
          notes,
        },
      });

      await recomputeBookingPaymentSummary(tx, bookingId);
    });

    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/finance");

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create installment.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}