import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PaxPricingRow = {
  paxCount: number;
  singlePrice: number;
  doubleTwinPrice: number;
  triplePrice: number;
};

type EntranceRow = {
  siteName: string;
  amountPerPerson: number;
};

type TipRow = {
  tipType: string;
  amountPerPerson: number;
};

type OtherFixedRow = {
  label: string;
  amountPerPerson: number;
};

type QuoteBuilderSummary = {
  startDate?: string | null;
  endDate?: string | null;
  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;
  paxPricingRows?: PaxPricingRow[];
  entranceRows?: EntranceRow[];
  tipRows?: TipRow[];
  otherFixedRows?: OtherFixedRow[];
};

function isQuoteBuilderSummary(
  value: unknown
): value is QuoteBuilderSummary {
  return typeof value === "object" && value !== null;
}

export async function GET(
  _request: Request,
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

    const quote = await db.quote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    const summary = isQuoteBuilderSummary(quote.quoteBuilderSummary)
      ? quote.quoteBuilderSummary
      : null;

    return NextResponse.json({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      quoteReference: quote.quoteReference,
      title: quote.title,
      recipientName: quote.recipientName,
      recipientEmail: quote.recipientEmail,
      status: quote.status,
      currency: quote.currency,
      totalAmount: quote.totalAmount,
      clientDocumentTitle: quote.clientDocumentTitle,
      clientIncludes: quote.clientIncludes,
      clientExcludes: quote.clientExcludes,
      paymentPolicy: quote.paymentPolicy,
      cancellationPolicy: quote.cancellationPolicy,
      clientOfferNotes: quote.clientOfferNotes,
      clientPdfUrl: quote.clientPdfUrl,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,

      paxPricingRows: summary?.paxPricingRows ?? [],
      entranceRows: summary?.entranceRows ?? [],
      tipRows: summary?.tipRows ?? [],
      otherFixedRows: summary?.otherFixedRows ?? [],

      items: quote.items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        itemType: item.itemType,
        optional: item.optional,
        sortOrder: item.sortOrder,
      })),
    });
  } catch (error) {
    console.error("GET_ADMIN_QUOTE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to load quote" },
      { status: 500 }
    );
  }
}