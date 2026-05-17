import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { QuoteActivityAction, QuoteStatus } from "@prisma/client";
import { Resend } from "resend";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

function toAbsoluteUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${APP_URL}${path}`;
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY is missing." },
        { status: 500 }
      );
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "Epoch Journeys Quotes <quotes@epochjourneys.com>";

    const actorId = session.user.id;
    const { id } = await context.params;

    const quote = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        quoteNumber: true,
        quoteReference: true,
        recipientName: true,
        recipientEmail: true,
        clientPdfUrl: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    if (!quote.recipientEmail) {
      return NextResponse.json(
        { ok: false, error: "Recipient email is missing." },
        { status: 400 }
      );
    }

    if (!quote.clientPdfUrl) {
      return NextResponse.json(
        { ok: false, error: "Client PDF not generated." },
        { status: 400 }
      );
    }

    const absoluteUrl = toAbsoluteUrl(quote.clientPdfUrl);

    if (!absoluteUrl) {
      return NextResponse.json(
        { ok: false, error: "Client PDF URL is invalid." },
        { status: 400 }
      );
    }

    const pdfResponse = await fetch(absoluteUrl);

    if (!pdfResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Could not load client PDF. Status: ${pdfResponse.status}`,
          pdfUrl: absoluteUrl,
        },
        { status: 500 }
      );
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfArrayBuffer).toString("base64");

    const result = await resend.emails.send({
      from: fromEmail,
      to: quote.recipientEmail,
      subject: `Travel Proposal - ${
        quote.quoteReference || quote.quoteNumber || "Quote"
      }`,
      html: `
        <p>Dear ${quote.recipientName || "Guest"},</p>
        <p>Please find attached your travel proposal.</p>
        <p>Kind regards,<br/>Epoch Journeys</p>
      `,
      attachments: [
        {
          filename: `proposal-${quote.quoteNumber || quote.id}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (result.error) {
      console.error("RESEND_CLIENT_PDF_ERROR:", result.error);

      return NextResponse.json(
        {
          ok: false,
          error: result.error.message || "Resend failed to send email.",
        },
        { status: 500 }
      );
    }

    const now = new Date();
    const nextStatus =
      quote.status === QuoteStatus.DRAFT ? QuoteStatus.SENT : quote.status;

    await db.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: nextStatus,
          sentAt: now,
        },
      });

      await tx.quoteActivity.create({
        data: {
          quoteId: quote.id,
          actorId,
          action: QuoteActivityAction.EMAIL_SENT,
          fromStatus: quote.status,
          toStatus: nextStatus,
          message: `Client PDF emailed to ${quote.recipientEmail}. Resend ID: ${result.data?.id}`,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Client PDF email sent successfully.",
      resendId: result.data?.id,
    });
  } catch (err) {
    console.error("SEND_CLIENT_PDF_ERROR:", err);

    return NextResponse.json(
      { ok: false, error: "Failed to send email." },
      { status: 500 }
    );
  }
}