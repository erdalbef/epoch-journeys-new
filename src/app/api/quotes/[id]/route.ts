import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, QuotePurpose } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function buildQuoteBuilderSummary(body: QuotePayload): Prisma.JsonObject {
  return {
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
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return false;
  }

  return true;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const quote = await db.quote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      quote,
    });
  } catch (error) {
    console.error("GET_QUOTE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load quote." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = (await req.json()) as QuotePayload;

    const existing = await db.quote.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { ok: false, error: "Only draft quotes can be edited." },
        { status: 400 }
      );
    }

    const currency = body.currency || "EUR";
    const items = Array.isArray(body.items) ? body.items : [];

    const totalAmount = items.reduce(
      (sum, item) => sum + toNumber(item.total),
      0
    );

    const quoteBuilderSummary = buildQuoteBuilderSummary(body);

    const quote = await db.quote.update({
      where: { id },
      data: {
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
          deleteMany: {},
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
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      quote,
    });
  } catch (error) {
    console.error("UPDATE_QUOTE_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update quote.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const existing = await db.quote.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { ok: false, error: "Only draft quotes can be deleted." },
        { status: 400 }
      );
    }

    await db.quote.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_QUOTE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Delete failed." },
      { status: 500 }
    );
  }
}