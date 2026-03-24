import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  PaymentMethod,
  PaymentRecordStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { recalculateBookingPayment } from "@/lib/payments/recalculateBookingPayment";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isValidPaymentMethod(value: string): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}

function isValidPaymentRecordStatus(
  value: string
): value is PaymentRecordStatus {
  return Object.values(PaymentRecordStatus).includes(
    value as PaymentRecordStatus
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await context.params;

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      amount?: number;
      currency?: string;
      method?: string;
      status?: string;
      reference?: string;
      notes?: string;
      paidAt?: string | null;
    };

    const amount =
      typeof body.amount === "number" ? body.amount : Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0." },
        { status: 400 }
      );
    }

    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "EUR";

    if (!body.method || !isValidPaymentMethod(body.method)) {
      return NextResponse.json(
        { error: "Invalid payment method." },
        { status: 400 }
      );
    }

    const paymentStatus =
      body.status && isValidPaymentRecordStatus(body.status)
        ? body.status
        : PaymentRecordStatus.RECEIVED;

    const paidAt =
      typeof body.paidAt === "string" && body.paidAt.trim()
        ? new Date(body.paidAt)
        : null;

    if (paidAt && Number.isNaN(paidAt.getTime())) {
      return NextResponse.json(
        { error: "Invalid paid date." },
        { status: 400 }
      );
    }

    const payment = await db.payment.create({
      data: {
        bookingId,
        amount,
        currency,
        method: body.method,
        status: paymentStatus,
        reference:
          typeof body.reference === "string" && body.reference.trim()
            ? body.reference.trim()
            : null,
        notes:
          typeof body.notes === "string" && body.notes.trim()
            ? body.notes.trim()
            : null,
        paidAt,
        receivedBy:
          session.user.name || session.user.email || "Admin",
      },
    });

    const summary = await recalculateBookingPayment(bookingId);

    return NextResponse.json(
      {
        success: true,
        payment,
        bookingSummary: summary,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/bookings/[id]/payments error:", error);

    return NextResponse.json(
      { error: "Failed to create payment." },
      { status: 500 }
    );
  }
}