import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  Role,
  PaymentStatus,
  PaymentMethod,
  PaymentRecordStatus,
  BookingInstallmentStatus,
} from "@prisma/client";

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

function normalizePaymentMethod(method: string | null | undefined): PaymentMethod {
  if (!method) return PaymentMethod.OTHER;

  const normalized = method.trim().toUpperCase().replaceAll(" ", "_");

  switch (normalized) {
    case "BANK_TRANSFER":
      return PaymentMethod.BANK_TRANSFER;
    case "STRIPE":
      return PaymentMethod.STRIPE;
    case "PAYPAL":
      return PaymentMethod.PAYPAL;
    case "CASH":
      return PaymentMethod.CASH;
    default:
      return PaymentMethod.OTHER;
  }
}

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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ReviewBody;

    const { submissionId, bookingId, submissionAmount, action } = body;

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
            totalPrice: true,
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
    const paymentMethod = normalizePaymentMethod(submission.method);

    await db.$transaction(async (tx) => {
      await tx.paymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: "APPROVED",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });

      await tx.payment.create({
        data: {
          bookingId,
          amount: safeAmount,
          currency: submission.currency,
          method: paymentMethod,
          status: PaymentRecordStatus.RECEIVED,
          reference: submission.proofUrl || undefined,
          notes: submission.note || undefined,
          paidAt: new Date(),
          receivedBy: session.user.id,
        },
      });

      let remainingAmount = safeAmount;

      const schedules = await tx.bookingPaymentSchedule.findMany({
        where: { bookingId },
        orderBy: [
          { dueDate: "asc" },
          { createdAt: "asc" },
        ],
      });

      for (const schedule of schedules) {
        if (remainingAmount <= 0) break;

        if (schedule.status === BookingInstallmentStatus.CANCELLED) {
          continue;
        }

        const outstanding = Math.max(0, schedule.amount - schedule.amountPaid);

        if (outstanding <= 0) {
          continue;
        }

        const allocation = Math.min(remainingAmount, outstanding);
        const newScheduleAmountPaid = schedule.amountPaid + allocation;
        const newScheduleStatus = getInstallmentStatus(
          schedule.amount,
          newScheduleAmountPaid,
          schedule.dueDate
        );

        await tx.bookingPaymentSchedule.update({
          where: { id: schedule.id },
          data: {
            amountPaid: newScheduleAmountPaid,
            status: newScheduleStatus,
            paidAt:
              newScheduleStatus === BookingInstallmentStatus.PAID
                ? new Date()
                : schedule.paidAt,
          },
        });

        remainingAmount -= allocation;
      }

      const updatedSchedules = await tx.bookingPaymentSchedule.findMany({
        where: {
          bookingId,
          status: {
            not: BookingInstallmentStatus.CANCELLED,
          },
        },
      });

      const totalScheduledAmount = updatedSchedules.reduce(
        (sum, schedule) => sum + schedule.amount,
        0
      );

      const totalPaidFromSchedules = updatedSchedules.reduce(
        (sum, schedule) => sum + schedule.amountPaid,
        0
      );

      const fallbackTotal = submission.booking.totalPrice;
      const effectiveTotal =
        totalScheduledAmount > 0 ? totalScheduledAmount : fallbackTotal;

      const newAmountPaid = totalPaidFromSchedules;
      const newAmountDue = Math.max(effectiveTotal - totalPaidFromSchedules, 0);

      let newPaymentStatus: PaymentStatus = PaymentStatus.PARTIALLY_PAID;

      if (newAmountPaid <= 0) {
        newPaymentStatus = PaymentStatus.UNPAID;
      } else if (newAmountDue === 0) {
        newPaymentStatus = PaymentStatus.PAID;
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          paymentStatus: newPaymentStatus,
        },
      });
    });

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