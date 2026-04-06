import React from "react";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role, PaymentSubmissionStatus } from "@prisma/client";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import PaymentReceiptPdf from "@/components/admin/payments/PaymentReceiptPdf";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    submissionId: string;
  };
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { submissionId } = context.params;

    if (!submissionId) {
      return NextResponse.json(
        { error: "Missing submission id." },
        { status: 400 }
      );
    }

    const submission = await db.paymentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        booking: {
          select: {
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Payment submission not found." },
        { status: 404 }
      );
    }

    if (submission.status !== PaymentSubmissionStatus.APPROVED) {
      return NextResponse.json(
        { error: "Receipt is only available for approved payments." },
        { status: 400 }
      );
    }

    const bookingReference =
      submission.booking.bookingDisplayCode ||
      submission.booking.bookingReference;

    const pdfElement = React.createElement(PaymentReceiptPdf, {
      bookingReference,
      agentName: submission.user.fullName || "-",
      agentEmail: submission.user.email,
      amount: submission.amount,
      currency: submission.currency,
      method: submission.method,
      reviewedAt: formatDate(submission.reviewedAt),
    }) as unknown as React.ReactElement<DocumentProps>;

    const pdfBuffer = await renderToBuffer(pdfElement);
    const pdfBytes = new Uint8Array(pdfBuffer);

    const safeRef = bookingReference.replace(/[^a-zA-Z0-9-_]/g, "_");

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="payment-receipt-${safeRef}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Payment receipt PDF error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown PDF generation error";

    return NextResponse.json(
      {
        error: "Failed to generate payment receipt PDF.",
        details: message,
      },
      { status: 500 }
    );
  }
}