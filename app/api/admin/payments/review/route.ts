import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role, PaymentStatus } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  agentPaymentApprovedTemplate,
  agentPaymentRejectedTemplate,
} from "@/lib/email/templates/paymentEmails";

type ReviewAction = "approve" | "reject";

type ReviewBody = {
  submissionId?: string;
  bookingId?: string;
  bookingAmountPaid?: number;
  bookingAmountDue?: number;
  submissionAmount?: number;
  action?: ReviewAction;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ReviewBody;

    const {
      submissionId,
      bookingId,
      submissionAmount,
      action,
    } = body;

    if (!submissionId || !bookingId || !submissionAmount || !action) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (submissionAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid submission amount." },
        { status: 400 }
      );
    }

    const submission = await db.paymentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
            amountPaid: true,
            amountDue: true,
            currency: true,
            paymentStatus: true,
          },
        },
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!submission || submission.booking.id !== bookingId) {
      return NextResponse.json(
        { error: "Payment submission not found." },
        { status: 404 }
      );
    }

    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "This payment submission has already been reviewed." },
        { status: 400 }
      );
    }

    const bookingReference =
      submission.booking.bookingDisplayCode ||
      submission.booking.bookingReference;

    if (action === "reject") {
      await db.paymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: "REJECTED",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });

      if (submission.user.email) {
        await sendEmail({
          to: submission.user.email,
          subject: `Payment Rejected - ${bookingReference}`,
          html: agentPaymentRejectedTemplate({
            bookingReference,
            amount: submissionAmount,
            currency: submission.currency,
          }),
        });
      }

      return NextResponse.json({ success: true });
    }

    const safeAmount = Math.min(submissionAmount, submission.booking.amountDue);

    const newAmountPaid = submission.booking.amountPaid + safeAmount;
    const newAmountDue = Math.max(submission.booking.amountDue - safeAmount, 0);

    let newPaymentStatus: PaymentStatus = PaymentStatus.PARTIALLY_PAID;

    if (newAmountDue === 0) {
      newPaymentStatus = PaymentStatus.PAID;
    } else if (newAmountPaid === 0) {
      newPaymentStatus = PaymentStatus.UNPAID;
    }

    await db.$transaction([
      db.paymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: "APPROVED",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      }),
      db.booking.update({
        where: { id: bookingId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          paymentStatus: newPaymentStatus,
        },
      }),
    ]);

    if (submission.user.email) {
      await sendEmail({
        to: submission.user.email,
        subject: `Payment Approved - ${bookingReference}`,
        html: agentPaymentApprovedTemplate({
          bookingReference,
          amount: safeAmount,
          currency: submission.currency,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin payment review error:", error);

    return NextResponse.json(
      { error: "Failed to review payment submission." },
      { status: 500 }
    );
  }
}