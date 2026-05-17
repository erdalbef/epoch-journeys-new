import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingStatus,
  PaymentStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { bookingStatusUpdateTemplate } from "@/lib/email/templates/bookingStatusUpdate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateBookingBody = {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateBookingBody;

    const status = body.status;
    const paymentStatus = body.paymentStatus;
    const amountPaidInput =
      body.amountPaid === undefined ? undefined : toNumber(body.amountPaid);

    if (
      status === undefined &&
      paymentStatus === undefined &&
      amountPaidInput === undefined
    ) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const existingBooking = await db.booking.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalPrice: true,
        amountPaid: true,
        amountDue: true,
        bookingReference: true,
        bookingDisplayCode: true,
        tourTitleSnapshot: true,
        departureDateSnapshot: true,
        agentNameSnapshot: true,
        agentEmailSnapshot: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const totalPrice = existingBooking.totalPrice ?? 0;
    const nextAmountPaid =
      amountPaidInput === undefined
        ? existingBooking.amountPaid
        : Math.max(0, amountPaidInput);

    const nextAmountDue = Math.max(0, totalPrice - nextAmountPaid);

    let derivedPaymentStatus = existingBooking.paymentStatus;

    if (paymentStatus !== undefined) {
      derivedPaymentStatus = paymentStatus;
    } else if (nextAmountPaid <= 0) {
      derivedPaymentStatus = PaymentStatus.UNPAID;
    } else if (nextAmountPaid >= totalPrice && totalPrice > 0) {
      derivedPaymentStatus = PaymentStatus.PAID;
    } else if (nextAmountPaid > 0 && nextAmountPaid < totalPrice) {
      derivedPaymentStatus = PaymentStatus.PARTIALLY_PAID;
    }

    const updatedBooking = await db.booking.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        paymentStatus: derivedPaymentStatus,
        ...(amountPaidInput !== undefined
          ? {
              amountPaid: nextAmountPaid,
              amountDue: nextAmountDue,
            }
          : {}),
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        amountPaid: true,
        amountDue: true,
        totalPrice: true,
        bookingReference: true,
        bookingDisplayCode: true,
      },
    });

    const statusChanged =
      status !== undefined && status !== existingBooking.status;

    const paymentChanged =
      derivedPaymentStatus !== existingBooking.paymentStatus;

    const amountPaidChanged =
      amountPaidInput !== undefined &&
      nextAmountPaid !== existingBooking.amountPaid;

    if (
      existingBooking.agentEmailSnapshot &&
      (statusChanged || paymentChanged || amountPaidChanged)
    ) {
      const emailContent = bookingStatusUpdateTemplate({
        agentName: existingBooking.agentNameSnapshot,
        bookingReference:
          existingBooking.bookingDisplayCode ||
          existingBooking.bookingReference,
        bookingStatus: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
        tourTitle: existingBooking.tourTitleSnapshot,
        departureDate: existingBooking.departureDateSnapshot,
      });

      await sendEmail({
        to: existingBooking.agentEmailSnapshot,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("UPDATE_BOOKING_STATUS_ERROR", error);

    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}