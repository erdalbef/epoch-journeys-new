import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, QuotePurpose } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type GeneratedQuoteItemType =
  | "SERVICE"
  | "ACCOMMODATION"
  | "TRANSPORT"
  | "GUIDE"
  | "ACTIVITY"
  | "FLIGHT"
  | "FEE"
  | "DISCOUNT"
  | "CUSTOM";

type QuoteItemInput = {
  title: string;
  description?: string | null;
  itemType: GeneratedQuoteItemType;
  optional: boolean;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  sortOrder: number;
};

type QuotePayload = {
  templateId?: string | null;
  purpose?: string;
  tourId?: string | null;
  departureDateId?: string | null;

  title?: string;
  recipientName?: string;
  recipientEmail?: string;

  internalNotes?: string;
  termsAndNotes?: string;

  currency?: string;

  agentId?: string | null;
  agentCompany?: string | null;
  commissionSource?: string | null;

  startDate?: string | null;
  endDate?: string | null;

  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;

  agentCommissionPercent?: number;
  epochMarkupPercent?: number;

  pricingMode?: string;

  paxPricingRows?: Prisma.JsonArray;
  hotels?: Prisma.JsonArray;
  entranceRows?: Prisma.JsonArray;
  tipRows?: Prisma.JsonArray;
  otherFixedRows?: Prisma.JsonArray;
  variableCostRows?: Prisma.JsonArray;
  tourManagerRows?: Prisma.JsonArray;
  guideRows?: Prisma.JsonArray;
  driverRows?: Prisma.JsonArray;

  clientDocumentTitle?: string;

  clientSinglePrice?: number;
  clientDoubleTwinPrice?: number;
  clientTriplePrice?: number;

  clientIncludes?: string;
  clientExcludes?: string;

  paymentPolicy?: string;
  cancellationPolicy?: string;

  clientOfferNotes?: string;

  validUntil?: string | null;

  items?: QuoteItemInput[];
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function generateQuoteNumber() {
  const now = new Date();

  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;

  return Number(`${month}${day}${random}`);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = (await req.json()) as QuotePayload;

    const currency = body.currency || "EUR";
    const items = Array.isArray(body.items) ? body.items : [];

    const totalAmount = items.reduce(
      (sum, item) => sum + toNumber(item.total),
      0
    );

    const quoteNumber = generateQuoteNumber();

    const quoteBuilderSummary: Prisma.JsonObject = {
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,

      totalPassengers: toNumber(body.totalPassengers),
      freePassengers: toNumber(body.freePassengers),
      payingPassengers: toNumber(body.payingPassengers),

      agentCommissionPercent: toNumber(body.agentCommissionPercent),
      epochMarkupPercent: toNumber(body.epochMarkupPercent),

      pricingMode: body.pricingMode || "CALCULATED",

      paxPricingRows: (body.paxPricingRows ?? []) as Prisma.JsonArray,
      hotels: (body.hotels ?? []) as Prisma.JsonArray,
      entranceRows: (body.entranceRows ?? []) as Prisma.JsonArray,
      tipRows: (body.tipRows ?? []) as Prisma.JsonArray,
      otherFixedRows: (body.otherFixedRows ?? []) as Prisma.JsonArray,
      variableCostRows: (body.variableCostRows ?? []) as Prisma.JsonArray,
      tourManagerRows: (body.tourManagerRows ?? []) as Prisma.JsonArray,
      guideRows: (body.guideRows ?? []) as Prisma.JsonArray,
      driverRows: (body.driverRows ?? []) as Prisma.JsonArray,
    };

    const quote = await db.quote.create({
      data: {
        quoteNumber,
        quoteReference: `Q-${quoteNumber}`,

        templateId: body.templateId ?? null,

        purpose:
          body.purpose === "TOUR_SETUP"
            ? QuotePurpose.TOUR_SETUP
            : QuotePurpose.CUSTOM_REQUEST,

        tourId: body.tourId || null,
        departureDateId: body.departureDateId || null,

        title: body.title || "Untitled Quote",

        recipientName: body.recipientName || null,
        recipientEmail: body.recipientEmail || null,

        internalNotes: body.internalNotes || null,
        termsAndNotes: body.termsAndNotes || null,

        currency,
        totalAmount,

        status: "DRAFT",

        quoteBuilderSummary,

        clientDocumentTitle: body.clientDocumentTitle || null,

        clientSinglePrice: toNumber(body.clientSinglePrice),
        clientDoubleTwinPrice: toNumber(body.clientDoubleTwinPrice),
        clientTriplePrice: toNumber(body.clientTriplePrice),

        clientIncludes: body.clientIncludes || null,
        clientExcludes: body.clientExcludes || null,

        paymentPolicy: body.paymentPolicy || null,
        cancellationPolicy: body.cancellationPolicy || null,

        clientOfferNotes: body.clientOfferNotes || null,

        validUntil: body.validUntil ? new Date(body.validUntil) : null,

        items: {
          create: items.map((item, index) => ({
            title: item.title,
            description: item.description || null,
            itemType: item.itemType,
            optional: item.optional,
            quantity: toNumber(item.quantity),
            unitPrice: toNumber(item.unitPrice),
            discountAmount: toNumber(item.discountAmount),
            taxAmount: toNumber(item.taxAmount),
            total: toNumber(item.total),
            currency,
            sortOrder: item.sortOrder ?? index,
          })),
        },
      },

      select: {
        id: true,
      },
    });

    return NextResponse.json({
      ok: true,
      quote,
    });
  } catch (error) {
    console.error("CREATE_QUOTE_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to create quote.",
      },
      { status: 500 }
    );
  }
}