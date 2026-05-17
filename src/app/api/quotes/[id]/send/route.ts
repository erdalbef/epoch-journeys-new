import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { QuoteActivityAction, QuoteStatus } from "@prisma/client";
import { Resend } from "resend";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);

type SessionUserLike = {
  id?: string;
  role?: string;
  email?: string | null;
  name?: string | null;
};

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
}

function formatMoney(amount: number | null | undefined, currency = "EUR") {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function splitBulletLines(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

function buildQuoteEmailHtml(params: {
  recipientName: string;
  documentTitle: string;
  quoteNumber: number;
  validUntil: string;
  singlePrice: string;
  doubleTwinPrice: string;
  triplePrice: string;
  includes: string[];
  excludes: string[];
  paymentPolicy: string;
  cancellationPolicy: string;
  notes: string;
  pdfUrl: string;
}) {
  const {
    recipientName,
    documentTitle,
    quoteNumber,
    validUntil,
    singlePrice,
    doubleTwinPrice,
    triplePrice,
    includes,
    excludes,
    paymentPolicy,
    cancellationPolicy,
    notes,
    pdfUrl,
  } = params;

  const includesHtml =
    includes.length > 0
      ? `<ul style="margin:8px 0 0 18px; padding:0;">${includes
          .map((item) => `<li style="margin:4px 0;">${item}</li>`)
          .join("")}</ul>`
      : `<p style="margin:8px 0 0 0;">-</p>`;

  const excludesHtml =
    excludes.length > 0
      ? `<ul style="margin:8px 0 0 18px; padding:0;">${excludes
          .map((item) => `<li style="margin:4px 0;">${item}</li>`)
          .join("")}</ul>`
      : `<p style="margin:8px 0 0 0;">-</p>`;

  const hasAnyPrice =
    singlePrice !== "-" || doubleTwinPrice !== "-" || triplePrice !== "-";

  const pricingHtml = hasAnyPrice
    ? `
      <table style="width:100%; border-collapse:collapse; margin-top:10px;">
        <thead>
          <tr>
            <th style="text-align:left; border:1px solid #CBD5E1; padding:8px; background:#F1F5F9;">Room Type</th>
            <th style="text-align:left; border:1px solid #CBD5E1; padding:8px; background:#F1F5F9;">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #CBD5E1; padding:8px;">Single</td>
            <td style="border:1px solid #CBD5E1; padding:8px;">${singlePrice}</td>
          </tr>
          <tr>
            <td style="border:1px solid #CBD5E1; padding:8px;">Double / Twin</td>
            <td style="border:1px solid #CBD5E1; padding:8px;">${doubleTwinPrice}</td>
          </tr>
          <tr>
            <td style="border:1px solid #CBD5E1; padding:8px;">Triple</td>
            <td style="border:1px solid #CBD5E1; padding:8px;">${triplePrice}</td>
          </tr>
        </tbody>
      </table>
    `
    : `<p style="margin:8px 0 0 0;">Pricing is shown in the attached PDF offer.</p>`;

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; max-width:700px; margin:0 auto;">
      <div style="height:6px; background:#8B0000; border-radius:4px; margin-bottom:20px;"></div>

      <div style="display:flex; justify-content:space-between; gap:24px; margin-bottom:20px;">
        <div>
          <h1 style="margin:0 0 6px 0; font-size:24px; color:#0F172A;">Epoch Journeys OOD</h1>
          <p style="margin:0; font-size:14px; color:#475569;">Professional Tour Offer</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0; font-size:12px; color:#64748B;">Quote #${quoteNumber}</p>
          <p style="margin:6px 0 0 0; font-size:12px; color:#64748B;">Valid Until: ${validUntil}</p>
        </div>
      </div>

      <p style="margin:0 0 14px 0; line-height:1.7;">Dear ${recipientName},</p>

      <p style="margin:0 0 14px 0; line-height:1.7;">
        Please find below our offer for <strong>${documentTitle}</strong>.
      </p>

      <div style="border:1px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:18px; background:#FAFAFA;">
        <h2 style="margin:0 0 8px 0; font-size:16px; color:#0F172A;">Selling Prices</h2>
        ${pricingHtml}
      </div>

      <div style="border:1px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:18px;">
        <h2 style="margin:0 0 8px 0; font-size:16px; color:#0F172A;">Included Services</h2>
        ${includesHtml}
      </div>

      <div style="border:1px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:18px;">
        <h2 style="margin:0 0 8px 0; font-size:16px; color:#0F172A;">Not Included</h2>
        ${excludesHtml}
      </div>

      <div style="border:1px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:18px;">
        <h2 style="margin:0 0 8px 0; font-size:16px; color:#0F172A;">Payment Policy</h2>
        <p style="margin:0; line-height:1.7;">${paymentPolicy}</p>
      </div>

      <div style="border:1px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:18px;">
        <h2 style="margin:0 0 8px 0; font-size:16px; color:#0F172A;">Cancellation Policy</h2>
        <p style="margin:0; line-height:1.7;">${cancellationPolicy}</p>
      </div>

      ${
        notes.trim()
          ? `
      <div style="border:1px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:18px;">
        <h2 style="margin:0 0 8px 0; font-size:16px; color:#0F172A;">Additional Notes</h2>
        <p style="margin:0; line-height:1.7;">${notes}</p>
      </div>
      `
          : ""
      }

      <div style="background:#F8FAFC; border:1px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:18px;">
        <p style="margin:0 0 10px 0; line-height:1.6;">
          You can also open the PDF offer here:
        </p>
        <p style="margin:0;">
          <a href="${pdfUrl}" style="color:#8B0000; font-weight:700; text-decoration:none;">
            Open Tour Offer PDF
          </a>
        </p>
      </div>

      <p style="margin:18px 0 0 0; line-height:1.6;">
        Best regards,<br />
        <strong>Epoch Journeys OOD</strong>
      </p>
    </div>
  `;
}

export async function POST(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = (session?.user ?? null) as SessionUserLike | null;

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = context.params;

    const quote = await db.quote.findUnique({
      where: { id },
      include: {
        sentBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    if (!quote.recipientEmail?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Recipient email is missing." },
        { status: 400 }
      );
    }

    if (!quote.clientPdfUrl?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Generate the client PDF before sending." },
        { status: 400 }
      );
    }

    if (!quote.clientDocumentTitle?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Client document title is missing." },
        { status: 400 }
      );
    }

    if (!quote.recipientName?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Recipient name is missing." },
        { status: 400 }
      );
    }

    if (
      quote.clientSinglePrice == null &&
      quote.clientDoubleTwinPrice == null &&
      quote.clientTriplePrice == null
    ) {
      return NextResponse.json(
        { ok: false, error: "At least one client selling price is required." },
        { status: 400 }
      );
    }

    if (!quote.clientIncludes?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Included services are missing." },
        { status: 400 }
      );
    }

    if (!quote.clientExcludes?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Not included section is missing." },
        { status: 400 }
      );
    }

    if (!quote.paymentPolicy?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Payment policy is missing." },
        { status: 400 }
      );
    }

    if (!quote.cancellationPolicy?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Cancellation policy is missing." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const pdfUrl = `${baseUrl}${quote.clientPdfUrl}`;

    const subject = `${quote.clientDocumentTitle} - Quote #${quote.quoteNumber}`;

    const html = buildQuoteEmailHtml({
      recipientName: quote.recipientName,
      documentTitle: quote.clientDocumentTitle,
      quoteNumber: quote.quoteNumber,
      validUntil: formatDate(quote.validUntil),
      singlePrice: formatMoney(quote.clientSinglePrice, quote.currency),
      doubleTwinPrice: formatMoney(
        quote.clientDoubleTwinPrice,
        quote.currency
      ),
      triplePrice: formatMoney(quote.clientTriplePrice, quote.currency),
      includes: splitBulletLines(quote.clientIncludes),
      excludes: splitBulletLines(quote.clientExcludes),
      paymentPolicy: quote.paymentPolicy || "-",
      cancellationPolicy: quote.cancellationPolicy || "-",
      notes: quote.clientOfferNotes || "",
      pdfUrl,
    });

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "quotes@epochjourneys.com";

    const sendResult = await resend.emails.send({
      from: fromEmail,
      to: quote.recipientEmail.trim(),
      subject,
      html,
    });

    if ("error" in sendResult && sendResult.error) {
      return NextResponse.json(
        { ok: false, error: "Email provider failed to send the quote." },
        { status: 500 }
      );
    }

    await db.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.SENT,
        sentAt: new Date(),
        sentById: user.id ?? null,
      },
    });

    if (user.id) {
      await db.quoteActivity.create({
        data: {
          quoteId: quote.id,
          actorId: user.id,
          action: QuoteActivityAction.SENT,
          fromStatus: quote.status,
          toStatus: QuoteStatus.SENT,
          message: `Quote sent to ${quote.recipientEmail}`,
          meta: {
            recipientEmail: quote.recipientEmail,
            clientPdfUrl: quote.clientPdfUrl,
          },
        },
      });
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("POST /api/quotes/[id]/send failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to send quote email." },
      { status: 500 }
    );
  }
}