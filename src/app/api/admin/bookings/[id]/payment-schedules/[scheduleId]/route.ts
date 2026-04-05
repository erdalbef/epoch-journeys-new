import {
  BookingInstallmentStatus,
  BookingInstallmentType,
  Prisma,
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
    scheduleId: string;
  }>;
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: bookingId, scheduleId } = await context.params;
    const body = (await request.json()) as {
      action?: "MARK_PAID" | "RESET" | "CANCEL";
      amount?: number | string;
      amountPaid?: number | string;
      dueDate?: string;
      type?: string;
      title?: string | null;
      notes?: string | null;
    };

    const existing = await db.bookingPaymentSchedule.findUnique({
      where: { id: scheduleId },
      select: {
        id: true,
        bookingId: true,
        amount: true,
        amountPaid: true,
        dueDate: true,
        status: true,
        type: true,
        title: true,
        notes: true,
      },
    });

    if (!existing || existing.bookingId !== bookingId) {
      return NextResponse.json(
        { error: "Installment not found." },
        { status: 404 }
      );
    }

    await db.$transaction(async (tx) => {
      if (body.action === "MARK_PAID") {
        await tx.bookingPaymentSchedule.update({
          where: { id: scheduleId },
          data: {
            amountPaid: existing.amount,
            paidAt: new Date(),
            status: "PAID",
          },
        });
      } else if (body.action === "RESET") {
        const resetStatus = deriveStatus(existing.amount, 0, existing.dueDate);

        await tx.bookingPaymentSchedule.update({
          where: { id: scheduleId },
          data: {
            amountPaid: 0,
            paidAt: null,
            status: resetStatus,
          },
        });
      } else if (body.action === "CANCEL") {
        await tx.bookingPaymentSchedule.update({
          where: { id: scheduleId },
          data: {
            status: "CANCELLED",
          },
        });
      } else {
        const amount =
          body.amount !== undefined ? Number(body.amount) : existing.amount;

        const amountPaid =
          body.amountPaid !== undefined
            ? Math.max(Number(body.amountPaid), 0)
            : existing.amountPaid;

        const dueDate =
          body.dueDate !== undefined ? new Date(body.dueDate) : existing.dueDate;

        if (Number.isNaN(amount) || amount <= 0) {
          throw new Error("Amount must be greater than 0.");
        }

        if (Number.isNaN(amountPaid) || amountPaid < 0) {
          throw new Error("Paid amount must be 0 or greater.");
        }

        if (Number.isNaN(dueDate.getTime())) {
          throw new Error("Invalid due date.");
        }

        let nextType: BookingInstallmentType | undefined;

        if (body.type !== undefined) {
          if (!isInstallmentType(body.type)) {
            throw new Error("Invalid installment type.");
          }
          nextType = body.type;
        }

        const title =
          body.title === undefined
            ? undefined
            : typeof body.title === "string" && body.title.trim()
            ? body.title.trim()
            : null;

        const notes =
          body.notes === undefined
            ? undefined
            : typeof body.notes === "string" && body.notes.trim()
            ? body.notes.trim()
            : null;

        const nextStatus =
          existing.status === "CANCELLED"
            ? "CANCELLED"
            : deriveStatus(amount, amountPaid, dueDate);

        const updateData: Prisma.BookingPaymentScheduleUpdateInput = {
          amount,
          amountPaid,
          dueDate,
          paidAt: amountPaid >= amount ? new Date() : null,
          status: nextStatus,
        };

        if (nextType !== undefined) {
          updateData.type = nextType;
        }

        if (title !== undefined) {
          updateData.title = title;
        }

        if (notes !== undefined) {
          updateData.notes = notes;
        }

        await tx.bookingPaymentSchedule.update({
          where: { id: scheduleId },
          data: updateData,
        });
      }

      await recomputeBookingPaymentSummary(tx, bookingId);
    });

    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/finance");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update installment.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: bookingId, scheduleId } = await context.params;

    await db.$transaction(async (tx) => {
      const existing = await tx.bookingPaymentSchedule.findUnique({
        where: { id: scheduleId },
        select: {
          bookingId: true,
        },
      });

      if (!existing || existing.bookingId !== bookingId) {
        throw new Error("Installment not found.");
      }

      await tx.bookingPaymentSchedule.delete({
        where: { id: scheduleId },
      });

      await recomputeBookingPaymentSummary(tx, bookingId);
    });

    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/finance");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete installment.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}