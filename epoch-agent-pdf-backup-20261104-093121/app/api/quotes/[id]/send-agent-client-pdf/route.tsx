import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { checkQuoteApprovalReadiness } from "@/lib/quotes/approvalReadiness";
import { readPrivateAgentQuotePdf } from "@/lib/storage/agentQuotePdfStorage";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
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

    const { id } = await context.params;

    const quote = await db.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    const readiness = checkQuoteApprovalReadiness({
      quoteBuilderSummary: quote.quoteBuilderSummary,
      recipientEmail: quote.recipientEmail,
    });
    if (!readiness.ready) {
      return NextResponse.json({
        ok: false,
        error: `Sending blocked: ${readiness.errors.join(" | ")}`,
        issues: readiness.errors,
        warnings: readiness.warnings,
      }, { status: 400 });
    }

    if (!quote.recipientEmail) {
      return NextResponse.json(
        { ok: false, error: "Recipient email is missing." },
        { status: 400 }
      );
    }

    if (!quote.agentClientPdfUrl) {
      return NextResponse.json(
        { ok: false, error: "Agent PDF not generated." },
        { status: 400 }
      );
    }

    // Load the saved PRIVATE snapshot; do not fetch a public URL or
    // regenerate the proposal after it has been approved.
    const pdfBytes = await readPrivateAgentQuotePdf(quote.agentClientPdfUrl, id);
    if (!pdfBytes) {
      return NextResponse.json(
        { ok: false, error: "Saved agent PDF cannot be loaded. Regenerate it before sending." },
        { status: 404 },
      );
    }
    const pdfBase64 = pdfBytes.toString("base64");

    const result = await resend.emails.send({
      from: fromEmail,
      to: quote.recipientEmail,
      subject: `Travel Proposal - ${
        quote.quoteReference || quote.quoteNumber || "Quote"
      }`,
      html: `
        <p>Dear ${quote.recipientName || "Guest"},</p>
        <p>Please find attached your travel proposal.</p>
        <p>Kind regards,</p>
        <p>Epoch Journeys</p>
      `,
      attachments: [
        {
          filename: `proposal-${quote.quoteNumber || quote.id}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (result.error) {
      console.error("RESEND_SEND_ERROR:", result.error);

      return NextResponse.json(
        {
          ok: false,
          error: result.error.message || "Resend failed to send email.",
        },
        { status: 500 }
      );
    }

    console.log("RESEND_SEND_SUCCESS:", result.data);

    return NextResponse.json({
      ok: true,
      resendId: result.data?.id,
    });
  } catch (err) {
    console.error("SEND AGENT PDF ERROR:", err);

    return NextResponse.json(
      { ok: false, error: "Failed to send email." },
      { status: 500 }
    );
  }
}