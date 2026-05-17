import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, QuoteStatus } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const existing = await db.quote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    const duplicated = await db.quote.create({
      data: {
        title: existing.title ? `${existing.title} (Copy)` : null,
        recipientName: existing.recipientName,
        recipientEmail: existing.recipientEmail,
        internalNotes: existing.internalNotes,
        termsAndNotes: existing.termsAndNotes,
        currency: existing.currency,
        purpose: existing.purpose,
        status: QuoteStatus.DRAFT,

        tourId: existing.tourId,
        departureDateId: existing.departureDateId,

        totalAmount: existing.totalAmount,

        quoteBuilderSummary:
          existing.quoteBuilderSummary === null
            ? Prisma.JsonNull
            : (existing.quoteBuilderSummary as Prisma.InputJsonValue),

        clientDocumentTitle: existing.clientDocumentTitle,
        clientSinglePrice: existing.clientSinglePrice,
        clientDoubleTwinPrice: existing.clientDoubleTwinPrice,
        clientTriplePrice: existing.clientTriplePrice,
        clientIncludes: existing.clientIncludes,
        clientExcludes: existing.clientExcludes,
        paymentPolicy: existing.paymentPolicy,
        cancellationPolicy: existing.cancellationPolicy,
        clientOfferNotes: existing.clientOfferNotes,
        validUntil: existing.validUntil,

        pdfUrl: null,
        pdfGeneratedAt: null,
        clientPdfUrl: null,
        clientPdfGeneratedAt: null,
        agentClientPdfUrl: null,
        agentClientPdfGeneratedAt: null,
        sentAt: null,
        finalizedAt: null,

        items: {
          create: existing.items.map((item) => ({
            title: item.title,
            description: item.description,
            itemType: item.itemType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            taxAmount: item.taxAmount,
            total: item.total,
            optional: item.optional,
            sortOrder: item.sortOrder,
            currency: item.currency,
            meta:
              item.meta === null
                ? Prisma.JsonNull
                : (item.meta as Prisma.InputJsonValue),
          })),
        },
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      ok: true,
      quote: duplicated,
    });
  } catch (error) {
    console.error("POST /api/quotes/[id]/duplicate failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to duplicate quote." },
      { status: 500 }
    );
  }
}