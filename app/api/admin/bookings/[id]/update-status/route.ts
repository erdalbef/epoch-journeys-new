import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email/sendEmail";
import { bookingStatusUpdateTemplate } from "@/lib/email/templates/bookingStatusUpdate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    const body = await request.json();

    const status = body.status as BookingStatus | undefined;
    const paymentStatus = body.paymentStatus as PaymentStatus | undefined;

    if (!status && !paymentStatus) {
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

    const updatedBooking = await db.booking.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
    });

    const statusChanged = status && status !== existingBooking.status;
    const paymentChanged =
      paymentStatus && paymentStatus !== existingBooking.paymentStatus;

    if (
      existingBooking.agentEmailSnapshot &&
      (statusChanged || paymentChanged)
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